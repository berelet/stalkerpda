import json
import uuid
import random
from datetime import datetime
from src.database import get_db
from src.middleware.auth import require_auth
from src.utils.game import calculate_loot_money, should_loot_item, should_lose_item_on_death


def cors_headers():
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }


def trigger_death(cursor, player_id, reason='radiation_zone'):
    """
    Trigger player death (atomic transaction)
    
    Args:
        cursor: Database cursor
        player_id: Player UUID
        reason: Death reason ('radiation_zone', 'radiation_artifact', 'player_kill')
        
    Returns:
        Dict with death event info
    """
    # Get player info
    cursor.execute(
        "SELECT current_lives, status FROM players WHERE id = %s",
        (player_id,)
    )
    player = cursor.fetchone()
    
    if not player:
        return {'error': 'Player not found'}
    
    # Decrement lives
    new_lives = max(0, player['current_lives'] - 1)
    
    # Set status
    new_status = 'dead' if new_lives == 0 else 'alive'
    
    # Reset radiation and update player
    cursor.execute("""
        UPDATE players 
        SET current_lives = %s,
            status = %s,
            current_radiation = 0,
            current_radiation_zone_id = NULL,
            dead_at = NOW(),
            total_deaths = total_deaths + 1
        WHERE id = %s
    """, (new_lives, new_status, player_id))
    
    # Item loss (1-10% all items)
    lost_equipment = []
    lost_artifacts = []
    
    # Process equipment
    cursor.execute("""
        SELECT pe.id, et.name, pe.slot_type
        FROM player_equipment pe
        JOIN equipment_types et ON pe.equipment_type_id = et.id
        WHERE pe.player_id = %s
    """, (player_id,))
    
    for eq in cursor.fetchall():
        if random.randint(1, 100) <= 10:  # 1-10% chance
            # If equipped, unequip first
            if eq['slot_type'] != 'backpack':
                cursor.execute(
                    "UPDATE player_equipment SET slot_type = 'backpack', slot_position = 0 WHERE id = %s",
                    (eq['id'],)
                )
            
            # Delete item
            cursor.execute("DELETE FROM player_equipment WHERE id = %s", (eq['id'],))
            lost_equipment.append({'id': eq['id'], 'name': eq['name']})
    
    # Process artifacts
    cursor.execute("""
        SELECT a.id, at.name, a.slot_type
        FROM artifacts a
        JOIN artifact_types at ON a.type_id = at.id
        WHERE a.owner_id = %s
    """, (player_id,))
    
    for art in cursor.fetchall():
        if random.randint(1, 100) <= 10:  # 1-10% chance
            # If equipped, remove bonuses
            if art['slot_type'] == 'artifact':
                cursor.execute("""
                    SELECT at.bonus_lives
                    FROM artifacts a
                    JOIN artifact_types at ON a.type_id = at.id
                    WHERE a.id = %s
                """, (art['id'],))
                bonus = cursor.fetchone()
                if bonus and bonus['bonus_lives'] > 0:
                    cursor.execute(
                        "UPDATE players SET current_lives = current_lives - %s WHERE id = %s",
                        (bonus['bonus_lives'], player_id)
                    )
            
            # Mark as lost
            cursor.execute(
                "UPDATE artifacts SET state = 'lost', owner_id = NULL WHERE id = %s",
                (art['id'],)
            )
            lost_artifacts.append({'id': art['id'], 'name': art['name']})
    
    # Fail active quests
    from src.utils.quest import fail_player_quests, fail_protection_quests, complete_elimination_quest_for_target
    failed_quests_count = fail_player_quests(cursor, player_id, 'player_death')
    fail_protection_quests(cursor, player_id)
    
    # Complete elimination quests targeting this player
    completed_eliminations = complete_elimination_quest_for_target(cursor, player_id)
    for q in completed_eliminations:
        if q['reward']:
            cursor.execute("UPDATE players SET balance = balance + %s WHERE id = %s",
                          (q['reward'], q['accepted_by']))
        if q['reward_reputation']:
            cursor.execute("""
                INSERT INTO npc_reputation (id, player_id, faction, reputation)
                VALUES (%s, %s, 'loner', %s)
                ON DUPLICATE KEY UPDATE reputation = reputation + %s
            """, (str(uuid.uuid4()), q['accepted_by'], q['reward_reputation'], q['reward_reputation']))
    
    # Create death event
    cursor.execute("""
        INSERT INTO game_events (type, player_id, data)
        VALUES ('death', %s, %s)
    """, (player_id, json.dumps({
        'reason': reason,
        'livesRemaining': new_lives
    })))
    
    return {
        'died': True,
        'reason': reason,
        'livesRemaining': new_lives,
        'outOfLives': new_lives == 0,
        'itemsLost': {
            'equipment': lost_equipment,
            'artifacts': lost_artifacts
        },
        'questsFailed': failed_quests_count
    }


@require_auth
def handler(event, context):
    """GET /api/players - Get players list (for contracts, etc)"""
    try:
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """SELECT id, nickname, faction, status
                    FROM players WHERE status = 'alive'"""
                )
                players = cursor.fetchall()
        
        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': json.dumps({
                'players': [
                    {
                        'id': p['id'],
                        'nickname': p['nickname'],
                        'faction': p['faction']
                    }
                    for p in players
                ]
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_auth
def death_handler(event, context):
    """POST /api/player/death - Mark self as dead"""
    try:
        player_id = event['player']['player_id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Trigger death
                result = trigger_death(cursor, player_id, reason='player_kill')
                
                if 'error' in result:
                    return {
                        'statusCode': 404,
                        'headers': cors_headers(),
                        'body': json.dumps({'error': {'code': 'NOT_FOUND', 'message': result['error']}})
                    }
        
        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': json.dumps({
                'success': True,
                'livesRemaining': result['livesRemaining'],
                'radiationReset': True,
                'itemsLost': result['itemsLost']['equipment'] + result['itemsLost']['artifacts'],
                'outOfLives': result['outOfLives'],
                'questsFailed': result['questsFailed']
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }


@require_auth
@require_auth
def loot_handler(event, context):
    """POST /api/player/loot - Loot player via QR scan"""
    from src.utils.qr import parse_qr_code
    
    try:
        looter_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        victim_qr_code = body.get('victimQrCode')
        
        if not victim_qr_code:
            return {
                'statusCode': 400,
                'headers': cors_headers(),
                'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'QR code required'}})
            }
        
        # Parse QR code
        victim_id = parse_qr_code(victim_qr_code)
        if not victim_id:
            return {
                'statusCode': 400,
                'headers': cors_headers(),
                'body': json.dumps({'error': {'code': 'INVALID_QR', 'message': 'Invalid QR code format'}})
            }
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Get victim info
                cursor.execute(
                    "SELECT id, nickname, status, dead_at FROM players WHERE id = %s",
                    (victim_id,)
                )
                victim = cursor.fetchone()
                
                if not victim:
                    return {
                        'statusCode': 404,
                        'headers': cors_headers(),
                        'body': json.dumps({'error': {'code': 'NOT_FOUND', 'message': 'Player not found'}})
                    }
                
                if looter_id == victim_id:
                    return {
                        'statusCode': 400,
                        'headers': cors_headers(),
                        'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'Cannot loot yourself'}})
                    }
                
                # Check if victim is dead
                if victim['status'] != 'dead':
                    return {
                        'statusCode': 400,
                        'headers': cors_headers(),
                        'body': json.dumps({'error': {'code': 'PLAYER_NOT_DEAD', 'message': 'Player is not dead'}})
                    }
                
                # Check if already looted this death
                if victim['dead_at']:
                    cursor.execute(
                        """SELECT id FROM looting_events 
                        WHERE victim_id = %s AND death_timestamp = %s""",
                        (victim_id, victim['dead_at'])
                    )
                    if cursor.fetchone():
                        return {
                            'statusCode': 409,
                            'headers': cors_headers(),
                            'body': json.dumps({'error': {'code': 'ALREADY_LOOTED', 'message': 'Already looted this death'}})
                        }
                
                # Loot items (1-5% equipment, 1-3% artifacts)
                looted_equipment = []
                looted_artifacts = []
                
                # Loot equipment
                cursor.execute("""
                    SELECT pe.id, et.name, pe.slot_type
                    FROM player_equipment pe
                    JOIN equipment_types et ON pe.equipment_type_id = et.id
                    WHERE pe.player_id = %s
                """, (victim_id,))
                
                for eq in cursor.fetchall():
                    if random.randint(1, 100) <= 5:  # 1-5% chance
                        # Transfer to looter's backpack
                        cursor.execute("""
                            UPDATE player_equipment 
                            SET player_id = %s, slot_type = 'backpack', slot_position = 0 
                            WHERE id = %s
                        """, (looter_id, eq['id']))
                        looted_equipment.append({'type': 'equipment', 'name': eq['name']})
                
                # Loot artifacts
                cursor.execute("""
                    SELECT a.id, at.name, a.slot_type
                    FROM artifacts a
                    JOIN artifact_types at ON a.type_id = at.id
                    WHERE a.owner_id = %s
                """, (victim_id,))
                
                for art in cursor.fetchall():
                    if random.randint(1, 100) <= 3:  # 1-3% chance
                        # Transfer to looter's backpack
                        cursor.execute("""
                            UPDATE artifacts 
                            SET owner_id = %s, slot_type = 'backpack'
                            WHERE id = %s
                        """, (looter_id, art['id']))
                        looted_artifacts.append({'type': 'artifact', 'name': art['name']})
                
                # Record looting event
                cursor.execute("""
                    INSERT INTO looting_events 
                    (id, victim_id, looter_id, death_timestamp, equipment_stolen, artifacts_stolen, qr_scanned)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    str(uuid.uuid4()),
                    victim_id,
                    looter_id,
                    victim['dead_at'],
                    json.dumps(looted_equipment),
                    json.dumps(looted_artifacts),
                    victim_qr_code
                ))
        
        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': json.dumps({
                'success': True,
                'victimName': victim['nickname'],
                'itemsLooted': looted_equipment + looted_artifacts
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

