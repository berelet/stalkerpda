"""
Inventory handlers for equipment slots and backpack management
"""
import json
from src.database import get_db
from src.middleware.auth import require_auth
from src.utils.inventory import (
    calculate_total_bonuses,
    get_equipped_items,
    get_backpack_items,
    check_backpack_capacity,
    equip_item,
    unequip_item,
    update_cached_bonuses
)


def cors_headers():
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }


@require_auth
def get_inventory_handler(event, context):
    """GET /api/inventory - Get full inventory"""
    
    player_id = event['player']['player_id']
    
    with get_db() as conn:
        # Get equipped items
        equipped = get_equipped_items(player_id, conn)
        
        # Get backpack items
        backpack, count = get_backpack_items(player_id, conn)
        
        # Get capacity
        cursor = conn.cursor()
        cursor.execute("SELECT backpack_capacity FROM players WHERE id = %s", (player_id,))
        capacity = cursor.fetchone()['backpack_capacity']
        
        # Get total bonuses
        bonuses = calculate_total_bonuses(player_id, conn)
        
        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': json.dumps({
                'equipped': equipped,
                'backpack': backpack,
                'capacity': {
                    'current': count,
                    'max': capacity
                },
                'totalBonuses': bonuses
            })
        }


@require_auth
def equip_item_handler(event, context):
    """POST /api/inventory/equip - Equip item from backpack"""
    
    player_id = event['player']['player_id']
    
    try:
        body = json.loads(event.get('body', '{}'))
        item_id = body.get('itemId')
        item_type = body.get('itemType', 'equipment')  # 'equipment' or 'artifact'
        
        if not item_id:
            return {
                'statusCode': 400,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'itemId is required'})
            }
        
        with get_db() as conn:
            result = equip_item(player_id, item_id, item_type, conn)
            
            if not result['success']:
                return {
                    'statusCode': 400,
                    'headers': cors_headers(),
                    'body': json.dumps({'error': result['error']})
                }
            
            # Update cached bonuses
            update_cached_bonuses(player_id, conn)
            
            # Get updated bonuses and lives
            bonuses = calculate_total_bonuses(player_id, conn)
            
            cursor = conn.cursor()
            cursor.execute("SELECT current_lives FROM players WHERE id = %s", (player_id,))
            current_lives = cursor.fetchone()['current_lives']
            
            # If artifact equipped, update lives
            if item_type == 'artifact':
                cursor.execute("""
                    SELECT at.bonus_lives
                    FROM player_inventory pi
                    JOIN artifact_types at ON pi.item_id = at.id
                    WHERE pi.id = %s AND pi.player_id = %s
                """, (item_id, player_id))
                
                artifact_row = cursor.fetchone()
                if artifact_row and artifact_row['bonus_lives']:
                    bonus_lives = artifact_row['bonus_lives']
                    
                    cursor.execute("""
                        UPDATE players
                        SET current_lives = current_lives + %s,
                            status = CASE WHEN current_lives + %s > 0 THEN 'alive' ELSE status END
                        WHERE id = %s
                    """, (bonus_lives, bonus_lives, player_id))
                    
                    conn.commit()
                    
                    cursor.execute("SELECT current_lives FROM players WHERE id = %s", (player_id,))
                    current_lives = cursor.fetchone()['current_lives']
            
            return {
                'statusCode': 200,
                'headers': cors_headers(),
                'body': json.dumps({
                    'success': True,
                    'equipped': result['equipped'],
                    'replaced': result.get('replaced'),
                    'newBonuses': bonuses,
                    'currentLives': current_lives
                })
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': str(e)})
        }


@require_auth
def unequip_item_handler(event, context):
    """POST /api/inventory/unequip - Unequip item to backpack"""
    
    player_id = event['player']['player_id']
    
    try:
        body = json.loads(event.get('body', '{}'))
        item_id = body.get('itemId')
        item_type = body.get('itemType', 'equipment')
        
        if not item_id:
            return {
                'statusCode': 400,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'itemId is required'})
            }
        
        with get_db() as conn:
            result = unequip_item(player_id, item_id, item_type, conn)
            
            if not result['success']:
                return {
                    'statusCode': 400,
                    'headers': cors_headers(),
                    'body': json.dumps({'error': result['error']})
                }
            
            # Update cached bonuses
            update_cached_bonuses(player_id, conn)
            
            # Get updated bonuses and status
            bonuses = calculate_total_bonuses(player_id, conn)
            
            cursor = conn.cursor()
            cursor.execute("SELECT current_lives, status FROM players WHERE id = %s", (player_id,))
            player = cursor.fetchone()
            
            return {
                'statusCode': 200,
                'headers': cors_headers(),
                'body': json.dumps({
                    'success': True,
                    'unequipped': result['unequipped'],
                    'newBonuses': bonuses,
                    'currentLives': player['current_lives'],
                    'status': player['status']
                })
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': str(e)})
        }


@require_auth
def use_consumable_handler(event, context):
    """POST /api/inventory/use - Use consumable item"""
    
    player_id = event['player']['player_id']
    
    try:
        body = json.loads(event.get('body', '{}'))
        item_id = body.get('itemId')
        
        if not item_id:
            return {
                'statusCode': 400,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'itemId is required'})
            }
        
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Convert item_id to int if it's a number string
            try:
                item_id_int = int(item_id)
            except (ValueError, TypeError):
                item_id_int = item_id
            
            # First try player_inventory (consumables from item_definitions)
            cursor.execute("""
                SELECT pi.id, pi.item_id as item_def_id, pi.quantity,
                       i.type, i.anti_radiation, i.extra_lives, i.is_physical, i.name
                FROM player_inventory pi
                JOIN item_definitions i ON pi.item_id = i.id
                WHERE pi.id = %s AND pi.player_id = %s 
                  AND pi.item_type = 'consumable' AND pi.slot_type = 'backpack'
            """, (item_id_int, player_id))
            
            item = cursor.fetchone()
            
            if item:
                # Handle consumable from item_definitions
                quantity = item['quantity']
                is_physical = item['is_physical']
                
                # Generate redeem code for physical items
                redeem_code = None
                if is_physical:
                    import random
                    import string
                    redeem_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
                
                # Apply effects (anti-radiation)
                radiation_before = 0
                radiation_after = 0
                radiation_removed = 0
                
                if item['anti_radiation'] and item['anti_radiation'] > 0:
                    cursor.execute("SELECT current_radiation FROM players WHERE id = %s", (player_id,))
                    radiation_before = cursor.fetchone()['current_radiation'] or 0
                    radiation_removed = min(radiation_before, item['anti_radiation'])
                    radiation_after = max(0, radiation_before - item['anti_radiation'])
                    
                    cursor.execute("UPDATE players SET current_radiation = %s WHERE id = %s", 
                                   (radiation_after, player_id))
                
                # Decrease quantity or delete
                if quantity > 1:
                    cursor.execute("UPDATE player_inventory SET quantity = quantity - 1 WHERE id = %s", (item_id_int,))
                else:
                    cursor.execute("DELETE FROM player_inventory WHERE id = %s", (item_id_int,))
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': cors_headers(),
                    'body': json.dumps({
                        'success': True,
                        'itemUsed': item_id,
                        'itemName': item['name'],
                        'radiationBefore': radiation_before,
                        'radiationAfter': radiation_after,
                        'radiationRemoved': radiation_removed,
                        'redeemCode': redeem_code
                    })
                }
            
            # Fallback: try player_equipment (old system)
            cursor.execute("""
                SELECT pe.id, et.category, et.radiation_removal
                FROM player_equipment pe
                JOIN equipment_types et ON pe.equipment_type_id = et.id
                WHERE pe.id = %s AND pe.player_id = %s AND pe.slot_type = 'backpack'
            """, (item_id, player_id))
            
            item = cursor.fetchone()
            
            if not item:
                return {
                    'statusCode': 404,
                    'headers': cors_headers(),
                    'body': json.dumps({'error': 'Item not found in backpack'})
                }
            
            if item['category'] != 'consumable':
                return {
                    'statusCode': 400,
                    'headers': cors_headers(),
                    'body': json.dumps({'error': 'Item is not a consumable'})
                }
            
            # Get current radiation
            cursor.execute("SELECT current_radiation FROM players WHERE id = %s", (player_id,))
            radiation_before = cursor.fetchone()['current_radiation']
            
            # Apply radiation removal
            radiation_removal = item['radiation_removal']
            radiation_removed = min(radiation_before, radiation_removal)
            radiation_after = max(0, radiation_before - radiation_removal)
            
            # Update player radiation
            cursor.execute("""
                UPDATE players
                SET current_radiation = %s
                WHERE id = %s
            """, (radiation_after, player_id))
            
            # Delete consumable
            cursor.execute("DELETE FROM player_equipment WHERE id = %s", (item_id,))
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': cors_headers(),
                'body': json.dumps({
                    'success': True,
                    'itemUsed': item_id,
                    'radiationBefore': radiation_before,
                    'radiationAfter': radiation_after,
                    'radiationRemoved': radiation_removed
                })
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': str(e)})
        }


@require_auth
def drop_item_handler(event, context):
    """POST /api/inventory/drop - Drop item (permanent deletion)"""
    
    player_id = event['player']['player_id']
    
    try:
        body = json.loads(event.get('body', '{}'))
        item_id = body.get('itemId')
        item_type = body.get('itemType', 'equipment')
        
        if not item_id:
            return {
                'statusCode': 400,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'itemId is required'})
            }
        
        with get_db() as conn:
            cursor = conn.cursor()
            
            if item_type == 'equipment':
                # Check if equipped, unequip first
                cursor.execute("""
                    SELECT slot_type
                    FROM player_equipment
                    WHERE id = %s AND player_id = %s
                """, (item_id, player_id))
                
                item = cursor.fetchone()
                
                if not item:
                    return {
                        'statusCode': 404,
                        'headers': cors_headers(),
                        'body': json.dumps({'error': 'Item not found'})
                    }
                
                if item['slot_type'] != 'backpack':
                    # Unequip first
                    result = unequip_item(player_id, item_id, item_type, conn)
                    if not result['success']:
                        return {
                            'statusCode': 400,
                            'headers': cors_headers(),
                            'body': json.dumps({'error': result['error']})
                        }
                
                # Delete item
                cursor.execute("DELETE FROM player_equipment WHERE id = %s", (item_id,))
            
            elif item_type == 'artifact':
                # Check if equipped, unequip first
                cursor.execute("""
                    SELECT slot_type
                    FROM artifacts
                    WHERE id = %s AND owner_id = %s
                """, (item_id, player_id))
                
                artifact = cursor.fetchone()
                
                if not artifact:
                    return {
                        'statusCode': 404,
                        'headers': cors_headers(),
                        'body': json.dumps({'error': 'Artifact not found'})
                    }
                
                if artifact['slot_type'] == 'artifact':
                    # Unequip first
                    result = unequip_item(player_id, item_id, item_type, conn)
                    if not result['success']:
                        return {
                            'statusCode': 400,
                            'headers': cors_headers(),
                            'body': json.dumps({'error': result['error']})
                        }
                
                # Delete artifact
                cursor.execute("DELETE FROM artifacts WHERE id = %s", (item_id,))
            
            conn.commit()
            
            # Update cached bonuses (if item was equipped)
            update_cached_bonuses(player_id, conn)
            
            # Get updated bonuses
            bonuses = calculate_total_bonuses(player_id, conn)
            
            return {
                'statusCode': 200,
                'headers': cors_headers(),
                'body': json.dumps({
                    'success': True,
                    'dropped': {'id': item_id},
                    'newBonuses': bonuses
                })
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': str(e)})
        }


@require_auth
def sell_item_handler(event, context):
    """POST /api/inventory/sell - Sell item from backpack"""
    
    player_id = event['player']['player_id']
    
    try:
        body = json.loads(event.get('body', '{}'))
        item_id = body.get('itemId')
        item_type = body.get('itemType', 'equipment')
        
        if not item_id:
            return {
                'statusCode': 400,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'itemId is required'})
            }
        
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Get player reputation
            cursor.execute("SELECT reputation, balance FROM players WHERE id = %s", (player_id,))
            player = cursor.fetchone()
            reputation = player['reputation']
            balance = float(player['balance'])
            
            # Calculate price modifier
            price_multiplier = 1 + (reputation / 100) * 0.3
            
            if item_type == 'equipment':
                # Check if in backpack
                cursor.execute("""
                    SELECT pe.id, et.name, et.base_price, pe.slot_type
                    FROM player_equipment pe
                    JOIN equipment_types et ON pe.equipment_type_id = et.id
                    WHERE pe.id = %s AND pe.player_id = %s
                """, (item_id, player_id))
                
                item = cursor.fetchone()
                
                if not item:
                    return {
                        'statusCode': 404,
                        'headers': cors_headers(),
                        'body': json.dumps({'error': 'Item not found'})
                    }
                
                if item['slot_type'] != 'backpack':
                    return {
                        'statusCode': 400,
                        'headers': cors_headers(),
                        'body': json.dumps({'error': 'Item must be in backpack to sell. Unequip first.'})
                    }
                
                base_price = float(item['base_price'])
                sell_price = round(base_price * price_multiplier, 2)
                
                # Delete item
                cursor.execute("DELETE FROM player_equipment WHERE id = %s", (item_id,))
                
                item_name = item['name']
            
            elif item_type == 'artifact':
                # Check if in backpack
                cursor.execute("""
                    SELECT a.id, at.name, at.base_value, a.slot_type
                    FROM artifacts a
                    JOIN artifact_types at ON a.type_id = at.id
                    WHERE a.id = %s AND a.owner_id = %s
                """, (item_id, player_id))
                
                artifact = cursor.fetchone()
                
                if not artifact:
                    return {
                        'statusCode': 404,
                        'headers': cors_headers(),
                        'body': json.dumps({'error': 'Artifact not found'})
                    }
                
                if artifact['slot_type'] != 'backpack':
                    return {
                        'statusCode': 400,
                        'headers': cors_headers(),
                        'body': json.dumps({'error': 'Artifact must be in backpack to sell. Unequip first.'})
                    }
                
                base_price = float(artifact['base_value'])
                sell_price = round(base_price * price_multiplier, 2)
                
                # Delete artifact
                cursor.execute("DELETE FROM artifacts WHERE id = %s", (item_id,))
                
                item_name = artifact['name']
            
            else:
                return {
                    'statusCode': 400,
                    'headers': cors_headers(),
                    'body': json.dumps({'error': 'Invalid item type'})
                }
            
            # Add money to player
            new_balance = balance + sell_price
            cursor.execute("""
                UPDATE players
                SET balance = %s
                WHERE id = %s
            """, (new_balance, player_id))
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': cors_headers(),
                'body': json.dumps({
                    'success': True,
                    'sold': {
                        'id': item_id,
                        'name': item_name,
                        'basePrice': base_price
                    },
                    'priceReceived': sell_price,
                    'newBalance': new_balance
                })
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': str(e)})
        }
