import json
import uuid
from datetime import datetime, timedelta
from src.database import get_db
from src.middleware.auth import require_auth
from src.utils.geo import haversine_distance
from src.config import config

def invalidate_artifacts_cache(cursor):
    """Invalidate artifacts cache by incrementing version"""
    cursor.execute("UPDATE cache_versions SET version = version + 1 WHERE cache_key = 'artifacts'")

@require_auth
def handler(event, context):
    """GET /api/artifacts - Get player's artifacts"""
    try:
        player_id = event['player']['player_id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """SELECT a.id, at.name, at.description, at.rarity, at.base_value,
                    at.bonus_lives, at.radiation_resist, at.other_effects, at.image_url,
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
                    'description': art['description'] or '',
                    'rarity': art['rarity'],
                    'value': float(art['base_value']),
                    'imageUrl': art['image_url'] or '',
                    'effects': {
                        'bonusLives': art['bonus_lives'] or 0,
                        'radiationResist': art['radiation_resist'] or 0
                    },
                    'extractedAt': art['extracted_at'].isoformat() + 'Z' if art['extracted_at'] else None
                }
                for art in artifacts
            ]
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps(response)
        }
    
    except Exception as e:
        print(f"Artifacts error: {e}")
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

@require_auth
def start_extraction_handler(event, context):
    """POST /api/artifacts/extract/start - Start extracting artifact"""
    try:
        player_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        
        artifact_id = body.get('artifactId')
        
        if not artifact_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'artifactId required'}})
            }
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Get player location
                cursor.execute(
                    "SELECT latitude, longitude FROM player_locations WHERE player_id = %s",
                    (player_id,)
                )
                player_loc = cursor.fetchone()
                
                if not player_loc:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'NO_LOCATION', 'message': 'Update location first'}})
                    }
                
                # Check if artifact exists and is available
                cursor.execute(
                    """SELECT latitude, longitude, state, owner_id, extracting_by,
                    spawned_at, expires_at
                    FROM artifacts WHERE id = %s""",
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
                        'body': json.dumps({'error': {'code': 'ARTIFACT_NOT_FOUND', 'message': 'Artifact not found'}})
                    }
                
                # Check if already taken
                if artifact['owner_id']:
                    return {
                        'statusCode': 409,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'ARTIFACT_ALREADY_TAKEN', 'message': 'Artifact already picked up'}})
                    }
                
                # Check if being extracted by another player
                if artifact['extracting_by'] and artifact['extracting_by'] != player_id:
                    return {
                        'statusCode': 409,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'ARTIFACT_BEING_EXTRACTED', 'message': 'Another player is extracting this artifact'}})
                    }
                
                # Check if expired
                if artifact['expires_at'] and artifact['expires_at'] < datetime.utcnow():
                    return {
                        'statusCode': 410,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'ARTIFACT_EXPIRED', 'message': 'Artifact has expired'}})
                    }
                
                # Check if not yet spawned
                if artifact['spawned_at'] > datetime.utcnow():
                    return {
                        'statusCode': 425,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'ARTIFACT_NOT_SPAWNED', 'message': 'Artifact not yet active'}})
                    }
                
                if artifact['state'] not in ['visible', 'hidden']:
                    return {
                        'statusCode': 409,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'ARTIFACT_NOT_AVAILABLE', 'message': 'Artifact not available'}})
                    }
                
                # Check distance (5m for pickup - GPS accuracy tolerance)
                distance = haversine_distance(
                    float(player_loc['latitude']), float(player_loc['longitude']),
                    float(artifact['latitude']), float(artifact['longitude'])
                )
                
                if distance > 5.0:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'TOO_FAR', 'message': f'Too far from artifact ({distance:.1f}m, need ≤5m)'}})
                    }
                
                # Start extraction
                extraction_time = datetime.utcnow()
                
                cursor.execute(
                    """UPDATE artifacts 
                    SET state = 'extracting', extracting_by = %s, extraction_started_at = %s
                    WHERE id = %s AND owner_id IS NULL AND extracting_by IS NULL""",
                    (player_id, extraction_time, artifact_id)
                )
                
                if cursor.rowcount == 0:
                    return {
                        'statusCode': 409,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'CONFLICT', 'message': 'Artifact state changed'}})
                    }
        
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
                'extractionStartedAt': extraction_time.isoformat() + 'Z',
                'extractionDuration': 30
            })
        }
    
    except Exception as e:
        print(f"Start extraction error: {e}")
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

@require_auth
def complete_extraction_handler(event, context):
    """POST /api/artifacts/extract/complete - Complete extraction"""
    try:
        player_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        artifact_id = body.get('artifactId')
        
        if not artifact_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'artifactId required'}})
            }
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Get player location
                cursor.execute(
                    "SELECT latitude, longitude FROM player_locations WHERE player_id = %s",
                    (player_id,)
                )
                player_loc = cursor.fetchone()
                
                if not player_loc:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'NO_LOCATION', 'message': 'Update location first'}})
                    }
                
                # Check extraction status
                cursor.execute(
                    """SELECT a.id, a.type_id, a.state, a.owner_id, a.extracting_by, 
                    a.extraction_started_at, a.latitude, a.longitude,
                    at.name, at.description, at.rarity, at.base_value, at.image_url,
                    at.bonus_lives, at.radiation_resist, at.other_effects
                    FROM artifacts a
                    JOIN artifact_types at ON a.type_id = at.id
                    WHERE a.id = %s""",
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
                        'body': json.dumps({'error': {'code': 'ARTIFACT_NOT_FOUND', 'message': 'Artifact not found'}})
                    }
                
                if artifact['state'] != 'extracting' or artifact['extracting_by'] != player_id:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'NOT_EXTRACTING', 'message': 'You are not extracting this artifact'}})
                    }
                
                # Check if already taken by someone else
                if artifact['owner_id']:
                    return {
                        'statusCode': 409,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'ALREADY_TAKEN', 'message': 'Artifact was picked up by another player'}})
                    }
                
                # Check if enough time has passed (30 seconds)
                elapsed = (datetime.utcnow() - artifact['extraction_started_at']).total_seconds()
                if elapsed < 30:
                    return {
                        'statusCode': 409,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'EXTRACTION_NOT_COMPLETE', 'message': f'Hold for {30 - int(elapsed)} more seconds'}})
                    }
                
                # Check distance again (player must still be within 5m - GPS accuracy tolerance)
                distance = haversine_distance(
                    float(player_loc['latitude']), float(player_loc['longitude']),
                    float(artifact['latitude']), float(artifact['longitude'])
                )
                
                if distance > 5.0:
                    # Auto-cancel extraction
                    cursor.execute(
                        """UPDATE artifacts 
                        SET state = 'visible', extracting_by = NULL, extraction_started_at = NULL
                        WHERE id = %s""",
                        (artifact_id,)
                    )
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'TOO_FAR', 'message': f'You moved too far ({distance:.1f}m, need ≤5m)'}})
                    }
                
                # Complete extraction
                cursor.execute(
                    """UPDATE artifacts 
                    SET state = 'extracted', owner_id = %s, extracted_at = %s,
                    extracting_by = NULL, extraction_started_at = NULL
                    WHERE id = %s AND owner_id IS NULL""",
                    (player_id, datetime.utcnow(), artifact_id)
                )
                
                if cursor.rowcount == 0:
                    return {
                        'statusCode': 409,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'ALREADY_TAKEN', 'message': 'Artifact was picked up by another player'}})
                    }
                
                # Add to player inventory
                cursor.execute(
                    """INSERT INTO player_inventory (player_id, item_type, item_id, quantity)
                    VALUES (%s, 'artifact', %s, 1)
                    ON DUPLICATE KEY UPDATE quantity = quantity + 1""",
                    (player_id, artifact['type_id'])
                )
                
                # Update player stats and reputation
                cursor.execute(
                    """UPDATE players 
                    SET total_artifacts_found = total_artifacts_found + 1,
                        reputation = reputation + 5
                    WHERE id = %s""",
                    (player_id,)
                )
                
                # Invalidate artifacts cache
                invalidate_artifacts_cache(cursor)
        
        response = {
            'success': True,
            'artifact': {
                'id': artifact['id'],
                'name': artifact['name'],
                'description': artifact['description'] or '',
                'rarity': artifact['rarity'],
                'value': float(artifact['base_value']),
                'imageUrl': artifact['image_url'] or '',
                'effects': {
                    'bonusLives': artifact['bonus_lives'] or 0,
                    'radiationResist': artifact['radiation_resist'] or 0
                }
            }
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
        print(f"Complete extraction error: {e}")
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

@require_auth
def cancel_extraction_handler(event, context):
    """POST /api/artifacts/extract/cancel - Cancel extraction"""
    try:
        player_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        artifact_id = body.get('artifactId')
        
        if not artifact_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'artifactId required'}})
            }
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Return to hidden state so it can be re-detected on next location update
                cursor.execute(
                    """UPDATE artifacts 
                    SET state = 'hidden', extracting_by = NULL, extraction_started_at = NULL
                    WHERE id = %s AND extracting_by = %s""",
                    (artifact_id, player_id)
                )
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'success': True})
        }
    
    except Exception as e:
        print(f"Cancel extraction error: {e}")
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

@require_auth
def drop_handler(event, context):
    """POST /api/artifacts/drop - Drop artifact (lost forever)"""
    try:
        player_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        artifact_id = body.get('artifactId')
        
        if not artifact_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'artifactId required'}})
            }
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Get artifact type_id for inventory removal
                cursor.execute(
                    "SELECT type_id FROM artifacts WHERE id = %s AND owner_id = %s",
                    (artifact_id, player_id)
                )
                artifact = cursor.fetchone()
                
                if not artifact:
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'NOT_FOUND', 'message': 'Artifact not in your inventory'}})
                    }
                
                # Update artifact state to lost
                cursor.execute(
                    """UPDATE artifacts 
                    SET state = 'lost', owner_id = NULL
                    WHERE id = %s AND owner_id = %s""",
                    (artifact_id, player_id)
                )
                
                # Remove from inventory
                cursor.execute(
                    """DELETE FROM player_inventory 
                    WHERE player_id = %s AND item_type = 'artifact' AND item_id = %s
                    LIMIT 1""",
                    (player_id, artifact['type_id'])
                )
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'success': True})
        }
    
    except Exception as e:
        print(f"Drop artifact error: {e}")
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

@require_auth
def sell_handler(event, context):
    """POST /api/artifacts/sell - Sell artifact to bartender"""
    try:
        player_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        artifact_id = body.get('artifactId')
        
        if not artifact_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'artifactId required'}})
            }
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Get artifact and player info
                cursor.execute(
                    """SELECT a.type_id, at.base_value, p.reputation, p.balance
                    FROM artifacts a
                    JOIN artifact_types at ON a.type_id = at.id
                    JOIN players p ON p.id = %s
                    WHERE a.id = %s AND a.owner_id = %s""",
                    (player_id, artifact_id, player_id)
                )
                result = cursor.fetchone()
                
                if not result:
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': {'code': 'NOT_FOUND', 'message': 'Artifact not in your inventory'}})
                    }
                
                # Calculate price with reputation modifier
                base_value = float(result['base_value'])
                reputation = result['reputation']
                reputation_modifier = 1 + (reputation / 100) * 0.3
                final_price = int(base_value * reputation_modifier)
                
                # Update artifact state to lost
                cursor.execute(
                    """UPDATE artifacts 
                    SET state = 'lost', owner_id = NULL
                    WHERE id = %s""",
                    (artifact_id,)
                )
                
                # Remove from inventory
                cursor.execute(
                    """DELETE FROM player_inventory 
                    WHERE player_id = %s AND item_type = 'artifact' AND item_id = %s
                    LIMIT 1""",
                    (player_id, result['type_id'])
                )
                
                # Add money to player
                cursor.execute(
                    "UPDATE players SET balance = balance + %s WHERE id = %s",
                    (final_price, player_id)
                )
                
                new_balance = float(result['balance']) + final_price
        
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
                'soldFor': final_price,
                'newBalance': new_balance
            })
        }
    
    except Exception as e:
        print(f"Sell artifact error: {e}")
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
