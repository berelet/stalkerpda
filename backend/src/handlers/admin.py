import json
import uuid
from datetime import datetime
from src.database import get_db
from src.middleware.auth import require_gm
from src.utils.responses import success_response, error_response, handle_cors, cors_headers

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
    """POST /api/admin/artifacts/spawn - Spawn artifact with expiration and respawn"""
    try:
        body = json.loads(event.get('body', '{}'))
        type_id = body.get('typeId')
        lat = body.get('latitude')
        lng = body.get('longitude')
        expires_at = body.get('expiresAt')  # ISO datetime string
        
        # Respawn settings (new)
        respawn_enabled = body.get('respawnEnabled', False)
        respawn_delay = body.get('respawnDelayMinutes', 30) if respawn_enabled else None
        respawn_radius = body.get('respawnRadiusMeters', 50) if respawn_enabled else None
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                artifact_id = str(uuid.uuid4())
                cursor.execute(
                    """INSERT INTO artifacts (id, type_id, latitude, longitude, state, expires_at,
                                             respawn_enabled, respawn_delay_minutes, respawn_radius_meters,
                                             original_latitude, original_longitude)
                    VALUES (%s, %s, %s, %s, 'hidden', %s, %s, %s, %s, %s, %s)""",
                    (artifact_id, type_id, lat, lng, expires_at,
                     respawn_enabled, respawn_delay, respawn_radius, lat, lng)
                )
                
                cursor.execute(
                    "SELECT name FROM artifact_types WHERE id = %s",
                    (type_id,)
                )
                artifact_type = cursor.fetchone()
                
                # Invalidate artifacts cache
                cursor.execute("UPDATE cache_versions SET version = version + 1 WHERE cache_key = 'artifacts'")
        
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
                'expiresAt': expires_at,
                'respawnEnabled': respawn_enabled,
                'respawnDelayMinutes': respawn_delay,
                'respawnRadiusMeters': respawn_radius
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_gm
def get_radiation_zones_handler(event, context):
    """GET /api/admin/zones/radiation - Get all radiation zones"""
    cors = handle_cors(event)
    if cors:
        return cors
    try:
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT id, name, center_lat, center_lng, radius, radiation_level,
                           active_from, active_to, active, created_at
                    FROM radiation_zones ORDER BY created_at DESC
                """)
                zones = cursor.fetchall()
        
        return {
            'statusCode': 200,
            'headers': cors_headers(event),
            'body': json.dumps({'zones': [{
                'id': z['id'], 'name': z['name'],
                'centerLat': float(z['center_lat']), 'centerLng': float(z['center_lng']),
                'radius': z['radius'], 'radiationLevel': z['radiation_level'],
                'activeFrom': z['active_from'].isoformat() if z['active_from'] else None,
                'activeTo': z['active_to'].isoformat() if z['active_to'] else None,
                'isActive': z['active'], 'createdAt': z['created_at'].isoformat()
            } for z in zones]})
        }
    except Exception as e:
        return {'statusCode': 500, 'headers': cors_headers(event),
                'body': json.dumps({'error': {'message': str(e)}})}

@require_gm
def update_radiation_zone_handler(event, context):
    """PUT /api/admin/zones/radiation/{id}"""
    cors = handle_cors(event)
    if cors:
        return cors
    try:
        zone_id = event['pathParameters']['id']
        body = json.loads(event.get('body', '{}'))
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    UPDATE radiation_zones SET name=%s, center_lat=%s, center_lng=%s, 
                    radius=%s, radiation_level=%s, active_from=%s, active_to=%s, active=%s
                    WHERE id=%s
                """, (body['name'], body['centerLat'], body['centerLng'], body['radius'],
                      body['radiationLevel'], body.get('activeFrom'), body.get('activeTo'),
                      body.get('isActive', True), zone_id))
                cursor.execute("UPDATE cache_versions SET version = version + 1 WHERE cache_key = 'radiation_zones'")
        return {'statusCode': 200, 'headers': cors_headers(event), 'body': json.dumps({'success': True})}
    except Exception as e:
        return {'statusCode': 500, 'headers': cors_headers(event), 'body': json.dumps({'error': {'message': str(e)}})}

@require_gm
def delete_radiation_zone_handler(event, context):
    """DELETE /api/admin/zones/radiation/{id}"""
    cors = handle_cors(event)
    if cors:
        return cors
    try:
        zone_id = event['pathParameters']['id']
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM radiation_zones WHERE id = %s", (zone_id,))
                cursor.execute("UPDATE cache_versions SET version = version + 1 WHERE cache_key = 'radiation_zones'")
        return {'statusCode': 200, 'headers': cors_headers(event),
                'body': json.dumps({'success': True})}
    except Exception as e:
        return {'statusCode': 500, 'headers': cors_headers(event),
                'body': json.dumps({'error': {'message': str(e)}})}

@require_gm
def get_respawn_zones_handler(event, context):
    """GET /api/admin/zones/respawn - Get all respawn zones"""
    cors = handle_cors(event)
    if cors:
        return cors
    try:
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT id, name, center_lat, center_lng, radius, respawn_time_seconds,
                           active_from, active_to, active, created_at
                    FROM respawn_zones ORDER BY created_at DESC
                """)
                zones = cursor.fetchall()
        
        return {
            'statusCode': 200,
            'headers': cors_headers(event),
            'body': json.dumps({'zones': [{
                'id': z['id'], 'name': z['name'],
                'centerLat': float(z['center_lat']), 'centerLng': float(z['center_lng']),
                'radius': z['radius'], 'respawnTimeSeconds': z['respawn_time_seconds'],
                'activeFrom': z['active_from'].isoformat() if z['active_from'] else None,
                'activeTo': z['active_to'].isoformat() if z['active_to'] else None,
                'isActive': z['active'], 'createdAt': z['created_at'].isoformat()
            } for z in zones]})
        }
    except Exception as e:
        return {'statusCode': 500, 'headers': cors_headers(event),
                'body': json.dumps({'error': {'message': str(e)}})}

@require_gm
def update_respawn_zone_handler(event, context):
    """PUT /api/admin/zones/respawn/{id}"""
    cors = handle_cors(event)
    if cors:
        return cors
    try:
        zone_id = event['pathParameters']['id']
        body = json.loads(event.get('body', '{}'))
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    UPDATE respawn_zones SET name=%s, center_lat=%s, center_lng=%s,
                    radius=%s, respawn_time_seconds=%s, active_from=%s, active_to=%s, active=%s
                    WHERE id=%s
                """, (body['name'], body['centerLat'], body['centerLng'], body['radius'],
                      body['respawnTimeSeconds'], body.get('activeFrom'), body.get('activeTo'),
                      body.get('isActive', True), zone_id))
                cursor.execute("UPDATE cache_versions SET version = version + 1 WHERE cache_key = 'respawn_zones'")
        return {'statusCode': 200, 'headers': cors_headers(event), 'body': json.dumps({'success': True})}
    except Exception as e:
        return {'statusCode': 500, 'headers': cors_headers(event), 'body': json.dumps({'error': {'message': str(e)}})}

@require_gm
def delete_respawn_zone_handler(event, context):
    """DELETE /api/admin/zones/respawn/{id}"""
    cors = handle_cors(event)
    if cors:
        return cors
    try:
        zone_id = event['pathParameters']['id']
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM respawn_zones WHERE id = %s", (zone_id,))
                cursor.execute("UPDATE cache_versions SET version = version + 1 WHERE cache_key = 'respawn_zones'")
        return {'statusCode': 200, 'headers': cors_headers(event),
                'body': json.dumps({'success': True})}
    except Exception as e:
        return {'statusCode': 500, 'headers': cors_headers(event),
                'body': json.dumps({'error': {'message': str(e)}})}

@require_gm
def create_radiation_zone_handler(event, context):
    """POST /api/admin/zones/radiation - Create radiation zone"""
    cors = handle_cors(event)
    if cors:
        return cors
    try:
        player_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                zone_id = str(uuid.uuid4())
                cursor.execute(
                    """INSERT INTO radiation_zones 
                    (id, name, center_lat, center_lng, radius, radiation_level, 
                     active_from, active_to, respawn_enabled, respawn_delay_seconds, 
                     respawn_radius_meters, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (zone_id, body['name'], body['centerLat'], body['centerLng'],
                     body['radius'], body['radiationLevel'], 
                     body.get('activeFrom'), body.get('activeTo'),
                     body.get('respawnEnabled', False), body.get('respawnDelaySeconds'),
                     body.get('respawnRadiusMeters'), player_id)
                )
                
                # Invalidate cache
                cursor.execute(
                    "UPDATE cache_versions SET version = version + 1 WHERE cache_key = 'radiation_zones'"
                )
        
        return {
            'statusCode': 201,
            'headers': cors_headers(),
            'body': json.dumps({
                'id': zone_id,
                'name': body['name'],
                'active': True
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers(),
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
                    a.spawned_at, a.expires_at, a.extracted_at, a.owner_id,
                    a.respawn_enabled, a.respawn_delay_minutes, a.respawn_radius_meters,
                    a.pickup_count, a.last_pickup_at,
                    at.name as type_name, p.nickname as collected_by
                    FROM artifacts a
                    JOIN artifact_types at ON a.type_id = at.id
                    LEFT JOIN players p ON a.owner_id = p.id
                    ORDER BY a.spawned_at DESC"""
                )
                artifacts = cursor.fetchall()
        
        result_artifacts = []
        now = datetime.utcnow()
        
        for a in artifacts:
            # Determine status
            if a['state'] == 'extracted':
                status = 'Collected'
            elif a['state'] == 'lost':
                status = 'Lost'
            elif a['state'] == 'respawning':
                status = 'Respawning'
            elif a['expires_at'] and a['expires_at'] < now:
                status = 'Expired'
            elif a['spawned_at'] > now:
                status = 'Scheduled'
            else:
                status = 'Active'
            
            result_artifacts.append({
                'id': a['id'],
                'typeId': a['type_id'],
                'typeName': a['type_name'],
                'latitude': float(a['latitude']),
                'longitude': float(a['longitude']),
                'state': a['state'],
                'status': status,
                'collectedBy': a['collected_by'],
                'collectedByPlayerId': a['owner_id'],
                'spawnedAt': a['spawned_at'].isoformat() + 'Z' if a['spawned_at'] else None,
                'expiresAt': a['expires_at'].isoformat() + 'Z' if a['expires_at'] else None,
                'extractedAt': a['extracted_at'].isoformat() + 'Z' if a['extracted_at'] else None,
                'respawnEnabled': bool(a['respawn_enabled']),
                'respawnDelayMinutes': a['respawn_delay_minutes'],
                'respawnRadiusMeters': a['respawn_radius_meters'],
                'pickupCount': a['pickup_count'] or 0,
                'lastPickupAt': a['last_pickup_at'].isoformat() + 'Z' if a['last_pickup_at'] else None
            })
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({'artifacts': result_artifacts})
        }
    
    except Exception as e:
        print(f"Get spawned artifacts error: {e}")
        import traceback
        traceback.print_exc()
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
                
                # Invalidate cache
                cursor.execute("UPDATE cache_versions SET version = version + 1 WHERE cache_key = 'artifacts'")
        
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


@require_gm
def reset_artifact_to_map_handler(event, context):
    """POST /api/admin/artifacts/{id}/reset - Return artifact to map (player keeps copy)"""
    try:
        artifact_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Check if artifact exists and is extracted
                cursor.execute(
                    "SELECT state, owner_id FROM artifacts WHERE id = %s",
                    (artifact_id,)
                )
                artifact = cursor.fetchone()
                
                if not artifact:
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'NOT_FOUND', 'message': 'Artifact not found'}})
                    }
                
                if artifact['state'] != 'extracted':
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'Artifact not collected'}})
                    }
                
                # Reset to map (clear owner_id so it appears in queries, player keeps copy in inventory)
                cursor.execute(
                    """UPDATE artifacts 
                    SET state = 'hidden', owner_id = NULL, extracting_by = NULL, extraction_started_at = NULL
                    WHERE id = %s""",
                    (artifact_id,)
                )
                
                # Invalidate cache
                cursor.execute("UPDATE cache_versions SET version = version + 1 WHERE cache_key = 'artifacts'")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'message': 'Artifact returned to map (player keeps copy in inventory)'
            })
        }
    
    except Exception as e:
        print(f"Reset artifact error: {e}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_gm
def remove_and_reset_artifact_handler(event, context):
    """POST /api/admin/artifacts/{id}/remove-and-reset - Remove from inventory and return to map"""
    try:
        artifact_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Get artifact info
                cursor.execute(
                    "SELECT type_id, state, owner_id FROM artifacts WHERE id = %s",
                    (artifact_id,)
                )
                artifact = cursor.fetchone()
                
                if not artifact:
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'NOT_FOUND', 'message': 'Artifact not found'}})
                    }
                
                if artifact['state'] != 'extracted' or not artifact['owner_id']:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'Artifact not in player inventory'}})
                    }
                
                # Remove from player inventory
                cursor.execute(
                    """DELETE FROM player_inventory 
                    WHERE player_id = %s AND item_type = 'artifact' AND item_id = %s
                    LIMIT 1""",
                    (artifact['owner_id'], artifact['type_id'])
                )
                
                # Reset artifact to map
                cursor.execute(
                    """UPDATE artifacts 
                    SET state = 'hidden', owner_id = NULL, extracting_by = NULL, 
                        extraction_started_at = NULL, extracted_at = NULL
                    WHERE id = %s""",
                    (artifact_id,)
                )
                
                # Invalidate cache
                cursor.execute("UPDATE cache_versions SET version = version + 1 WHERE cache_key = 'artifacts'")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'message': 'Artifact removed from player inventory and returned to map'
            })
        }
    
    except Exception as e:
        print(f"Remove and reset artifact error: {e}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }


@require_gm
def create_respawn_zone_handler(event, context):
    """POST /api/admin/zones/respawn - Create respawn zone"""
    cors = handle_cors(event)
    if cors:
        return cors
    try:
        player_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                zone_id = str(uuid.uuid4())
                cursor.execute(
                    """INSERT INTO respawn_zones 
                    (id, name, center_lat, center_lng, radius, respawn_time_seconds,
                     active_from, active_to, respawn_enabled, respawn_delay_seconds,
                     respawn_radius_meters, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (zone_id, body['name'], body['centerLat'], body['centerLng'],
                     body['radius'], body['respawnTimeSeconds'],
                     body.get('activeFrom'), body.get('activeTo'),
                     body.get('respawnEnabled', False), body.get('respawnDelaySeconds'),
                     body.get('respawnRadiusMeters'), player_id)
                )
                
                # Invalidate cache
                cursor.execute(
                    "UPDATE cache_versions SET version = version + 1 WHERE cache_key = 'respawn_zones'"
                )
        
        return {
            'statusCode': 201,
            'headers': cors_headers(),
            'body': json.dumps({
                'id': zone_id,
                'name': body['name'],
                'active': True
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }


@require_gm
def resurrect_player_handler(event, context):
    """POST /api/admin/players/{id}/resurrect - GM resurrect player"""
    cors = handle_cors(event)
    if cors:
        return cors
    try:
        player_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Resurrect player
                cursor.execute("""
                    UPDATE players
                    SET status = 'alive',
                        resurrection_progress_seconds = 0,
                        dead_at = NULL
                    WHERE id = %s
                """, (player_id,))
                
                # Create event
                cursor.execute("""
                    INSERT INTO game_events (type, player_id, data)
                    VALUES ('gm_resurrection', %s, %s)
                """, (player_id, json.dumps({'by_gm': True})))
        
        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': json.dumps({
                'success': True,
                'message': 'Player resurrected'
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }
