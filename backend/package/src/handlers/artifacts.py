import json
import uuid
from datetime import datetime, timedelta
from src.database import get_db
from src.middleware.auth import require_auth
from src.utils.geo import haversine_distance
from src.config import config

@require_auth
def handler(event, context):
    """GET /api/artifacts - Get player's artifacts"""
    try:
        player_id = event['player']['player_id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """SELECT a.id, at.name, at.rarity, at.base_value,
                    at.bonus_lives, at.radiation_resist, at.other_effects,
                    a.extracted_at
                    FROM artifacts a
                    JOIN artifact_types at ON a.type_id = at.id
                    WHERE a.owner_id = %s AND a.state = 'extracted'""",
                    (player_id,)
                )
                artifacts = cursor.fetchall()
        
        response = {
            'artifacts': [
                {
                    'id': art['id'],
                    'name': art['name'],
                    'rarity': art['rarity'],
                    'value': float(art['base_value']),
                    'effects': {
                        'bonusLives': art['bonus_lives'],
                        'radiationResist': art['radiation_resist']
                    },
                    'extractedAt': art['extracted_at'].isoformat() if art['extracted_at'] else None
                }
                for art in artifacts
            ]
        }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(response)
        }
    
    except Exception as e:
        print(f"Artifacts error: {e}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_auth
def extract_handler(event, context):
    """POST /api/artifacts/{id}/extract - Start extracting artifact"""
    try:
        player_id = event['player']['player_id']
        artifact_id = event['pathParameters']['id']
        body = json.loads(event.get('body', '{}'))
        
        latitude = body.get('latitude')
        longitude = body.get('longitude')
        
        if not latitude or not longitude:
            return {
                'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'Location required'}})
            }
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Check if artifact exists and is available
                cursor.execute(
                    """SELECT latitude, longitude, state, owner_id, extracting_by
                    FROM artifacts WHERE id = %s""",
                    (artifact_id,)
                )
                artifact = cursor.fetchone()
                
                if not artifact:
                    return {
                        'statusCode': 404,
            'headers': {'Content-Type': 'application/json'},
                        'body': json.dumps({'error': {'code': 'NOT_FOUND', 'message': 'Artifact not found'}})
                    }
                
                if artifact['state'] not in ['visible', 'hidden']:
                    return {
                        'statusCode': 409,
            'headers': {'Content-Type': 'application/json'},
                        'body': json.dumps({'error': {'code': 'CONFLICT', 'message': 'Artifact not available'}})
                    }
                
                # Check distance
                distance = haversine_distance(
                    latitude, longitude,
                    float(artifact['latitude']), float(artifact['longitude'])
                )
                
                if distance > config.ARTIFACT_PICKUP_RADIUS:
                    return {
                        'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
                        'body': json.dumps({'error': {'code': 'TOO_FAR', 'message': f'Too far from artifact ({distance:.1f}m)'}})
                    }
                
                # Start extraction
                extraction_time = datetime.utcnow()
                completes_at = extraction_time + timedelta(seconds=config.EXTRACTION_DURATION)
                
                cursor.execute(
                    """UPDATE artifacts 
                    SET state = 'extracting', extracting_by = %s, extraction_started_at = %s
                    WHERE id = %s""",
                    (player_id, extraction_time, artifact_id)
                )
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'success': True,
                'extractionStarted': True,
                'completesAt': completes_at.isoformat() + 'Z'
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_auth
def complete_handler(event, context):
    """POST /api/artifacts/{id}/complete - Complete extraction"""
    try:
        player_id = event['player']['player_id']
        artifact_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Check extraction status
                cursor.execute(
                    """SELECT a.id, a.state, a.extracting_by, a.extraction_started_at,
                    at.name, at.rarity, at.base_value, at.bonus_lives, at.radiation_resist
                    FROM artifacts a
                    JOIN artifact_types at ON a.type_id = at.id
                    WHERE a.id = %s""",
                    (artifact_id,)
                )
                artifact = cursor.fetchone()
                
                if not artifact:
                    return {
                        'statusCode': 404,
            'headers': {'Content-Type': 'application/json'},
                        'body': json.dumps({'error': {'code': 'NOT_FOUND', 'message': 'Artifact not found'}})
                    }
                
                if artifact['state'] != 'extracting' or artifact['extracting_by'] != player_id:
                    return {
                        'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
                        'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'Extraction not started'}})
                    }
                
                # Check if enough time has passed
                elapsed = (datetime.utcnow() - artifact['extraction_started_at']).total_seconds()
                if elapsed < config.EXTRACTION_DURATION:
                    return {
                        'statusCode': 409,
            'headers': {'Content-Type': 'application/json'},
                        'body': json.dumps({'error': {'code': 'TOO_EARLY', 'message': f'Wait {config.EXTRACTION_DURATION - int(elapsed)}s'}})
                    }
                
                # Complete extraction
                cursor.execute(
                    """UPDATE artifacts 
                    SET state = 'extracted', owner_id = %s, extracted_at = %s,
                    extracting_by = NULL, extraction_started_at = NULL
                    WHERE id = %s""",
                    (player_id, datetime.utcnow(), artifact_id)
                )
                
                # Update player stats
                cursor.execute(
                    "UPDATE players SET total_artifacts_found = total_artifacts_found + 1 WHERE id = %s",
                    (player_id,)
                )
                
                # Create event
                cursor.execute(
                    """INSERT INTO game_events (type, player_id, artifact_id, data)
                    VALUES ('artifact_extracted', %s, %s, %s)""",
                    (player_id, artifact_id, json.dumps({'name': artifact['name']}))
                )
        
        response = {
            'success': True,
            'artifact': {
                'id': artifact['id'],
                'name': artifact['name'],
                'rarity': artifact['rarity'],
                'value': float(artifact['base_value']),
                'effects': {
                    'bonusLives': artifact['bonus_lives'],
                    'radiationResist': artifact['radiation_resist']
                }
            }
        }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(response)
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_auth
def cancel_handler(event, context):
    """POST /api/artifacts/{id}/cancel - Cancel extraction"""
    try:
        player_id = event['player']['player_id']
        artifact_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """UPDATE artifacts 
                    SET state = 'visible', extracting_by = NULL, extraction_started_at = NULL
                    WHERE id = %s AND extracting_by = %s""",
                    (artifact_id, player_id)
                )
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'success': True})
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_auth
def drop_handler(event, context):
    """POST /api/artifacts/{id}/drop - Drop artifact (lost forever)"""
    try:
        player_id = event['player']['player_id']
        artifact_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """UPDATE artifacts 
                    SET state = 'lost', owner_id = NULL
                    WHERE id = %s AND owner_id = %s""",
                    (artifact_id, player_id)
                )
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'success': True})
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }
