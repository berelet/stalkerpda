import json
import uuid
from src.database import get_db
from src.middleware.auth import require_gm
from src.utils.responses import success_response, error_response

@require_gm
def handler(event, context):
    """Handle artifact types CRUD"""
    method = event.get('httpMethod')
    
    if method == 'POST':
        return create_artifact_type(event, context)
    elif method == 'GET':
        return list_artifact_types(event, context)
    else:
        return error_response('Method not allowed', 405)

def create_artifact_type(event, context):
    """POST /api/admin/artifact-types - Create artifact type"""
    try:
        body = json.loads(event.get('body', '{}'))
        
        name = body.get('name')
        rarity = body.get('rarity', 'common')
        value = body.get('value', 0)
        bonus_lives = body.get('bonusLives', 0)
        radiation_resist = body.get('radiationResist', 0)
        image_url = body.get('imageUrl', '')
        
        if not name:
            return error_response('Artifact name is required', 400)
        
        artifact_id = str(uuid.uuid4())
        player_id = event.get('requestContext', {}).get('authorizer', {}).get('playerId')
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """INSERT INTO artifact_types 
                    (id, name, rarity, base_value, bonus_lives, radiation_resist, image_url, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                    (artifact_id, name, rarity, value, bonus_lives, radiation_resist, image_url, player_id)
                )
                conn.commit()
        
        return success_response({
            'id': artifact_id,
            'name': name,
            'rarity': rarity,
            'value': value,
            'bonusLives': bonus_lives,
            'radiationResist': radiation_resist,
            'imageUrl': image_url
        }, 201)
        
    except Exception as e:
        print(f"Error creating artifact type: {str(e)}")
        return error_response(str(e), 500)

def list_artifact_types(event, context):
    """GET /api/admin/artifact-types - List all artifact types"""
    try:
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """SELECT id, name, rarity, base_value, bonus_lives, radiation_resist, image_url, created_at
                    FROM artifact_types
                    ORDER BY created_at DESC"""
                )
                artifacts = cursor.fetchall()
        
        return success_response({
            'artifacts': [
                {
                    'id': a['id'],
                    'name': a['name'],
                    'rarity': a['rarity'],
                    'value': int(a['base_value']),
                    'bonusLives': a['bonus_lives'],
                    'radiationResist': a['radiation_resist'],
                    'imageUrl': a['image_url'],
                    'createdAt': a['created_at'].isoformat() if a['created_at'] else None
                }
                for a in artifacts
            ]
        })
        
    except Exception as e:
        print(f"Error listing artifact types: {str(e)}")
        return error_response(str(e), 500)
