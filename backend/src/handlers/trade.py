"""
Trade Handler
Handles trading operations between players and traders (NPC/Bartenders)
"""

import json
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from src.database import get_db
from src.middleware.auth import require_auth
from src.utils.geo import haversine_distance, get_effective_radius

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
}

SESSION_TIMEOUT_MINUTES = 5


@require_auth
def start_session_handler(event, context):
    """POST /api/trade/session/start - Start trade session"""
    try:
        player_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        
        trader_id = body.get('trader_id')
        player_lat = body.get('latitude')
        player_lon = body.get('longitude')
        accuracy = body.get('accuracy') or 0
        
        if not trader_id:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'MISSING_TRADER_ID'})
            }
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Check if player is alive
                cursor.execute("SELECT status FROM players WHERE id = %s", (player_id,))
                player = cursor.fetchone()
                if player and player['status'] == 'dead':
                    return {
                        'statusCode': 403,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'PLAYER_DEAD', 'message': 'Cannot trade while dead'})
                    }
                
                # Get trader info
                cursor.execute("""
                    SELECT id, name, type, latitude, longitude, 
                           interaction_radius, commission_buy_pct, 
                           commission_sell_pct, is_active
                    FROM traders
                    WHERE id = %s
                """, (trader_id,))
                
                trader = cursor.fetchone()
                
                if not trader:
                    return {
                        'statusCode': 404,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'TRADER_NOT_FOUND'})
                    }
                
                if not trader['is_active']:
                    return {
                        'statusCode': 403,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'TRADER_INACTIVE'})
                    }
                
                # Check distance for NPC traders
                if trader['type'] == 'npc':
                    if not player_lat or not player_lon:
                        return {
                            'statusCode': 400,
                            'headers': CORS_HEADERS,
                            'body': json.dumps({'error': 'MISSING_LOCATION'})
                        }
                    
                    distance = haversine_distance(
                        player_lat, player_lon,
                        float(trader['latitude']), float(trader['longitude'])
                    )
                    
                    # Use trader's interaction_radius with GPS accuracy compensation
                    effective_radius = get_effective_radius(
                        trader['interaction_radius'], accuracy, 'zone'
                    )
                    
                    if distance > effective_radius:
                        return {
                            'statusCode': 403,
                            'headers': CORS_HEADERS,
                            'body': json.dumps({
                                'error': 'TRADER_TOO_FAR',
                                'distance': round(distance, 2),
                                'max_distance': effective_radius
                            })
                        }
                
                # Create session
                session_id = str(uuid.uuid4())
                expires_at = datetime.utcnow() + timedelta(minutes=SESSION_TIMEOUT_MINUTES)
                
                cursor.execute("""
                    INSERT INTO trade_sessions 
                    (id, player_id, trader_id, status, expires_at)
                    VALUES (%s, %s, %s, 'pending', %s)
                """, (session_id, player_id, trader_id, expires_at))
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'trade_session_id': session_id,
                        'trader': {
                            'id': trader['id'],
                            'name': trader['name'],
                            'type': trader['type'],
                            'commission_buy_pct': trader['commission_buy_pct'],
                            'commission_sell_pct': trader['commission_sell_pct']
                        },
                        'expires_at': expires_at.isoformat() + 'Z'
                    })
                }
                
    except Exception as e:
        print(f"Error in start_session_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'INTERNAL_ERROR', 'message': str(e)})
        }


@require_auth
def get_catalog_handler(event, context):
    """GET /api/trade/catalog?trade_session_id={uuid} - Get trader's catalog"""
    try:
        player_id = event['player']['player_id']
        params = event.get('queryStringParameters', {}) or {}
        session_id = params.get('trade_session_id')
        
        if not session_id:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'MISSING_SESSION_ID'})
            }
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Validate session
                cursor.execute("""
                    SELECT trader_id, expires_at, status
                    FROM trade_sessions
                    WHERE id = %s AND player_id = %s
                """, (session_id, player_id))
                
                session = cursor.fetchone()
                
                if not session:
                    return {
                        'statusCode': 404,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'SESSION_NOT_FOUND'})
                    }
                
                if session['expires_at'] < datetime.utcnow():
                    return {
                        'statusCode': 403,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'SESSION_EXPIRED'})
                    }
                
                # Get trader commission
                cursor.execute("""
                    SELECT commission_buy_pct
                    FROM traders
                    WHERE id = %s
                """, (session['trader_id'],))
                
                trader = cursor.fetchone()
                commission = trader['commission_buy_pct']
                
                # Get catalog items
                cursor.execute("""
                    SELECT 
                        i.id as item_def_id,
                        i.name,
                        i.description,
                        i.image_url,
                        i.type,
                        i.base_price,
                        i.is_stackable,
                        i.extra_lives,
                        i.wounds_protection,
                        i.radiation_resistance,
                        i.anti_radiation
                    FROM item_definitions i
                    JOIN trader_inventory ti ON i.id = ti.item_def_id
                    WHERE ti.trader_id = %s 
                      AND ti.is_available = TRUE
                      AND i.is_active = TRUE
                    ORDER BY i.type, i.name
                """, (session['trader_id'],))
                
                items = []
                for row in cursor.fetchall():
                    buy_price = round(row['base_price'] * (1 + commission / 100))
                    items.append({
                        'item_def_id': row['item_def_id'],
                        'name': row['name'],
                        'description': row['description'],
                        'image_url': row['image_url'],
                        'type': row['type'],
                        'base_price': row['base_price'],
                        'buy_price': buy_price,
                        'is_stackable': bool(row['is_stackable']),
                        'extra_lives': row['extra_lives'],
                        'wounds_protection': row['wounds_protection'],
                        'radiation_resistance': row['radiation_resistance'],
                        'anti_radiation': row['anti_radiation']
                    })
                
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'items': items})
                }
                
    except Exception as e:
        print(f"Error in get_catalog_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'INTERNAL_ERROR', 'message': str(e)})
        }


@require_auth
def get_backpack_handler(event, context):
    """GET /api/trade/backpack?trade_session_id={uuid} - Get player's backpack for selling"""
    try:
        player_id = event['player']['player_id']
        params = event.get('queryStringParameters', {}) or {}
        session_id = params.get('trade_session_id')
        
        if not session_id:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'MISSING_SESSION_ID'})
            }
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Validate session
                cursor.execute("""
                    SELECT trader_id, expires_at, status
                    FROM trade_sessions
                    WHERE id = %s AND player_id = %s
                """, (session_id, player_id))
                
                session = cursor.fetchone()
                
                if not session:
                    return {
                        'statusCode': 404,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'SESSION_NOT_FOUND'})
                    }
                
                if session['expires_at'] < datetime.utcnow():
                    return {
                        'statusCode': 403,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'SESSION_EXPIRED'})
                    }
                
                # Check player is alive
                cursor.execute("SELECT status FROM players WHERE id = %s", (player_id,))
                player_status = cursor.fetchone()['status']
                
                if player_status == 'dead':
                    return {
                        'statusCode': 403,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'PLAYER_DEAD_SELL_FORBIDDEN'})
                    }
                
                # Get trader commission
                cursor.execute("""
                    SELECT commission_sell_pct
                    FROM traders
                    WHERE id = %s
                """, (session['trader_id'],))
                
                trader = cursor.fetchone()
                commission = trader['commission_sell_pct']
                
                # Get backpack items (consumables from item_definitions)
                cursor.execute("""
                    SELECT 
                        pi.id as item_id,
                        pi.item_id as item_def_id,
                        i.name,
                        i.description,
                        i.image_url,
                        i.type,
                        i.base_price,
                        i.is_sellable,
                        i.is_stackable,
                        i.is_physical,
                        i.extra_lives,
                        i.wounds_protection,
                        i.radiation_resistance,
                        i.anti_radiation,
                        pi.quantity,
                        'consumable' as source_type
                    FROM player_inventory pi
                    JOIN item_definitions i ON pi.item_id = i.id
                    WHERE pi.player_id = %s 
                      AND pi.slot_type = 'backpack'
                      AND pi.item_type = 'consumable'
                """, (player_id,))
                
                consumables = cursor.fetchall()
                
                # Get artifacts from backpack (from player_inventory)
                cursor.execute("""
                    SELECT 
                        pi.id as item_id,
                        pi.item_id as item_def_id,
                        at.name,
                        at.description,
                        at.image_url,
                        at.base_value as base_price,
                        at.bonus_lives,
                        at.radiation_resist,
                        1 as quantity,
                        'artifact' as source_type
                    FROM player_inventory pi
                    JOIN artifact_types at ON pi.item_id = at.id
                    WHERE pi.player_id = %s 
                      AND pi.item_type = 'artifact'
                      AND pi.slot_type = 'backpack'
                """, (player_id,))
                
                artifacts = cursor.fetchall()
                
                # Combine and format items
                items = []
                
                # Add consumables
                for row in consumables:
                    sell_price = round(row['base_price'] * (1 - commission / 100))
                    items.append({
                        'item_id': str(row['item_id']),
                        'item_def_id': row['item_def_id'],
                        'name': row['name'],
                        'description': row.get('description') or '',
                        'image_url': row.get('image_url'),
                        'type': row['type'],
                        'base_price': row['base_price'],
                        'sell_price': sell_price,
                        'is_sellable': bool(row['is_sellable']),
                        'is_stackable': bool(row['is_stackable']),
                        'is_physical': bool(row.get('is_physical')),
                        'quantity': row['quantity'],
                        'extra_lives': row.get('extra_lives') or 0,
                        'wounds_protection': row.get('wounds_protection') or 0,
                        'radiation_resistance': row.get('radiation_resistance') or 0,
                        'anti_radiation': row.get('anti_radiation') or 0
                    })
                
                # Add artifacts
                for row in artifacts:
                    sell_price = round(float(row['base_price']) * (1 - commission / 100))
                    items.append({
                        'item_id': str(row['item_id']),
                        'item_def_id': row['item_def_id'],
                        'name': row['name'],
                        'description': row.get('description') or '',
                        'image_url': row.get('image_url'),
                        'type': 'artifact',
                        'base_price': float(row['base_price']),
                        'sell_price': sell_price,
                        'is_sellable': True,
                        'is_stackable': False,
                        'is_physical': False,
                        'quantity': 1,
                        'extra_lives': row.get('bonus_lives') or 0,
                        'radiation_resistance': row.get('radiation_resist') or 0,
                        'wounds_protection': 0,
                        'anti_radiation': 0
                    })
                
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'items': items})
                }
                
    except Exception as e:
        print(f"Error in get_backpack_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'INTERNAL_ERROR', 'message': str(e)})
        }



@require_auth
def buy_handler(event, context):
    """POST /api/trade/buy - Execute buy transaction"""
    try:
        player_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        
        session_id = body.get('trade_session_id')
        items = body.get('items', [])
        
        if not session_id or not items:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'MISSING_REQUIRED_FIELDS'})
            }
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Validate session
                cursor.execute("""
                    SELECT trader_id, expires_at, status
                    FROM trade_sessions
                    WHERE id = %s AND player_id = %s
                """, (session_id, player_id))
                
                session = cursor.fetchone()
                
                if not session:
                    return {
                        'statusCode': 404,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'SESSION_NOT_FOUND'})
                    }
                
                if session['expires_at'] < datetime.utcnow():
                    return {
                        'statusCode': 403,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'SESSION_EXPIRED'})
                    }
                
                if session['status'] != 'pending':
                    # Idempotency: return previous result
                    cursor.execute("""
                        SELECT result, error_code, total_amount
                        FROM trade_transactions
                        WHERE trade_session_id = %s
                    """, (session_id,))
                    
                    prev = cursor.fetchone()
                    if prev:
                        if prev['result'] == 'success':
                            return {
                                'statusCode': 200,
                                'headers': CORS_HEADERS,
                                'body': json.dumps({
                                    'success': True,
                                    'total_amount': prev['total_amount']
                                })
                            }
                        else:
                            return {
                                'statusCode': 400,
                                'headers': CORS_HEADERS,
                                'body': json.dumps({'error': prev['error_code']})
                            }
                
                # Get trader commission
                cursor.execute("""
                    SELECT commission_buy_pct
                    FROM traders
                    WHERE id = %s
                """, (session['trader_id'],))
                
                trader = cursor.fetchone()
                commission = trader['commission_buy_pct']
                
                # Validate items and calculate total
                total_amount = 0
                lines = []
                slots_needed = 0
                
                for item in items:
                    item_def_id = item.get('item_def_id')
                    quantity = item.get('quantity', 1)
                    
                    if quantity <= 0:
                        continue
                    
                    # Get item info
                    cursor.execute("""
                        SELECT i.base_price, i.is_stackable, i.name
                        FROM item_definitions i
                        JOIN trader_inventory ti ON i.id = ti.item_def_id
                        WHERE i.id = %s 
                          AND ti.trader_id = %s
                          AND ti.is_available = TRUE
                          AND i.is_active = TRUE
                    """, (item_def_id, session['trader_id']))
                    
                    item_info = cursor.fetchone()
                    
                    if not item_info:
                        return {
                            'statusCode': 400,
                            'headers': CORS_HEADERS,
                            'body': json.dumps({'error': 'INVALID_ITEM'})
                        }
                    
                    unit_price = round(item_info['base_price'] * (1 + commission / 100))
                    total_amount += unit_price * quantity
                    
                    lines.append({
                        'item_def_id': item_def_id,
                        'name': item_info['name'],
                        'quantity': quantity,
                        'unit_price': unit_price
                    })
                    
                    # Calculate slots needed (1 slot per item type, quantity stored in field)
                    cursor.execute("""
                        SELECT id FROM player_inventory
                        WHERE player_id = %s AND item_id = %s AND item_type = 'consumable'
                    """, (player_id, item_def_id))
                    
                    if not cursor.fetchone():
                        slots_needed += 1
                
                # Check player balance
                cursor.execute("""
                    SELECT balance, backpack_capacity
                    FROM players
                    WHERE id = %s
                """, (player_id,))
                
                player_data = cursor.fetchone()
                
                if float(player_data['balance']) < total_amount:
                    # Record failed transaction
                    transaction_id = str(uuid.uuid4())
                    cursor.execute("""
                        INSERT INTO trade_transactions
                        (id, trade_session_id, type, player_id, trader_id, 
                         total_amount, lines_json, result, error_code)
                        VALUES (%s, %s, 'buy', %s, %s, %s, %s, 'failed', 'INSUFFICIENT_FUNDS')
                    """, (transaction_id, session_id, player_id, 
                          session['trader_id'], total_amount, json.dumps(lines)))
                    
                    cursor.execute("""
                        UPDATE trade_sessions SET status = 'failed' WHERE id = %s
                    """, (session_id,))
                    
                    conn.commit()
                    
                    return {
                        'statusCode': 400,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'INSUFFICIENT_FUNDS'})
                    }
                
                # Check backpack space
                cursor.execute("""
                    SELECT COUNT(*) as used_slots
                    FROM player_inventory
                    WHERE player_id = %s AND slot_type = 'backpack'
                """, (player_id,))
                
                used_slots = cursor.fetchone()['used_slots']
                free_slots = player_data['backpack_capacity'] - used_slots
                
                if slots_needed > free_slots:
                    # Record failed transaction
                    transaction_id = str(uuid.uuid4())
                    cursor.execute("""
                        INSERT INTO trade_transactions
                        (id, trade_session_id, type, player_id, trader_id, 
                         total_amount, lines_json, result, error_code)
                        VALUES (%s, %s, 'buy', %s, %s, %s, %s, 'failed', 'INVENTORY_FULL')
                    """, (transaction_id, session_id, player_id, 
                          session['trader_id'], total_amount, json.dumps(lines)))
                    
                    cursor.execute("""
                        UPDATE trade_sessions SET status = 'failed' WHERE id = %s
                    """, (session_id,))
                    
                    conn.commit()
                    
                    return {
                        'statusCode': 400,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({
                            'error': 'INVENTORY_FULL',
                            'slots_needed': slots_needed,
                            'free_slots': free_slots
                        })
                    }
                
                # Execute transaction
                # 1. Deduct money
                cursor.execute("""
                    UPDATE players
                    SET balance = balance - %s
                    WHERE id = %s
                """, (total_amount, player_id))
                
                # 2. Add items to player_inventory
                for line in lines:
                    # Check if item already exists (regardless of stackable)
                    cursor.execute("""
                        SELECT id, quantity FROM player_inventory
                        WHERE player_id = %s AND item_id = %s AND item_type = 'consumable'
                    """, (player_id, line['item_def_id']))
                    
                    existing = cursor.fetchone()
                    if existing:
                        # Update quantity
                        cursor.execute("""
                            UPDATE player_inventory
                            SET quantity = quantity + %s
                            WHERE id = %s
                        """, (line['quantity'], existing['id']))
                    else:
                        # Insert new
                        cursor.execute("""
                            INSERT INTO player_inventory
                            (player_id, item_type, item_id, slot_type, quantity)
                            VALUES (%s, 'consumable', %s, 'backpack', %s)
                        """, (player_id, line['item_def_id'], line['quantity']))
                
                # 3. Record transaction
                transaction_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO trade_transactions
                    (id, trade_session_id, type, player_id, trader_id, 
                     total_amount, lines_json, result)
                    VALUES (%s, %s, 'buy', %s, %s, %s, %s, 'success')
                """, (transaction_id, session_id, player_id, 
                      session['trader_id'], total_amount, json.dumps(lines)))
                
                # 4. Update session
                cursor.execute("""
                    UPDATE trade_sessions SET status = 'success' WHERE id = %s
                """, (session_id,))
                
                # Get new balance
                cursor.execute("""
                    SELECT balance FROM players WHERE id = %s
                """, (player_id,))
                
                new_balance = float(cursor.fetchone()['balance'])
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'success': True,
                        'transaction_id': transaction_id,
                        'total_amount': total_amount,
                        'new_balance': new_balance,
                        'items_added': lines
                    })
                }
                
    except Exception as e:
        print(f"Error in buy_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'INTERNAL_ERROR', 'message': str(e)})
        }


@require_auth
def sell_handler(event, context):
    """POST /api/trade/sell - Execute sell transaction"""
    try:
        player_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        
        session_id = body.get('trade_session_id')
        items = body.get('items', [])
        
        if not session_id or not items:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'MISSING_REQUIRED_FIELDS'})
            }
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Validate session
                cursor.execute("""
                    SELECT trader_id, expires_at, status
                    FROM trade_sessions
                    WHERE id = %s AND player_id = %s
                """, (session_id, player_id))
                
                session = cursor.fetchone()
                
                if not session:
                    return {
                        'statusCode': 404,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'SESSION_NOT_FOUND'})
                    }
                
                if session['expires_at'] < datetime.utcnow():
                    return {
                        'statusCode': 403,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'SESSION_EXPIRED'})
                    }
                
                # Check player is alive
                cursor.execute("SELECT status FROM players WHERE id = %s", (player_id,))
                player_status = cursor.fetchone()['status']
                
                if player_status == 'dead':
                    return {
                        'statusCode': 403,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'PLAYER_DEAD_SELL_FORBIDDEN'})
                    }
                
                # Get trader commission
                cursor.execute("""
                    SELECT commission_sell_pct
                    FROM traders
                    WHERE id = %s
                """, (session['trader_id'],))
                
                trader = cursor.fetchone()
                commission = trader['commission_sell_pct']
                
                # Validate items and calculate total
                total_amount = 0
                lines = []
                
                for item in items:
                    item_id = item.get('item_id')
                    quantity = item.get('quantity', 1)
                    
                    if quantity <= 0:
                        continue
                    
                    # Try to get consumable from player_inventory
                    cursor.execute("""
                        SELECT 
                            pi.quantity as available_qty,
                            pi.item_id as item_def_id,
                            i.name,
                            i.base_price,
                            i.is_sellable,
                            i.is_stackable,
                            'consumable' as item_type
                        FROM player_inventory pi
                        JOIN item_definitions i ON pi.item_id = i.id
                        WHERE pi.id = %s AND pi.player_id = %s AND pi.item_type = 'consumable'
                    """, (item_id, player_id))
                    
                    item_info = cursor.fetchone()
                    
                    # If not found, try artifact from player_inventory
                    if not item_info:
                        cursor.execute("""
                            SELECT 
                                1 as available_qty,
                                pi.item_id as item_def_id,
                                at.name,
                                at.base_value as base_price,
                                TRUE as is_sellable,
                                FALSE as is_stackable,
                                'artifact' as item_type
                            FROM player_inventory pi
                            JOIN artifact_types at ON pi.item_id = at.id
                            WHERE pi.id = %s AND pi.player_id = %s 
                              AND pi.item_type = 'artifact'
                              AND pi.slot_type = 'backpack'
                        """, (item_id, player_id))
                        
                        item_info = cursor.fetchone()
                    
                    if not item_info:
                        return {
                            'statusCode': 400,
                            'headers': CORS_HEADERS,
                            'body': json.dumps({'error': 'ITEM_NOT_IN_BACKPACK'})
                        }
                    
                    if not item_info['is_sellable']:
                        return {
                            'statusCode': 400,
                            'headers': CORS_HEADERS,
                            'body': json.dumps({'error': 'ITEM_NOT_SELLABLE'})
                        }
                    
                    if quantity > item_info['available_qty']:
                        return {
                            'statusCode': 400,
                            'headers': CORS_HEADERS,
                            'body': json.dumps({'error': 'INVALID_QUANTITY'})
                        }
                    
                    unit_price = round(item_info['base_price'] * (1 - commission / 100))
                    total_amount += unit_price * quantity
                    
                    lines.append({
                        'item_id': item_id,
                        'item_def_id': item_info['item_def_id'],
                        'name': item_info['name'],
                        'quantity': quantity,
                        'unit_price': unit_price,
                        'is_stackable': item_info['is_stackable'],
                        'item_type': item_info['item_type']
                    })
                
                # Execute transaction
                # 1. Remove items from inventory
                for line in lines:
                    if line['item_type'] == 'artifact':
                        # Delete artifact from player_inventory
                        cursor.execute("""
                            DELETE FROM player_inventory WHERE id = %s
                        """, (line['item_id'],))
                    else:
                        # Handle consumable from player_inventory
                        cursor.execute("""
                            SELECT quantity FROM player_inventory WHERE id = %s
                        """, (line['item_id'],))
                        
                        current_qty = cursor.fetchone()['quantity']
                        
                        if current_qty <= line['quantity']:
                            # Delete if selling all
                            cursor.execute("""
                                DELETE FROM player_inventory WHERE id = %s
                            """, (line['item_id'],))
                        else:
                            # Decrease quantity
                            cursor.execute("""
                                UPDATE player_inventory
                                SET quantity = quantity - %s
                                WHERE id = %s
                            """, (line['quantity'], line['item_id']))
                
                # 2. Add money
                cursor.execute("""
                    UPDATE players
                    SET balance = balance + %s
                    WHERE id = %s
                """, (total_amount, player_id))
                
                # 3. Record transaction
                transaction_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO trade_transactions
                    (id, trade_session_id, type, player_id, trader_id, 
                     total_amount, lines_json, result)
                    VALUES (%s, %s, 'sell', %s, %s, %s, %s, 'success')
                """, (transaction_id, session_id, player_id, 
                      session['trader_id'], total_amount, json.dumps(lines)))
                
                # 4. Update session
                cursor.execute("""
                    UPDATE trade_sessions SET status = 'success' WHERE id = %s
                """, (session_id,))
                
                # Get new balance
                cursor.execute("""
                    SELECT balance FROM players WHERE id = %s
                """, (player_id,))
                
                new_balance = float(cursor.fetchone()['balance'])
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'success': True,
                        'transaction_id': transaction_id,
                        'total_amount': total_amount,
                        'new_balance': new_balance,
                        'items_removed': lines
                    })
                }
                
    except Exception as e:
        print(f"Error in sell_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'INTERNAL_ERROR', 'message': str(e)})
        }


@require_auth
def redeem_handler(event, context):
    """POST /api/trade/redeem - Redeem food/drink item"""
    try:
        player_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        
        item_id = body.get('item_id')
        
        if not item_id:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'MISSING_ITEM_ID'})
            }
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Get item info from player_inventory
                cursor.execute("""
                    SELECT 
                        pi.id,
                        i.name,
                        i.type
                    FROM player_inventory pi
                    JOIN item_definitions i ON pi.item_id = i.id
                    WHERE pi.id = %s AND pi.player_id = %s AND pi.item_type = 'consumable'
                """, (item_id, player_id))
                
                item = cursor.fetchone()
                
                if not item:
                    return {
                        'statusCode': 404,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'ITEM_NOT_FOUND'})
                    }
                
                if item['type'] not in ('food', 'drink'):
                    return {
                        'statusCode': 400,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'ITEM_NOT_REDEEMABLE'})
                    }
                    return {
                        'statusCode': 400,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'ALREADY_REDEEMED'})
                    }
                
                # Mark as redeemed
                redeem_code = str(uuid.uuid4())[:8].upper()
                
                # Delete item from inventory (redeemed = consumed)
                cursor.execute("""
                    DELETE FROM player_inventory
                    WHERE id = %s
                """, (item_id,))
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'success': True,
                        'item': {
                            'name': item['name'],
                            'type': item['type']
                        },
                        'redeem_code': redeem_code,
                        'message': 'Show this code to the bartender'
                    })
                }
                
    except Exception as e:
        print(f"Error in redeem_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'INTERNAL_ERROR', 'message': str(e)})
        }



def get_traders_handler(event, context):
    """GET /api/traders - Get list of active traders"""
    try:
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        id, name, type, latitude, longitude,
                        interaction_radius, is_active
                    FROM traders
                    WHERE is_active = TRUE
                    ORDER BY type, name
                """)
                
                traders = []
                for row in cursor.fetchall():
                    traders.append({
                        'id': row['id'],
                        'name': row['name'],
                        'type': row['type'],
                        'latitude': float(row['latitude']) if row['latitude'] else None,
                        'longitude': float(row['longitude']) if row['longitude'] else None,
                        'interaction_radius': row['interaction_radius'],
                        'is_active': bool(row['is_active'])
                    })
                
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'traders': traders
                    })
                }
                
    except Exception as e:
        print(f"Error in get_traders_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'INTERNAL_ERROR', 'message': str(e)})
        }


@require_auth
def get_trader_quests_handler(event, context):
    """GET /api/traders/{id}/quests - Get quests available from trader"""
    try:
        trader_id = event['pathParameters']['id']
        player_id = event['player']['player_id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Get trader info
                cursor.execute("""
                    SELECT latitude, longitude, interaction_radius 
                    FROM traders WHERE id = %s AND is_active = 1
                """, (trader_id,))
                trader = cursor.fetchone()
                
                if not trader:
                    return {
                        'statusCode': 404,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'TRADER_NOT_FOUND', 'message': 'Trader not found'})
                    }
                
                # Get player location and faction
                cursor.execute("""
                    SELECT p.faction, pl.latitude, pl.longitude, pl.accuracy 
                    FROM players p
                    LEFT JOIN player_locations pl ON p.id = pl.player_id
                    WHERE p.id = %s
                """, (player_id,))
                player = cursor.fetchone()
                player_faction = player['faction'] if player else None
                
                # Check distance if trader has location
                if trader['latitude'] and trader['longitude'] and player['latitude']:
                    accuracy = player.get('accuracy') or 0
                    distance = haversine_distance(
                        float(player['latitude']), float(player['longitude']),
                        float(trader['latitude']), float(trader['longitude'])
                    )
                    effective_radius = get_effective_radius(
                        trader['interaction_radius'], accuracy, 'zone'
                    )
                    if distance > effective_radius:
                        return {
                            'statusCode': 403,
                            'headers': CORS_HEADERS,
                            'body': json.dumps({
                                'error': 'TOO_FAR',
                                'message': f'Too far from trader ({int(distance)}m, need ≤{int(effective_radius)}m)'
                            })
                        }
                
                # Get quests assigned to this trader
                cursor.execute("""
                    SELECT c.id, c.title, c.description, c.quest_type, 
                           c.reward, c.reward_reputation, c.reward_item_id,
                           c.faction_restriction, c.faction_restrictions, c.expires_at, c.quest_data,
                           i.name as reward_item_name
                    FROM trader_quests tq
                    JOIN contracts c ON tq.quest_id = c.id
                    LEFT JOIN item_definitions i ON c.reward_item_id = i.id
                    WHERE tq.trader_id = %s 
                      AND tq.is_active = 1
                      AND c.status = 'available'
                      AND c.quest_type IS NOT NULL
                      AND (c.expires_at IS NULL OR c.expires_at > NOW())
                    ORDER BY c.reward DESC
                """, (trader_id,))
                
                quests = []
                for q in cursor.fetchall():
                    # Check faction restrictions
                    if q['faction_restrictions']:
                        allowed = json.loads(q['faction_restrictions'])
                        if player_faction not in allowed:
                            continue
                    elif q['faction_restriction'] and q['faction_restriction'] != player_faction:
                        continue
                    
                    quest_data = json.loads(q['quest_data']) if q['quest_data'] else {}
                    quests.append({
                        'id': q['id'],
                        'title': q['title'],
                        'description': q['description'],
                        'questType': q['quest_type'],
                        'reward': float(q['reward']) if q['reward'] else 0,
                        'rewardReputation': q['reward_reputation'] or 0,
                        'rewardItemId': q['reward_item_id'],
                        'rewardItemName': q['reward_item_name'],
                        'expiresAt': q['expires_at'].isoformat() + 'Z' if q['expires_at'] else None,
                        'objectives': quest_data
                    })
                
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'quests': quests})
                }
                
    except Exception as e:
        print(f"Error in get_trader_quests_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'INTERNAL_ERROR', 'message': str(e)})
        }
