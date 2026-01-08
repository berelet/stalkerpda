import json
import uuid
from datetime import datetime
from src.database import get_db
from src.middleware.auth import require_auth
from src.utils.geo import haversine_distance, point_in_circle
from src.config import config

# Global cache for active artifacts (Lambda container reuse)
_artifacts_cache = {
    'data': None,
    'version': None,
    'ttl': 900  # 15 minutes
}

def get_active_artifacts(cursor):
    """Get active artifacts with version-based cache"""
    # Get current cache version from DB
    cursor.execute("SELECT version FROM cache_versions WHERE cache_key = 'artifacts'")
    result = cursor.fetchone()
    current_version = result['version'] if result else 0
    
    # Check if cache is valid
    if (_artifacts_cache['data'] is not None and 
        _artifacts_cache['version'] == current_version):
        return _artifacts_cache['data']
    
    # Query database
    cursor.execute("""
        SELECT a.id, a.type_id, at.name, at.description, at.rarity, at.base_value,
               at.bonus_lives, at.radiation_resist, at.other_effects, at.image_url,
               a.latitude, a.longitude, a.state, a.spawned_at, a.expires_at
        FROM artifacts a
        JOIN artifact_types at ON a.type_id = at.id
        WHERE a.state IN ('hidden', 'visible')
          AND a.owner_id IS NULL
          AND a.spawned_at <= NOW()
          AND (a.expires_at IS NULL OR a.expires_at > NOW())
    """)
    
    artifacts = cursor.fetchall()
    
    # Update cache
    _artifacts_cache['data'] = artifacts
    _artifacts_cache['version'] = current_version
    
    return artifacts

@require_auth
def update_handler(event, context):
    """POST /api/location - Update player location"""
    try:
        player_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        
        # Simple validation
        latitude = body.get('latitude')
        longitude = body.get('longitude')
        accuracy = body.get('accuracy')
        
        if not latitude or not longitude:
            return {
                'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'Latitude and longitude required'}})
            }
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Update or insert location
                cursor.execute(
                    """INSERT INTO player_locations (player_id, latitude, longitude, accuracy)
                    VALUES (%s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE 
                    latitude = VALUES(latitude),
                    longitude = VALUES(longitude),
                    accuracy = VALUES(accuracy),
                    updated_at = CURRENT_TIMESTAMP""",
                    (player_id, latitude, longitude, accuracy)
                )
                
                # Add to history
                cursor.execute(
                    """INSERT INTO location_history (player_id, latitude, longitude, accuracy)
                    VALUES (%s, %s, %s, %s)""",
                    (player_id, latitude, longitude, accuracy)
                )
                
                # Check radiation zones
                cursor.execute(
                    """SELECT id, name, center_lat, center_lng, radius, radiation_level
                    FROM radiation_zones WHERE active = TRUE"""
                )
                radiation_zones = cursor.fetchall()
                
                current_radiation_zones = []
                for zone in radiation_zones:
                    if point_in_circle(
                        latitude, longitude,
                        float(zone['center_lat']), float(zone['center_lng']),
                        zone['radius']
                    ):
                        current_radiation_zones.append({
                            'id': zone['id'],
                            'name': zone['name'],
                            'radiationLevel': zone['radiation_level']
                        })
                
                # Check control points
                cursor.execute(
                    """SELECT id, name, latitude, longitude, capture_radius,
                    controlled_by_faction, controlled_by_player
                    FROM control_points WHERE active = TRUE"""
                )
                control_points = cursor.fetchall()
                
                nearby_control_points = []
                for cp in control_points:
                    distance = haversine_distance(
                        latitude, longitude,
                        float(cp['latitude']), float(cp['longitude'])
                    )
                    if distance <= 50:  # Show if within 50m
                        nearby_control_points.append({
                            'id': cp['id'],
                            'name': cp['name'],
                            'controlledBy': cp['controlled_by_faction'],
                            'distance': round(distance, 1)
                        })
                
                # Find nearby artifacts (within detection radius)
                artifacts = get_active_artifacts(cursor)
                
                nearby_artifacts = []
                for art in artifacts:
                    distance = haversine_distance(
                        latitude, longitude,
                        float(art['latitude']), float(art['longitude'])
                    )
                    if distance <= config.ARTIFACT_DETECTION_RADIUS:
                        # Build effects object
                        effects = {}
                        if art['bonus_lives']:
                            effects['bonusLives'] = art['bonus_lives']
                        if art['radiation_resist']:
                            effects['radiationResist'] = art['radiation_resist']
                        if art['other_effects']:
                            effects['other'] = art['other_effects']
                        
                        nearby_artifacts.append({
                            'id': art['id'],
                            'typeId': art['type_id'],
                            'name': art['name'],
                            'description': art['description'] or '',
                            'rarity': art['rarity'],
                            'value': int(art['base_value']),
                            'imageUrl': art['image_url'] or '',
                            'effects': effects,
                            'latitude': float(art['latitude']),
                            'longitude': float(art['longitude']),
                            'distance': round(distance, 1),
                            'canPickup': distance <= 2.0
                        })
                        
                        # Update artifact state to visible
                        if art['state'] == 'hidden':
                            cursor.execute(
                                "UPDATE artifacts SET state = 'visible' WHERE id = %s",
                                (art['id'],)
                            )
        
        response = {
            'success': True,
            'currentZones': {
                'radiationZones': current_radiation_zones,
                'controlPoints': nearby_control_points
            },
            'nearbyArtifacts': nearby_artifacts
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps(response)
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }
