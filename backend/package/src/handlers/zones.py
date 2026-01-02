import json
from datetime import datetime, timedelta
from src.database import get_db
from src.middleware.auth import require_auth
from src.utils.geo import haversine_distance
from src.config import config

@require_auth
def handler(event, context):
    """GET /api/zones - Get all zones"""
    try:
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Get radiation zones
                cursor.execute(
                    """SELECT id, name, center_lat, center_lng, radius, radiation_level
                    FROM radiation_zones WHERE active = TRUE"""
                )
                radiation_zones = cursor.fetchall()
                
                # Get control points
                cursor.execute(
                    """SELECT id, name, latitude, longitude, controlled_by_faction, controlled_by_player
                    FROM control_points WHERE active = TRUE"""
                )
                control_points = cursor.fetchall()
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'radiationZones': [
                    {
                        'id': z['id'],
                        'name': z['name'],
                        'centerLat': float(z['center_lat']),
                        'centerLng': float(z['center_lng']),
                        'radius': z['radius'],
                        'radiationLevel': z['radiation_level']
                    }
                    for z in radiation_zones
                ],
                'controlPoints': [
                    {
                        'id': cp['id'],
                        'name': cp['name'],
                        'latitude': float(cp['latitude']),
                        'longitude': float(cp['longitude']),
                        'controlledByFaction': cp['controlled_by_faction']
                    }
                    for cp in control_points
                ]
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_auth
def capture_handler(event, context):
    """POST /api/zones/control/{id}/capture - Start capturing control point"""
    try:
        player_id = event['player']['player_id']
        zone_id = event['pathParameters']['id']
        body = json.loads(event.get('body', '{}'))
        
        lat = body.get('latitude')
        lng = body.get('longitude')
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Get control point
                cursor.execute(
                    """SELECT latitude, longitude, capture_radius
                    FROM control_points WHERE id = %s AND active = TRUE""",
                    (zone_id,)
                )
                cp = cursor.fetchone()
                
                if not cp:
                    return {
                        'statusCode': 404,
                        'body': json.dumps({'error': {'code': 'NOT_FOUND', 'message': 'Control point not found'}})
                    }
                
                # Check distance
                distance = haversine_distance(lat, lng, float(cp['latitude']), float(cp['longitude']))
                
                if distance > cp['capture_radius']:
                    return {
                        'statusCode': 400,
                        'body': json.dumps({'error': {'code': 'TOO_FAR', 'message': f'Too far ({distance:.1f}m)'}})
                    }
                
                # Start capture
                capture_time = datetime.utcnow()
                completes_at = capture_time + timedelta(seconds=config.CAPTURE_DURATION)
                
                cursor.execute(
                    """UPDATE control_points 
                    SET capturing_by = %s, capture_started_at = %s
                    WHERE id = %s""",
                    (player_id, capture_time, zone_id)
                )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'captureStarted': True,
                'completesAt': completes_at.isoformat() + 'Z'
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_auth
def complete_capture_handler(event, context):
    """POST /api/zones/control/{id}/complete - Complete capture"""
    try:
        player_id = event['player']['player_id']
        zone_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Get control point and player faction
                cursor.execute(
                    """SELECT cp.capturing_by, cp.capture_started_at, p.faction
                    FROM control_points cp, players p
                    WHERE cp.id = %s AND p.id = %s""",
                    (zone_id, player_id)
                )
                result = cursor.fetchone()
                
                if not result or result['capturing_by'] != player_id:
                    return {
                        'statusCode': 400,
                        'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'Capture not started'}})
                    }
                
                # Check time
                elapsed = (datetime.utcnow() - result['capture_started_at']).total_seconds()
                if elapsed < config.CAPTURE_DURATION:
                    return {
                        'statusCode': 409,
                        'body': json.dumps({'error': {'code': 'TOO_EARLY', 'message': f'Wait {config.CAPTURE_DURATION - int(elapsed)}s'}})
                    }
                
                # Complete capture
                cursor.execute(
                    """UPDATE control_points 
                    SET controlled_by_faction = %s, controlled_by_player = %s,
                    captured_at = NOW(), capturing_by = NULL, capture_started_at = NULL
                    WHERE id = %s""",
                    (result['faction'], player_id, zone_id)
                )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'controlledByFaction': result['faction'],
                'controlledByPlayer': player_id
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_auth
def cancel_capture_handler(event, context):
    """POST /api/zones/control/{id}/cancel - Cancel capture"""
    try:
        player_id = event['player']['player_id']
        zone_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """UPDATE control_points 
                    SET capturing_by = NULL, capture_started_at = NULL
                    WHERE id = %s AND capturing_by = %s""",
                    (zone_id, player_id)
                )
        
        return {
            'statusCode': 200,
            'body': json.dumps({'success': True})
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }
