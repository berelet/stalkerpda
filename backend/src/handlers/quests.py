"""
Quest handlers - Enhanced contracts with progress tracking
"""
import json
import uuid
from datetime import datetime
from src.database import get_db
from src.middleware.auth import require_auth, require_gm
from src.utils.quest import log_quest_event
from src.utils.reputation import add_reputation

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
}

MAX_ACTIVE_QUESTS = 5


def _format_quest(q):
    """Format quest for API response"""
    return {
        'id': q['id'],
        'type': q['type'],
        'questType': q['quest_type'],
        'title': q['title'],
        'description': q['description'],
        'reward': float(q['reward']),
        'status': q['status'],
        'failed': bool(q['failed']),
        'failedReason': q['failed_reason'],
        'autoComplete': bool(q['auto_complete']),
        'questData': json.loads(q['quest_data']) if q['quest_data'] else None,
        'issuer': {
            'id': q['issuer_id'],
            'nickname': q.get('issuer_nickname') or q.get('trader_name')
        },
        'factionRestriction': q['faction_restriction'],
        'expiresAt': q['expires_at'].isoformat() + 'Z' if q['expires_at'] else None,
        'acceptedAt': q['accepted_at'].isoformat() + 'Z' if q['accepted_at'] else None,
        'createdAt': q['created_at'].isoformat() + 'Z' if q['created_at'] else None
    }


@require_auth
def list_available_handler(event, context):
    """GET /api/quests - List available quests"""
    try:
        player_id = event['player']['player_id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT faction FROM players WHERE id = %s", (player_id,))
                player = cursor.fetchone()
                
                cursor.execute("""
                    SELECT c.*, 
                           COALESCE(p.nickname, t.name) as issuer_nickname,
                           t.name as trader_name
                    FROM contracts c
                    LEFT JOIN players p ON c.issuer_id = p.id
                    LEFT JOIN traders t ON c.issuer_id = t.id
                    WHERE c.status = 'available'
                      AND c.quest_type IS NOT NULL
                      AND (c.faction_restriction IS NULL OR c.faction_restriction = %s)
                      AND c.available_at <= NOW()
                      AND (c.expires_at IS NULL OR c.expires_at > NOW())
                    ORDER BY c.created_at DESC
                """, (player['faction'],))
                quests = cursor.fetchall()
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'quests': [_format_quest(q) for q in quests]})
        }
    except Exception as e:
        return {'statusCode': 500, 'headers': CORS_HEADERS,
                'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})}


@require_auth
def list_active_handler(event, context):
    """GET /api/quests/active - List player's active quests"""
    try:
        player_id = event['player']['player_id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT c.*, 
                           COALESCE(p.nickname, t.name) as issuer_nickname,
                           t.name as trader_name
                    FROM contracts c
                    LEFT JOIN players p ON c.issuer_id = p.id
                    LEFT JOIN traders t ON c.issuer_id = t.id
                    WHERE c.accepted_by = %s
                      AND c.status = 'accepted'
                      AND c.failed = 0
                    ORDER BY c.accepted_at DESC
                """, (player_id,))
                quests = cursor.fetchall()
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'quests': [_format_quest(q) for q in quests]})
        }
    except Exception as e:
        return {'statusCode': 500, 'headers': CORS_HEADERS,
                'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})}


@require_auth
def list_completed_handler(event, context):
    """GET /api/quests/completed - List player's quest history with pagination"""
    try:
        player_id = event['player']['player_id']
        params = event.get('queryStringParameters') or {}
        
        # Pagination
        page = int(params.get('page', 1))
        limit = 20
        offset = (page - 1) * limit
        
        # Filter: all, completed, failed
        filter_type = params.get('filter', 'all')
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Build WHERE clause
                where = "c.accepted_by = %s AND c.status != 'available' AND c.status != 'accepted'"
                where_params = [player_id]
                
                if filter_type == 'completed':
                    where += " AND c.status = 'completed'"
                elif filter_type == 'failed':
                    where += " AND c.failed = 1"
                
                # Get total count
                cursor.execute(f"SELECT COUNT(*) as total FROM contracts c WHERE {where}", where_params)
                total = cursor.fetchone()['total']
                
                # Get quests
                cursor.execute(f"""
                    SELECT c.*, 
                           COALESCE(p.nickname, t.name) as issuer_nickname,
                           t.name as trader_name
                    FROM contracts c
                    LEFT JOIN players p ON c.issuer_id = p.id
                    LEFT JOIN traders t ON c.issuer_id = t.id
                    WHERE {where}
                    ORDER BY COALESCE(c.completed_at, c.accepted_at) DESC
                    LIMIT %s OFFSET %s
                """, where_params + [limit, offset])
                quests = cursor.fetchall()
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'quests': [_format_quest(q) for q in quests],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'pages': (total + limit - 1) // limit
                }
            })
        }
    except Exception as e:
        return {'statusCode': 500, 'headers': CORS_HEADERS,
                'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})}


@require_auth
def get_quest_handler(event, context):
    """GET /api/quests/{id} - Get quest details"""
    try:
        quest_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT c.*, 
                           COALESCE(p.nickname, t.name) as issuer_nickname,
                           t.name as trader_name
                    FROM contracts c
                    LEFT JOIN players p ON c.issuer_id = p.id
                    LEFT JOIN traders t ON c.issuer_id = t.id
                    WHERE c.id = %s
                """, (quest_id,))
                quest = cursor.fetchone()
        
        if not quest:
            return {'statusCode': 404, 'headers': CORS_HEADERS,
                    'body': json.dumps({'error': {'code': 'NOT_FOUND', 'message': 'Quest not found'}})}
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'quest': _format_quest(quest)})
        }
    except Exception as e:
        return {'statusCode': 500, 'headers': CORS_HEADERS,
                'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})}


@require_auth
def accept_handler(event, context):
    """POST /api/quests/{id}/accept - Accept quest"""
    try:
        player_id = event['player']['player_id']
        quest_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Check active quests limit
                cursor.execute("""
                    SELECT COUNT(*) as cnt FROM contracts 
                    WHERE accepted_by = %s AND status = 'accepted' AND failed = 0
                """, (player_id,))
                if cursor.fetchone()['cnt'] >= MAX_ACTIVE_QUESTS:
                    return {'statusCode': 400, 'headers': CORS_HEADERS,
                            'body': json.dumps({'error': {'code': 'MAX_QUESTS', 'message': f'Max {MAX_ACTIVE_QUESTS} active quests'}})}
                
                # Get player faction
                cursor.execute("SELECT faction FROM players WHERE id = %s", (player_id,))
                player = cursor.fetchone()
                
                # Get quest template
                cursor.execute("""
                    SELECT * FROM contracts 
                    WHERE id = %s 
                      AND status = 'available'
                      AND (faction_restriction IS NULL OR faction_restriction = %s)
                      AND (expires_at IS NULL OR expires_at > NOW())
                """, (quest_id, player['faction']))
                quest = cursor.fetchone()
                
                if not quest:
                    return {'statusCode': 409, 'headers': CORS_HEADERS,
                            'body': json.dumps({'error': {'code': 'CONFLICT', 'message': 'Quest not available'}})}
                
                # Check if player already has this quest active
                cursor.execute("""
                    SELECT id FROM contracts 
                    WHERE accepted_by = %s AND status = 'accepted' AND failed = 0
                      AND title = %s AND quest_type = %s
                """, (player_id, quest['title'], quest['quest_type']))
                if cursor.fetchone():
                    return {'statusCode': 409, 'headers': CORS_HEADERS,
                            'body': json.dumps({'error': {'code': 'ALREADY_ACTIVE', 'message': 'You already have this quest active'}})}
                
                # Create player's copy of quest with fresh progress
                quest_data = json.loads(quest['quest_data']) if quest['quest_data'] else {}
                # Reset progress
                if 'current_count' in quest_data:
                    quest_data['current_count'] = 0
                if 'visited' in quest_data:
                    quest_data['visited'] = False
                if 'checkpoints' in quest_data:
                    for cp in quest_data['checkpoints']:
                        cp['visited'] = False
                if 'accumulated_time_seconds' in quest_data:
                    quest_data['accumulated_time_seconds'] = 0
                if 'checkpoint_visits' in quest_data:
                    quest_data['checkpoint_visits'] = []
                
                player_quest_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO contracts (id, type, quest_type, issuer_id, title, description, reward,
                                          escrow_amount, quest_data, auto_complete, faction_restriction,
                                          status, accepted_by, accepted_at, expires_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 0, %s, %s, %s, 'accepted', %s, NOW(), %s)
                """, (player_quest_id, quest['quest_type'], quest['quest_type'], quest['issuer_id'],
                      quest['title'], quest['description'], quest['reward'], json.dumps(quest_data),
                      quest['auto_complete'], quest['faction_restriction'], player_id, quest['expires_at']))
                
                log_quest_event(cursor, player_quest_id, player_id, 'accepted')
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'success': True, 'questId': player_quest_id})
        }
    except Exception as e:
        return {'statusCode': 500, 'headers': CORS_HEADERS,
                'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})}


@require_auth
def claim_handler(event, context):
    """POST /api/quests/{id}/claim - Claim quest completion (for manual quests)"""
    try:
        player_id = event['player']['player_id']
        quest_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    UPDATE contracts 
                    SET status = 'in_progress'
                    WHERE id = %s AND accepted_by = %s AND status = 'accepted' AND auto_complete = 0
                """, (quest_id, player_id))
                
                if cursor.rowcount == 0:
                    return {'statusCode': 400, 'headers': CORS_HEADERS,
                            'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'Cannot claim this quest'}})}
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'success': True, 'awaitingConfirmation': True})
        }
    except Exception as e:
        return {'statusCode': 500, 'headers': CORS_HEADERS,
                'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})}


@require_auth
def cancel_handler(event, context):
    """POST /api/quests/{id}/cancel - Cancel quest"""
    try:
        player_id = event['player']['player_id']
        quest_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    UPDATE contracts 
                    SET status = 'available', accepted_by = NULL, accepted_at = NULL,
                        quest_data = JSON_SET(COALESCE(quest_data, '{}'), '$.current_count', 0)
                    WHERE id = %s AND accepted_by = %s AND status = 'accepted'
                """, (quest_id, player_id))
                
                if cursor.rowcount == 0:
                    return {'statusCode': 400, 'headers': CORS_HEADERS,
                            'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'Cannot cancel this quest'}})}
                
                log_quest_event(cursor, quest_id, player_id, 'cancelled')
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'success': True})
        }
    except Exception as e:
        return {'statusCode': 500, 'headers': CORS_HEADERS,
                'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})}


@require_auth
def create_handler(event, context):
    """POST /api/quests/create - Create quest (bartenders only)"""
    try:
        player_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Check bartender role
                cursor.execute("SELECT is_bartender FROM player_roles WHERE player_id = %s", (player_id,))
                role = cursor.fetchone()
                if not role or not role['is_bartender']:
                    return {'statusCode': 403, 'headers': CORS_HEADERS,
                            'body': json.dumps({'error': {'code': 'FORBIDDEN', 'message': 'Bartender role required'}})}
                
                quest_id = str(uuid.uuid4())
                quest_type = body.get('questType')
                
                # Build quest_data based on type
                quest_data = {}
                if quest_type == 'elimination':
                    quest_data = {'target_faction': body.get('targetFaction'), 'target_count': body.get('targetCount', 1), 'current_count': 0}
                elif quest_type == 'artifact_collection':
                    quest_data = {'artifact_type_id': body.get('artifactTypeId'), 'target_count': body.get('targetCount', 1), 'current_count': 0}
                elif quest_type == 'visit':
                    quest_data = {'target_lat': body.get('targetLat'), 'target_lng': body.get('targetLng'), 'target_radius': body.get('targetRadius', 20), 'visited': False}
                elif quest_type == 'patrol':
                    quest_data = {'checkpoints': body.get('checkpoints', []), 'required_time_minutes': body.get('requiredTimeMinutes', 15), 'accumulated_time_seconds': 0, 'checkpoint_visits': []}
                elif quest_type == 'delivery':
                    quest_data = {'item_id': body.get('itemId'), 'delivery_lat': body.get('deliveryLat'), 'delivery_lng': body.get('deliveryLng'), 'delivery_radius': body.get('deliveryRadius', 10)}
                
                cursor.execute("""
                    INSERT INTO contracts (id, type, quest_type, issuer_id, title, description, reward, 
                                          escrow_amount, quest_data, auto_complete, faction_restriction, expires_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 0, %s, %s, %s, %s)
                """, (quest_id, quest_type, quest_type, player_id, body.get('title'), body.get('description'),
                      body.get('reward', 0), json.dumps(quest_data), 
                      quest_type in ('visit', 'patrol'), body.get('factionRestriction'), body.get('expiresAt')))
        
        return {
            'statusCode': 201,
            'headers': CORS_HEADERS,
            'body': json.dumps({'id': quest_id})
        }
    except Exception as e:
        return {'statusCode': 500, 'headers': CORS_HEADERS,
                'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})}


# ============ Admin endpoints ============

@require_gm
def admin_list_handler(event, context):
    """GET /api/admin/quests - List quest templates (available quests)"""
    try:
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT c.*, 
                           COALESCE(p.nickname, t.name) as issuer_nickname,
                           t.name as trader_name
                    FROM contracts c
                    LEFT JOIN players p ON c.issuer_id = p.id
                    LEFT JOIN traders t ON c.issuer_id = t.id
                    WHERE c.quest_type IS NOT NULL
                      AND c.status = 'available'
                    ORDER BY c.created_at DESC
                    LIMIT 100
                """)
                quests = cursor.fetchall()
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'quests': [_format_quest(q) for q in quests]})
        }
    except Exception as e:
        return {'statusCode': 500, 'headers': CORS_HEADERS,
                'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})}


@require_gm
def admin_create_handler(event, context):
    """POST /api/admin/quests - Create quest (GM full control)"""
    try:
        body = json.loads(event.get('body', '{}'))
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                quest_id = str(uuid.uuid4())
                quest_type = body.get('questType')
                issuer_id = body.get('issuerId')  # Can be player_id or trader_id
                
                quest_data = body.get('questData', {})
                
                # For elimination with specific target
                target_player_id = body.get('targetPlayerId')
                if quest_type == 'elimination' and target_player_id:
                    quest_data['target_player_id'] = target_player_id
                
                # For protection quest
                if quest_type == 'protection':
                    quest_data['protected_player_id'] = body.get('targetPlayerId')
                
                cursor.execute("""
                    INSERT INTO contracts (id, type, quest_type, issuer_id, title, description, 
                                          reward, reward_item_id, reward_reputation,
                                          target_player_id, escrow_amount, quest_data, auto_complete, 
                                          faction_restriction, faction_restrictions, expires_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, %s, %s, %s, %s, %s)
                """, (quest_id, quest_type or 'manual', quest_type, issuer_id, 
                      body.get('title'), body.get('description'),
                      body.get('reward', 0), body.get('rewardItemId'), body.get('rewardReputation', 0),
                      target_player_id, json.dumps(quest_data), 
                      body.get('autoComplete', quest_type in ('visit', 'patrol')),
                      body.get('factionRestriction'),
                      json.dumps(body.get('factionRestrictions')) if body.get('factionRestrictions') else None,
                      body.get('expiresAt')))
        
        return {
            'statusCode': 201,
            'headers': CORS_HEADERS,
            'body': json.dumps({'id': quest_id})
        }
    except Exception as e:
        return {'statusCode': 500, 'headers': CORS_HEADERS,
                'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})}


@require_gm
def admin_confirm_handler(event, context):
    """POST /api/admin/quests/{id}/confirm - Confirm quest completion"""
    try:
        quest_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT c.*, t.faction as trader_faction
                    FROM contracts c
                    LEFT JOIN traders t ON c.issuer_id = t.id
                    WHERE c.id = %s AND c.status IN ('accepted', 'in_progress')
                """, (quest_id,))
                quest = cursor.fetchone()
                
                if not quest:
                    return {'statusCode': 404, 'headers': CORS_HEADERS,
                            'body': json.dumps({'error': {'code': 'NOT_FOUND', 'message': 'Quest not found or not ready'}})}
                
                player_id = quest['accepted_by']
                rewards_given = {}
                
                # Pay money reward
                if quest['reward']:
                    cursor.execute("UPDATE players SET balance = balance + %s WHERE id = %s", 
                                  (quest['reward'], player_id))
                    rewards_given['money'] = float(quest['reward'])
                
                # Pay reputation reward
                if quest['reward_reputation']:
                    if quest['trader_faction']:
                        add_reputation(cursor, player_id, quest['reward_reputation'], faction=quest['trader_faction'])
                    else:
                        add_reputation(cursor, player_id, quest['reward_reputation'], faction='loner')
                    rewards_given['reputation'] = quest['reward_reputation']
                
                # Give item reward
                if quest['reward_item_id']:
                    cursor.execute("""
                        INSERT INTO player_items (id, player_id, item_def_id, quantity)
                        VALUES (%s, %s, %s, 1)
                        ON DUPLICATE KEY UPDATE quantity = quantity + 1
                    """, (str(uuid.uuid4()), player_id, quest['reward_item_id']))
                    rewards_given['item_id'] = quest['reward_item_id']
                
                # Update stats
                cursor.execute("""
                    UPDATE players SET total_contracts_completed = total_contracts_completed + 1 
                    WHERE id = %s
                """, (player_id,))
                
                # Complete quest
                cursor.execute("""
                    UPDATE contracts SET status = 'completed', completed_at = NOW()
                    WHERE id = %s
                """, (quest_id,))
                
                log_quest_event(cursor, quest_id, player_id, 'completed')
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'success': True, 'rewards': rewards_given})
        }
    except Exception as e:
        return {'statusCode': 500, 'headers': CORS_HEADERS,
                'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})}


@require_gm
def admin_delete_handler(event, context):
    """DELETE /api/admin/quests/{id} - Delete quest"""
    try:
        quest_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM contracts WHERE id = %s", (quest_id,))
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'success': True})
        }
    except Exception as e:
        return {'statusCode': 500, 'headers': CORS_HEADERS,
                'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})}


@require_gm
def admin_update_handler(event, context):
    """PUT /api/admin/quests/{id} - Update quest"""
    try:
        quest_id = event['pathParameters']['id']
        body = json.loads(event.get('body', '{}'))
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Build update query dynamically
                updates = []
                params = []
                
                if 'title' in body:
                    updates.append("title = %s")
                    params.append(body['title'])
                if 'description' in body:
                    updates.append("description = %s")
                    params.append(body['description'])
                if 'reward' in body:
                    updates.append("reward = %s")
                    params.append(body['reward'])
                if 'questData' in body:
                    updates.append("quest_data = %s")
                    params.append(json.dumps(body['questData']))
                if 'expiresAt' in body:
                    updates.append("expires_at = %s")
                    params.append(body['expiresAt'])
                if 'factionRestriction' in body:
                    updates.append("faction_restriction = %s")
                    params.append(body['factionRestriction'])
                if 'factionRestrictions' in body:
                    updates.append("faction_restrictions = %s")
                    params.append(json.dumps(body['factionRestrictions']) if body['factionRestrictions'] else None)
                
                if not updates:
                    return {'statusCode': 400, 'headers': CORS_HEADERS,
                            'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'No fields to update'}})}
                
                params.append(quest_id)
                cursor.execute(f"UPDATE contracts SET {', '.join(updates)} WHERE id = %s", params)
                
                if cursor.rowcount == 0:
                    return {'statusCode': 404, 'headers': CORS_HEADERS,
                            'body': json.dumps({'error': {'code': 'NOT_FOUND', 'message': 'Quest not found'}})}
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'success': True})
        }
    except Exception as e:
        return {'statusCode': 500, 'headers': CORS_HEADERS,
                'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})}
