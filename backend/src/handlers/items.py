"""
Item Definitions Management Handler
Endpoints for managing shop items (medicine, ammunition, food, drink)
"""
import json
import uuid
from src.database import get_db
from src.middleware.auth import require_gm
from src.utils.responses import success_response, error_response

@require_gm
def list_items_handler(event, context):
    """GET /api/admin/items - List all item definitions"""
    try:
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT id, name, description, image_url, type, base_price,
                           is_sellable, is_active, is_stackable, is_physical,
                           wounds_protection, radiation_resistance, extra_lives, anti_radiation,
                           created_at, updated_at
                    FROM item_definitions
                    ORDER BY type, name
                """)
                items = cursor.fetchall()
                
                # Convert timestamps to ISO format
                for item in items:
                    if item.get('created_at'):
                        item['created_at'] = item['created_at'].isoformat() + 'Z'
                    if item.get('updated_at'):
                        item['updated_at'] = item['updated_at'].isoformat() + 'Z'
                
                return success_response({'items': items})
    except Exception as e:
        return error_response(f'Failed to fetch items: {str(e)}', 500)

@require_gm
def create_item_handler(event, context):
    """POST /api/admin/items - Create new item definition"""
    try:
        body = json.loads(event.get('body', '{}'))
        
        # Required fields
        name = body.get('name')
        item_type = body.get('type')
        base_price = body.get('base_price', 0)
        
        if not name or not item_type:
            return error_response('Name and type are required', 400)
        
        # Optional fields
        description = body.get('description', '')
        image_url = body.get('image_url', '')
        is_sellable = body.get('is_sellable', True)
        is_active = body.get('is_active', True)
        is_stackable = body.get('is_stackable', False)
        is_physical = body.get('is_physical', False)
        wounds_protection = body.get('wounds_protection', 0)
        radiation_resistance = body.get('radiation_resistance', 0)
        extra_lives = body.get('extra_lives', 0)
        anti_radiation = body.get('anti_radiation', 0)
        
        item_id = str(uuid.uuid4())
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO item_definitions 
                    (id, name, description, image_url, type, base_price,
                     is_sellable, is_active, is_stackable, is_physical,
                     wounds_protection, radiation_resistance, extra_lives, anti_radiation)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (item_id, name, description, image_url, item_type, base_price,
                      is_sellable, is_active, is_stackable, is_physical,
                      wounds_protection, radiation_resistance, extra_lives, anti_radiation))
                conn.commit()
        
        return success_response({
            'message': 'Item created successfully',
            'item_id': item_id
        })
    except Exception as e:
        return error_response(f'Failed to create item: {str(e)}', 500)

@require_gm
def update_item_handler(event, context):
    """PUT /api/admin/items/{id} - Update item definition"""
    try:
        item_id = event['pathParameters']['id']
        body = json.loads(event.get('body', '{}'))
        
        # Build update query dynamically
        update_fields = []
        params = []
        
        allowed_fields = [
            'name', 'description', 'image_url', 'type', 'base_price',
            'is_sellable', 'is_active', 'is_stackable', 'is_physical',
            'wounds_protection', 'radiation_resistance', 'extra_lives', 'anti_radiation'
        ]
        
        for field in allowed_fields:
            if field in body:
                update_fields.append(f"{field} = %s")
                params.append(body[field])
        
        if not update_fields:
            return error_response('No fields to update', 400)
        
        params.append(item_id)
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                query = f"UPDATE item_definitions SET {', '.join(update_fields)} WHERE id = %s"
                cursor.execute(query, params)
                
                if cursor.rowcount == 0:
                    return error_response('Item not found', 404)
                
                conn.commit()
        
        return success_response({'message': 'Item updated successfully'})
    except Exception as e:
        return error_response(f'Failed to update item: {str(e)}', 500)

@require_gm
def delete_item_handler(event, context):
    """DELETE /api/admin/items/{id} - Delete item definition"""
    try:
        item_id = event['pathParameters']['id']
        
        # Check for force parameter
        query_params = event.get('queryStringParameters') or {}
        force = query_params.get('force') == 'true'
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Check if item is used in trader inventory
                cursor.execute("""
                    SELECT COUNT(*) as count 
                    FROM trader_inventory 
                    WHERE item_def_id = %s
                """, (item_id,))
                trader_count = cursor.fetchone()['count']
                
                # Check if item is in player inventories
                cursor.execute("""
                    SELECT COUNT(*) as count 
                    FROM player_inventory 
                    WHERE item_type = 'consumable' AND item_id = %s
                """, (item_id,))
                player_count = cursor.fetchone()['count']
                
                # If used and not forced, return warning
                if (trader_count > 0 or player_count > 0) and not force:
                    return {
                        'statusCode': 409,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                        },
                        'body': json.dumps({
                            'error': {
                                'code': 'ITEM_IN_USE',
                                'message': f'Item is used in {trader_count} trader(s) and {player_count} player(s) inventory. Add ?force=true to delete anyway.',
                                'trader_count': trader_count,
                                'player_count': player_count
                            }
                        })
                    }
                
                # Delete from player inventories
                if player_count > 0:
                    cursor.execute("""
                        DELETE FROM player_inventory 
                        WHERE item_type = 'consumable' AND item_id = %s
                    """, (item_id,))
                
                # Delete from trader inventory
                if trader_count > 0:
                    cursor.execute("""
                        DELETE FROM trader_inventory 
                        WHERE item_def_id = %s
                    """, (item_id,))
                
                # Delete item definition
                cursor.execute("DELETE FROM item_definitions WHERE id = %s", (item_id,))
                
                if cursor.rowcount == 0:
                    return error_response('Item not found', 404)
                
                conn.commit()
        
        return success_response({
            'message': 'Item deleted successfully',
            'removed_from_traders': trader_count,
            'removed_from_players': player_count
        })
    except Exception as e:
        return error_response(f'Failed to delete item: {str(e)}', 500)
