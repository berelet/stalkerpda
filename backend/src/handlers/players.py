import json
import uuid
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
                # Get player info
                cursor.execute(
                    "SELECT current_lives, balance FROM players WHERE id = %s",
                    (player_id,)
                )
                player = cursor.fetchone()
                
                if not player:
                    return {
                        'statusCode': 404,
                        'headers': cors_headers(),
                        'body': json.dumps({'error': {'code': 'NOT_FOUND', 'message': 'Player not found'}})
                    }
                
                # Decrease lives
                new_lives = max(0, player['current_lives'] - 1)
                
                # Reset radiation
                cursor.execute(
                    """UPDATE players 
                    SET current_lives = %s, current_radiation = 0, total_deaths = total_deaths + 1
                    WHERE id = %s""",
                    (new_lives, player_id)
                )
                
                # Lose ALL items (equipment + artifacts) with 1-10% chance
                lost_equipment = []
                lost_artifacts = []
                
                # Process equipment (all slots including backpack)
                cursor.execute(
                    """SELECT pe.id, et.name, pe.slot_type
                    FROM player_equipment pe
                    JOIN equipment_types et ON pe.equipment_type_id = et.id
                    WHERE pe.player_id = %s""",
                    (player_id,)
                )
                equipment = cursor.fetchall()
                
                for eq in equipment:
                    # 1-10% chance to lose
                    import random
                    if random.randint(1, 100) <= 10:
                        # If equipped, remove bonuses first
                        if eq['slot_type'] != 'backpack':
                            # Unequip to backpack first, then delete
                            cursor.execute(
                                "UPDATE player_equipment SET slot_type = 'backpack', slot_position = 0 WHERE id = %s",
                                (eq['id'],)
                            )
                        
                        cursor.execute(
                            "DELETE FROM player_equipment WHERE id = %s",
                            (eq['id'],)
                        )
                        lost_equipment.append({'id': eq['id'], 'name': eq['name']})
                
                # Process artifacts (all - equipped + backpack)
                cursor.execute(
                    """SELECT a.id, at.name, a.slot_type
                    FROM artifacts a
                    JOIN artifact_types at ON a.type_id = at.id
                    WHERE a.owner_id = %s""",
                    (player_id,)
                )
                artifacts = cursor.fetchall()
                
                for art in artifacts:
                    # 1-10% chance to lose
                    if random.randint(1, 100) <= 10:
                        # If equipped, remove bonuses first
                        if art['slot_type'] == 'artifact':
                            # Get bonus lives
                            cursor.execute(
                                """SELECT at.bonus_lives
                                FROM artifacts a
                                JOIN artifact_types at ON a.type_id = at.id
                                WHERE a.id = %s""",
                                (art['id'],)
                            )
                            bonus_lives = cursor.fetchone()['bonus_lives']
                            
                            if bonus_lives > 0:
                                cursor.execute(
                                    "UPDATE players SET current_lives = current_lives - %s WHERE id = %s",
                                    (bonus_lives, player_id)
                                )
                        
                        # Delete artifact
                        cursor.execute(
                            "UPDATE artifacts SET state = 'lost', owner_id = NULL WHERE id = %s",
                            (art['id'],)
                        )
                        lost_artifacts.append({'id': art['id'], 'name': art['name']})
                
                # Create death event
                cursor.execute(
                    """INSERT INTO game_events (type, player_id, data)
                    VALUES ('radiation_death', %s, %s)""",
                    (player_id, json.dumps({'livesRemaining': new_lives}))
                )
        
        response = {
            'success': True,
            'livesRemaining': new_lives,
            'radiationReset': True,
            'artifactsLost': [a['id'] for a in lost_artifacts],
            'equipmentLost': lost_equipment,
            'outOfLives': new_lives == 0
        }
        
        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': json.dumps(response)
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_auth
def loot_handler(event, context):
    """POST /api/player/loot - Loot player via QR scan"""
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
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Find victim by QR code
                cursor.execute(
                    "SELECT id, nickname, balance FROM players WHERE qr_code = %s",
                    (victim_qr_code,)
                )
                victim = cursor.fetchone()
                
                if not victim:
                    return {
                        'statusCode': 404,
                        'headers': cors_headers(),
                        'body': json.dumps({'error': {'code': 'NOT_FOUND', 'message': 'Player not found'}})
                    }
                
                victim_id = victim['id']
                
                if looter_id == victim_id:
                    return {
                        'statusCode': 400,
                        'headers': cors_headers(),
                        'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'Cannot loot yourself'}})
                    }
                
                # Check if already looted (one loot per death)
                cursor.execute(
                    """SELECT id FROM looting_events 
                    WHERE victim_id = %s AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)""",
                    (victim_id,)
                )
                if cursor.fetchone():
                    return {
                        'statusCode': 409,
                        'headers': cors_headers(),
                        'body': json.dumps({'error': {'code': 'ALREADY_LOOTED', 'message': 'Already looted'}})
                    }
                
                # Calculate loot
                money_stolen = calculate_loot_money(float(victim['balance']))
                
                # Loot ALL equipment (equipped + backpack)
                cursor.execute(
                    """SELECT pe.id, et.name, pe.slot_type
                    FROM player_equipment pe
                    JOIN equipment_types et ON pe.equipment_type_id = et.id
                    WHERE pe.player_id = %s""",
                    (victim_id,)
                )
                victim_equipment = cursor.fetchall()
                
                looted_equipment = []
                for eq in victim_equipment:
                    if should_loot_item('equipment'):
                        # Check looter backpack capacity
                        cursor.execute(
                            """SELECT COUNT(*) as count
                            FROM player_equipment
                            WHERE player_id = %s AND slot_type = 'backpack'""",
                            (looter_id,)
                        )
                        looter_backpack_count = cursor.fetchone()['count']
                        
                        cursor.execute(
                            "SELECT backpack_capacity FROM players WHERE id = %s",
                            (looter_id,)
                        )
                        looter_capacity = cursor.fetchone()['backpack_capacity']
                        
                        if looter_backpack_count < looter_capacity:
                            # Transfer to looter's backpack
                            cursor.execute(
                                """UPDATE player_equipment 
                                SET player_id = %s, slot_type = 'backpack', slot_position = 0 
                                WHERE id = %s""",
                                (looter_id, eq['id'])
                            )
                            looted_equipment.append({'id': eq['id'], 'name': eq['name']})
                
                # Loot ALL artifacts (equipped + backpack)
                cursor.execute(
                    """SELECT a.id, at.name, a.slot_type
                    FROM artifacts a
                    JOIN artifact_types at ON a.type_id = at.id
                    WHERE a.owner_id = %s""",
                    (victim_id,)
                )
                victim_artifacts = cursor.fetchall()
                
                looted_artifacts = []
                for art in victim_artifacts:
                    if should_loot_item('artifact'):
                        # Check looter backpack capacity (artifacts count too)
                        cursor.execute(
                            """SELECT COUNT(*) as count
                            FROM player_equipment
                            WHERE player_id = %s AND slot_type = 'backpack'""",
                            (looter_id,)
                        )
                        equipment_count = cursor.fetchone()['count']
                        
                        cursor.execute(
                            """SELECT COUNT(*) as count
                            FROM player_inventory
                            WHERE player_id = %s AND item_type = 'artifact' AND slot_type = 'backpack'""",
                            (looter_id,)
                        )
                        artifact_count = cursor.fetchone()['count']
                        
                        cursor.execute(
                            "SELECT backpack_capacity FROM players WHERE id = %s",
                            (looter_id,)
                        )
                        looter_capacity = cursor.fetchone()['backpack_capacity']
                        
                        if (equipment_count + artifact_count) < looter_capacity:
                            # Transfer to looter's backpack
                            cursor.execute(
                                """UPDATE artifacts 
                                SET owner_id = %s, slot_type = 'backpack' 
                                WHERE id = %s""",
                                (looter_id, art['id'])
                            )
                            looted_artifacts.append({'id': art['id'], 'name': art['name']})
                
                # Transfer money
                if money_stolen > 0:
                    cursor.execute(
                        "UPDATE players SET balance = balance - %s WHERE id = %s",
                        (money_stolen, victim_id)
                    )
                    cursor.execute(
                        "UPDATE players SET balance = balance + %s WHERE id = %s",
                        (money_stolen, looter_id)
                    )
                    
                    # Record transaction
                    cursor.execute(
                        """INSERT INTO transactions (id, type, from_player_id, to_player_id, amount)
                        VALUES (%s, 'looting', %s, %s, %s)""",
                        (str(uuid.uuid4()), victim_id, looter_id, money_stolen)
                    )
                
                # Record looting event
                cursor.execute(
                    """INSERT INTO looting_events 
                    (id, looter_id, victim_id, money_stolen, equipment_stolen, artifacts_stolen, qr_scanned)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (str(uuid.uuid4()), looter_id, victim_id, money_stolen,
                     json.dumps([e['id'] for e in looted_equipment]),
                     json.dumps([a['id'] for a in looted_artifacts]),
                     victim_qr_code)
                )
                
                # Get looter's new balance
                cursor.execute(
                    "SELECT balance FROM players WHERE id = %s",
                    (looter_id,)
                )
                looter_balance = cursor.fetchone()['balance']
        
        response = {
            'success': True,
            'loot': {
                'money': float(money_stolen),
                'equipment': looted_equipment,
                'artifacts': looted_artifacts
            },
            'yourBalance': float(looter_balance)
        }
        
        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': json.dumps(response)
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }
