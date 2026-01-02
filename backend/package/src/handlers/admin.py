import json
import uuid
from src.database import get_db
from src.middleware.auth import require_gm

@require_gm
def handler(event, context):
    """GET /api/admin/players - Get all players for GM map"""
    try:
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """SELECT p.id, p.nickname, p.faction, p.status, p.current_lives, p.current_radiation,
                    pl.latitude, pl.longitude, pl.updated_at
                    FROM players p
                    LEFT JOIN player_locations pl ON p.id = pl.player_id
                    WHERE p.status = 'alive'"""
                )
                players = cursor.fetchall()
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'players': [
                    {
                        'id': p['id'],
                        'nickname': p['nickname'],
                        'faction': p['faction'],
                        'status': p['status'],
                        'lives': p['current_lives'],
                        'radiation': p['current_radiation'],
                        'location': {
                            'latitude': float(p['latitude']) if p['latitude'] else None,
                            'longitude': float(p['longitude']) if p['longitude'] else None,
                            'updatedAt': p['updated_at'].isoformat() if p['updated_at'] else None
                        }
                    }
                    for p in players
                ]
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_gm
def history_handler(event, context):
    """GET /api/admin/players/{id}/history - Get player location history"""
    try:
        player_id = event['pathParameters']['id']
        params = event.get('queryStringParameters') or {}
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT latitude, longitude, recorded_at
                    FROM location_history
                    WHERE player_id = %s
                    ORDER BY recorded_at DESC
                    LIMIT 100
                """
                cursor.execute(query, (player_id,))
                history = cursor.fetchall()
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'track': [
                    {
                        'latitude': float(h['latitude']),
                        'longitude': float(h['longitude']),
                        'timestamp': h['recorded_at'].isoformat()
                    }
                    for h in history
                ]
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_gm
def spawn_artifact_handler(event, context):
    """POST /api/admin/artifacts/spawn - Spawn artifact"""
    try:
        body = json.loads(event.get('body', '{}'))
        type_id = body.get('typeId')
        lat = body.get('latitude')
        lng = body.get('longitude')
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                artifact_id = str(uuid.uuid4())
                cursor.execute(
                    """INSERT INTO artifacts (id, type_id, latitude, longitude, state)
                    VALUES (%s, %s, %s, %s, 'hidden')""",
                    (artifact_id, type_id, lat, lng)
                )
                
                cursor.execute(
                    "SELECT name FROM artifact_types WHERE id = %s",
                    (type_id,)
                )
                artifact_type = cursor.fetchone()
        
        return {
            'statusCode': 201,
            'body': json.dumps({
                'id': artifact_id,
                'name': artifact_type['name'],
                'location': {'latitude': lat, 'longitude': lng}
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_gm
def create_radiation_zone_handler(event, context):
    """POST /api/admin/zones/radiation - Create radiation zone"""
    try:
        player_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                zone_id = str(uuid.uuid4())
                cursor.execute(
                    """INSERT INTO radiation_zones 
                    (id, name, center_lat, center_lng, radius, radiation_level, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (zone_id, body['name'], body['centerLat'], body['centerLng'],
                     body['radius'], body['radiationLevel'], player_id)
                )
        
        return {
            'statusCode': 201,
            'body': json.dumps({
                'id': zone_id,
                'name': body['name'],
                'active': True
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_gm
def create_control_point_handler(event, context):
    """POST /api/admin/zones/control - Create control point"""
    try:
        player_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cp_id = str(uuid.uuid4())
                cursor.execute(
                    """INSERT INTO control_points 
                    (id, name, latitude, longitude, created_by)
                    VALUES (%s, %s, %s, %s, %s)""",
                    (cp_id, body['name'], body['latitude'], body['longitude'], player_id)
                )
        
        return {
            'statusCode': 201,
            'body': json.dumps({
                'id': cp_id,
                'name': body['name']
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }
