"""
Traders Management Handler
Endpoints for managing traders (NPC and bartenders)
"""
import json
import uuid
from src.database import get_db
from src.middleware.auth import require_gm
from src.utils.responses import success_response, error_response

@require_gm
def list_traders_handler(event, context):
    """GET /api/admin/traders - List all traders"""
    try:
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT id, name, type, player_id, latitude, longitude,
                           interaction_radius, commission_buy_pct, commission_sell_pct,
                           is_active, created_at, updated_at
                    FROM traders
                    ORDER BY name
                """)
                traders = cursor.fetchall()
                
                for t in traders:
                    if t.get('latitude'):
                        t['latitude'] = float(t['latitude'])
                    if t.get('longitude'):
                        t['longitude'] = float(t['longitude'])
                    if t.get('created_at'):
                        t['created_at'] = t['created_at'].isoformat() + 'Z'
                    if t.get('updated_at'):
                        t['updated_at'] = t['updated_at'].isoformat() + 'Z'
                
                return success_response({'traders': traders})
    except Exception as e:
        return error_response(f'Failed to fetch traders: {str(e)}', 500)

@require_gm
def create_trader_handler(event, context):
    """POST /api/admin/traders - Create new trader"""
    try:
        body = json.loads(event.get('body', '{}'))
        
        name = body.get('name')
        trader_type = body.get('type', 'npc')
        
        if not name:
            return error_response('Name is required', 400)
        
        trader_id = str(uuid.uuid4())
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO traders 
                    (id, name, type, player_id, latitude, longitude,
                     interaction_radius, commission_buy_pct, commission_sell_pct, is_active)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    trader_id,
                    name,
                    trader_type,
                    body.get('player_id'),
                    body.get('latitude'),
                    body.get('longitude'),
                    body.get('interaction_radius', 20),
                    body.get('commission_buy_pct', 10),
                    body.get('commission_sell_pct', 20),
                    body.get('is_active', True)
                ))
                conn.commit()
        
        return success_response({'message': 'Trader created', 'trader_id': trader_id})
    except Exception as e:
        return error_response(f'Failed to create trader: {str(e)}', 500)

@require_gm
def update_trader_handler(event, context):
    """PUT /api/admin/traders/{id} - Update trader"""
    try:
        trader_id = event['pathParameters']['id']
        body = json.loads(event.get('body', '{}'))
        
        allowed = ['name', 'type', 'player_id', 'latitude', 'longitude',
                   'interaction_radius', 'commission_buy_pct', 'commission_sell_pct', 'is_active']
        
        updates = []
        params = []
        for field in allowed:
            if field in body:
                updates.append(f"{field} = %s")
                params.append(body[field])
        
        if not updates:
            return error_response('No fields to update', 400)
        
        params.append(trader_id)
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(f"UPDATE traders SET {', '.join(updates)} WHERE id = %s", params)
                if cursor.rowcount == 0:
                    return error_response('Trader not found', 404)
                conn.commit()
        
        return success_response({'message': 'Trader updated'})
    except Exception as e:
        return error_response(f'Failed to update trader: {str(e)}', 500)

@require_gm
def delete_trader_handler(event, context):
    """DELETE /api/admin/traders/{id} - Delete trader"""
    try:
        trader_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Delete trader inventory first
                cursor.execute("DELETE FROM trader_inventory WHERE trader_id = %s", (trader_id,))
                # Delete trader
                cursor.execute("DELETE FROM traders WHERE id = %s", (trader_id,))
                if cursor.rowcount == 0:
                    return error_response('Trader not found', 404)
                conn.commit()
        
        return success_response({'message': 'Trader deleted'})
    except Exception as e:
        return error_response(f'Failed to delete trader: {str(e)}', 500)

@require_gm
def get_trader_inventory_handler(event, context):
    """GET /api/admin/traders/{id}/inventory - Get trader's inventory"""
    try:
        trader_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT ti.id, ti.item_def_id, ti.is_available,
                           i.name, i.type, i.base_price, i.image_url
                    FROM trader_inventory ti
                    JOIN item_definitions i ON ti.item_def_id = i.id
                    WHERE ti.trader_id = %s
                    ORDER BY i.type, i.name
                """, (trader_id,))
                items = cursor.fetchall()
                
                return success_response({'items': items})
    except Exception as e:
        return error_response(f'Failed to fetch inventory: {str(e)}', 500)

@require_gm
def update_trader_inventory_handler(event, context):
    """PUT /api/admin/traders/{id}/inventory - Update trader's inventory"""
    try:
        trader_id = event['pathParameters']['id']
        body = json.loads(event.get('body', '{}'))
        item_ids = body.get('item_ids', [])  # List of item_def_ids to sell
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Clear existing inventory
                cursor.execute("DELETE FROM trader_inventory WHERE trader_id = %s", (trader_id,))
                
                # Add new items
                for item_id in item_ids:
                    cursor.execute("""
                        INSERT INTO trader_inventory (id, trader_id, item_def_id, is_available)
                        VALUES (%s, %s, %s, 1)
                    """, (str(uuid.uuid4()), trader_id, item_id))
                
                conn.commit()
        
        return success_response({'message': 'Inventory updated', 'count': len(item_ids)})
    except Exception as e:
        return error_response(f'Failed to update inventory: {str(e)}', 500)


@require_gm
def get_trader_quests_handler(event, context):
    """GET /api/admin/traders/{id}/quests - Get quests assigned to trader"""
    try:
        trader_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT tq.quest_id, c.title, c.quest_type, c.reward
                    FROM trader_quests tq
                    JOIN contracts c ON tq.quest_id = c.id
                    WHERE tq.trader_id = %s AND tq.is_active = 1
                    ORDER BY c.title
                """, (trader_id,))
                quests = cursor.fetchall()
                
                for q in quests:
                    if q.get('reward'):
                        q['reward_money'] = int(q.pop('reward'))
                
                return success_response({'quests': quests})
    except Exception as e:
        return error_response(f'Failed to fetch quests: {str(e)}', 500)

@require_gm
def update_trader_quests_handler(event, context):
    """PUT /api/admin/traders/{id}/quests - Update quests assigned to trader"""
    try:
        trader_id = event['pathParameters']['id']
        body = json.loads(event.get('body', '{}'))
        quest_ids = body.get('quest_ids', [])
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM trader_quests WHERE trader_id = %s", (trader_id,))
                
                for quest_id in quest_ids:
                    cursor.execute("""
                        INSERT INTO trader_quests (id, trader_id, quest_id)
                        VALUES (%s, %s, %s)
                    """, (str(uuid.uuid4()), trader_id, quest_id))
                
                conn.commit()
        
        return success_response({'message': 'Quests updated', 'count': len(quest_ids)})
    except Exception as e:
        return error_response(f'Failed to update quests: {str(e)}', 500)
