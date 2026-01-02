import json
import uuid
from datetime import datetime
from src.database import get_db
from src.middleware.auth import require_auth
from src.models.schemas import LocationUpdate
from src.utils.geo import haversine_distance, point_in_circle
from src.config import config

@require_auth
def update_handler(event, context):
    """POST /api/location - Update player location"""
    try:
        player_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        request = LocationUpdate(**body)
        
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
                    (player_id, request.latitude, request.longitude, request.accuracy)
                )
                
                # Add to history
                cursor.execute(
                    """INSERT INTO location_history (player_id, latitude, longitude, accuracy)
                    VALUES (%s, %s, %s, %s)""",
                    (player_id, request.latitude, request.longitude, request.accuracy)
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
                        request.latitude, request.longitude,
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
                        request.latitude, request.longitude,
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
                cursor.execute(
                    """SELECT a.id, at.name, a.latitude, a.longitude
                    FROM artifacts a
                    JOIN artifact_types at ON a.type_id = at.id
                    WHERE a.state IN ('hidden', 'visible') AND a.owner_id IS NULL"""
                )
                artifacts = cursor.fetchall()
                
                nearby_artifacts = []
                for art in artifacts:
                    distance = haversine_distance(
                        request.latitude, request.longitude,
                        float(art['latitude']), float(art['longitude'])
                    )
                    if distance <= config.ARTIFACT_DETECTION_RADIUS:
                        nearby_artifacts.append({
                            'id': art['id'],
                            'name': art['name'],
                            'distance': round(distance, 1),
                            'latitude': float(art['latitude']),
                            'longitude': float(art['longitude'])
                        })
                        
                        # Update artifact state to visible
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
            'body': json.dumps(response)
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }
