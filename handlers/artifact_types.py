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
    elif method == 'PUT':
        return update_artifact_type(event, context)
    elif method == 'DELETE':
        return delete_artifact_type(event, context)
    else:
        return error_response('Method not allowed', 405)

def create_artifact_type(event, context):
    """POST /api/admin/artifact-types - Create artifact type"""
    try:
        print(f"[CREATE ARTIFACT] Event: {json.dumps(event)}")
        
        body = json.loads(event.get('body', '{}'))
        print(f"[CREATE ARTIFACT] Body: {body}")
        
        name = body.get('name')
        rarity = body.get('rarity', 'common')
        value = body.get('value', 0)
        bonus_lives = body.get('bonusLives', 0)
        radiation_resist = body.get('radiationResist', 0)
        image_url = body.get('imageUrl', '')
        
        print(f"[CREATE ARTIFACT] Parsed: name={name}, rarity={rarity}, value={value}")
        
        if not name:
            print("[CREATE ARTIFACT] ERROR: Name is required")
            return error_response('Artifact name is required', 400)
        
        artifact_id = str(uuid.uuid4())
        # Get player_id from middleware (set by @require_gm)
        player_id = event.get('player', {}).get('player_id')
        print(f"[CREATE ARTIFACT] artifact_id={artifact_id}, player_id={player_id}")
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                print(f"[CREATE ARTIFACT] Executing INSERT query...")
                cursor.execute(
                    """INSERT INTO artifact_types 
                    (id, name, rarity, base_value, bonus_lives, radiation_resist, image_url, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                    (artifact_id, name, rarity, value, bonus_lives, radiation_resist, image_url, player_id)
                )
                conn.commit()
                print(f"[CREATE ARTIFACT] INSERT successful, rows affected: {cursor.rowcount}")
        
        response = {
            'id': artifact_id,
            'name': name,
            'rarity': rarity,
            'value': value,
            'bonusLives': bonus_lives,
            'radiationResist': radiation_resist,
            'imageUrl': image_url
        }
        print(f"[CREATE ARTIFACT] Success response: {response}")
        return success_response(response, 201)
        
    except Exception as e:
        print(f"[CREATE ARTIFACT] ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"[CREATE ARTIFACT] Traceback: {traceback.format_exc()}")
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

def update_artifact_type(event, context):
    """PUT /api/admin/artifact-types/{id} - Update artifact type"""
    try:
        artifact_id = event.get('pathParameters', {}).get('id')
        if not artifact_id:
            return error_response('Artifact ID is required', 400)
        
        body = json.loads(event.get('body', '{}'))
        
        name = body.get('name')
        rarity = body.get('rarity')
        value = body.get('value')
        bonus_lives = body.get('bonusLives')
        radiation_resist = body.get('radiationResist')
        image_url = body.get('imageUrl')
        
        if not name:
            return error_response('Artifact name is required', 400)
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """UPDATE artifact_types 
                    SET name=%s, rarity=%s, base_value=%s, bonus_lives=%s, 
                        radiation_resist=%s, image_url=%s
                    WHERE id=%s""",
                    (name, rarity, value, bonus_lives, radiation_resist, image_url, artifact_id)
                )
                conn.commit()
                
                if cursor.rowcount == 0:
                    return error_response('Artifact not found', 404)
        
        return success_response({
            'id': artifact_id,
            'name': name,
            'rarity': rarity,
            'value': value,
            'bonusLives': bonus_lives,
            'radiationResist': radiation_resist,
            'imageUrl': image_url
        })
        
    except Exception as e:
        print(f"Error updating artifact type: {str(e)}")
        return error_response(str(e), 500)

def delete_artifact_type(event, context):
    """DELETE /api/admin/artifact-types/{id} - Delete artifact type"""
    try:
        artifact_id = event.get('pathParameters', {}).get('id')
        if not artifact_id:
            return error_response('Artifact ID is required', 400)
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Check if artifact type is used in player inventories
                cursor.execute(
                    """SELECT COUNT(*) as count FROM player_inventory 
                    WHERE item_type = 'artifact' AND item_id = %s""",
                    (artifact_id,)
                )
                count = cursor.fetchone()['count']
                
                if count > 0:
                    return error_response(
                        f'Cannot delete: {count} players have this artifact in inventory', 
                        400
                    )
                
                # Check if used in spawned artifacts
                cursor.execute(
                    """SELECT COUNT(*) as count FROM artifacts WHERE type_id = %s""",
                    (artifact_id,)
                )
                count = cursor.fetchone()['count']
                
                if count > 0:
                    return error_response(
                        f'Cannot delete: {count} artifacts of this type are spawned on map', 
                        400
                    )
                
                # Delete artifact type
                cursor.execute("DELETE FROM artifact_types WHERE id = %s", (artifact_id,))
                conn.commit()
                
                if cursor.rowcount == 0:
                    return error_response('Artifact not found', 404)
        
        return success_response({'message': 'Artifact type deleted'})
        
    except Exception as e:
        print(f"Error deleting artifact type: {str(e)}")
        return error_response(str(e), 500)
        
    except Exception as e:
        print(f"Error updating artifact type: {str(e)}")
        return error_response(str(e), 500)
