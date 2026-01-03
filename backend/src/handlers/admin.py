import json
import uuid
from src.database import get_db
from src.middleware.auth import require_gm

@require_gm
def handler(event, context):
    """GET /api/admin/players - Get all players for GM"""
    try:
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """SELECT p.id, p.nickname, p.email, p.faction, p.status, p.current_lives, p.current_radiation,
                    p.created_at, pl.latitude, pl.longitude, pl.updated_at,
                    COALESCE(pr.is_gm, 0) as is_gm, COALESCE(pr.is_bartender, 0) as is_bartender
                    FROM players p
                    LEFT JOIN player_locations pl ON p.id = pl.player_id
                    LEFT JOIN player_roles pr ON p.id = pr.player_id
                    ORDER BY pl.updated_at DESC, p.created_at DESC"""
                )
                players = cursor.fetchall()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({
                'players': [
                    {
                        'id': p['id'],
                        'nickname': p['nickname'],
                        'email': p['email'],
                        'faction': p['faction'],
                        'status': p['status'],
                        'lives': p['current_lives'],
                        'radiation': p['current_radiation'],
                        'isGm': bool(p['is_gm']),
                        'isBartender': bool(p['is_bartender']),
                        'createdAt': p['created_at'].isoformat() if p['created_at'] else None,
                        'location': {
                            'latitude': float(p['latitude']) if p['latitude'] else None,
                            'longitude': float(p['longitude']) if p['longitude'] else None,
                            'updatedAt': p['updated_at'].isoformat() if p['updated_at'] else None
                        } if p['latitude'] else None
                    }
                    for p in players
                ]
            })
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
            'headers': {'Content-Type': 'application/json'},
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
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_gm
def spawn_artifact_handler(event, context):
    """POST /api/admin/artifacts/spawn - Spawn artifact with expiration"""
    try:
        body = json.loads(event.get('body', '{}'))
        type_id = body.get('typeId')
        lat = body.get('latitude')
        lng = body.get('longitude')
        expires_at = body.get('expiresAt')  # ISO datetime string
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                artifact_id = str(uuid.uuid4())
                cursor.execute(
                    """INSERT INTO artifacts (id, type_id, latitude, longitude, state, expires_at)
                    VALUES (%s, %s, %s, %s, 'hidden', %s)""",
                    (artifact_id, type_id, lat, lng, expires_at)
                )
                
                cursor.execute(
                    "SELECT name FROM artifact_types WHERE id = %s",
                    (type_id,)
                )
                artifact_type = cursor.fetchone()
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'id': artifact_id,
                'name': artifact_type['name'] if artifact_type else 'Unknown',
                'location': {'latitude': lat, 'longitude': lng},
                'expiresAt': expires_at
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
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
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'id': zone_id,
                'name': body['name'],
                'active': True
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
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
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'id': cp_id,
                'name': body['name']
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_gm
def update_player_handler(event, context):
    """PUT /api/admin/players/{id} - Update player (status, faction, roles)"""
    try:
        player_id = event['pathParameters']['id']
        body = json.loads(event.get('body', '{}'))
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Update status if provided
                if 'status' in body:
                    status = body['status']
                    if status not in ['alive', 'dead']:
                        return {
                            'statusCode': 400,
                            'headers': {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            },
                            'body': json.dumps({'error': {'code': 'INVALID_STATUS', 'message': 'Status must be alive or dead'}})
                        }
                    cursor.execute("UPDATE players SET status = %s WHERE id = %s", (status, player_id))
                
                # Update faction if provided
                if 'faction' in body:
                    cursor.execute("UPDATE players SET faction = %s WHERE id = %s", (body['faction'], player_id))
                
                # Update roles if provided
                if 'isGm' in body or 'isBartender' in body:
                    is_gm = 1 if body.get('isGm', False) else 0
                    is_bartender = 1 if body.get('isBartender', False) else 0
                    
                    # Insert or update player_roles
                    cursor.execute(
                        """INSERT INTO player_roles (player_id, is_gm, is_bartender)
                        VALUES (%s, %s, %s)
                        ON DUPLICATE KEY UPDATE is_gm = %s, is_bartender = %s""",
                        (player_id, is_gm, is_bartender, is_gm, is_bartender)
                    )
                
                # Check if player exists
                cursor.execute("SELECT id FROM players WHERE id = %s", (player_id,))
                if not cursor.fetchone():
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'PLAYER_NOT_FOUND', 'message': 'Player not found'}})
                    }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'PUT,OPTIONS'
            },
            'body': json.dumps({
                'id': player_id,
                'updated': True
            })
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


@require_gm
def get_spawned_artifacts_handler(event, context):
    """GET /api/admin/artifacts/spawned - Get all spawned artifacts"""
    try:
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """SELECT a.id, a.type_id, a.latitude, a.longitude, a.state, 
                    a.spawned_at, a.expires_at, at.name as type_name
                    FROM artifacts a
                    JOIN artifact_types at ON a.type_id = at.id
                    ORDER BY a.spawned_at DESC"""
                )
                artifacts = cursor.fetchall()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'artifacts': [
                    {
                        'id': a['id'],
                        'typeId': a['type_id'],
                        'typeName': a['type_name'],
                        'latitude': float(a['latitude']),
                        'longitude': float(a['longitude']),
                        'state': a['state'],
                        'spawnedAt': a['spawned_at'].isoformat() if a['spawned_at'] else None,
                        'expiresAt': a['expires_at'].isoformat() if a['expires_at'] else None
                    }
                    for a in artifacts
                ]
            })
        }
                        'id': a['id'],
                        'typeId': a['type_id'],
                        'typeName': a['type_name'],
                        'latitude': float(a['latitude']),
                        'longitude': float(a['longitude']),
                        'state': a['state'],
                        'spawnedAt': a['created_at'].isoformat() if a['created_at'] else None,
                        'expiresAt': a['expires_at'].isoformat() if a['expires_at'] else None
                    }
                    for a in artifacts
                ]
            })
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

@require_gm
def delete_artifact_handler(event, context):
    """DELETE /api/admin/artifacts/{id} - Remove artifact from map"""
    try:
        artifact_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM artifacts WHERE id = %s", (artifact_id,))
                
                if cursor.rowcount == 0:
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'NOT_FOUND', 'message': 'Artifact not found'}})
                    }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'success': True})
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
