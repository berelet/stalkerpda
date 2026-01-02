import json
import uuid
from datetime import datetime
from src.database import get_db
from src.middleware.auth import require_auth
from src.models.schemas import CreateContractRequest

@require_auth
def handler(event, context):
    """GET /api/contracts - Get available contracts"""
    try:
        player_id = event['player']['player_id']
        params = event.get('queryStringParameters') or {}
        status = params.get('status', 'available')
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Get player faction for filtering
                cursor.execute(
                    "SELECT faction FROM players WHERE id = %s",
                    (player_id,)
                )
                player = cursor.fetchone()
                
                # Get contracts
                query = """
                    SELECT c.*, p.nickname as issuer_nickname
                    FROM contracts c
                    JOIN players p ON c.issuer_id = p.id
                    WHERE c.status = %s
                    AND (c.faction_restriction IS NULL OR c.faction_restriction = %s)
                    AND c.available_at <= NOW()
                    AND (c.expires_at IS NULL OR c.expires_at > NOW())
                    ORDER BY c.created_at DESC
                """
                cursor.execute(query, (status, player['faction']))
                contracts = cursor.fetchall()
        
        response = {
            'contracts': [
                {
                    'id': c['id'],
                    'type': c['type'],
                    'title': c['title'],
                    'description': c['description'],
                    'reward': float(c['reward']),
                    'status': c['status'],
                    'issuer': {
                        'id': c['issuer_id'],
                        'nickname': c['issuer_nickname']
                    },
                    'factionRestriction': c['faction_restriction'],
                    'expiresAt': c['expires_at'].isoformat() if c['expires_at'] else None
                }
                for c in contracts
            ]
        }
        
        return {
            'statusCode': 200,
            'body': json.dumps(response)
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_auth
def my_contracts_handler(event, context):
    """GET /api/contracts/my - Get my contracts"""
    try:
        player_id = event['player']['player_id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """SELECT c.*, p.nickname as issuer_nickname
                    FROM contracts c
                    JOIN players p ON c.issuer_id = p.id
                    WHERE c.accepted_by = %s
                    ORDER BY c.accepted_at DESC""",
                    (player_id,)
                )
                contracts = cursor.fetchall()
        
        active = [c for c in contracts if c['status'] in ['accepted', 'in_progress']]
        completed = [c for c in contracts if c['status'] == 'completed']
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'active': [{'id': c['id'], 'title': c['title'], 'reward': float(c['reward'])} for c in active],
                'completed': [{'id': c['id'], 'title': c['title'], 'reward': float(c['reward'])} for c in completed]
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_auth
def create_handler(event, context):
    """POST /api/contracts - Create contract"""
    try:
        player_id = event['player']['player_id']
        body = json.loads(event.get('body', '{}'))
        request = CreateContractRequest(**body)
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Check balance
                cursor.execute(
                    "SELECT balance FROM players WHERE id = %s",
                    (player_id,)
                )
                player = cursor.fetchone()
                
                if float(player['balance']) < request.reward:
                    return {
                        'statusCode': 400,
                        'body': json.dumps({'error': {'code': 'INSUFFICIENT_BALANCE', 'message': 'Insufficient balance'}})
                    }
                
                # Deduct escrow
                cursor.execute(
                    "UPDATE players SET balance = balance - %s WHERE id = %s",
                    (request.reward, player_id)
                )
                
                # Create contract
                contract_id = str(uuid.uuid4())
                cursor.execute(
                    """INSERT INTO contracts 
                    (id, type, issuer_id, title, description, reward, escrow_amount, escrow_held,
                    target_player_id, destination_lat, destination_lng, expires_at, faction_restriction)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE, %s, %s, %s, %s, %s)""",
                    (contract_id, request.type.value, player_id, request.title, request.description,
                     request.reward, request.reward, request.targetPlayerId,
                     request.destinationLat, request.destinationLng, request.expiresAt,
                     request.factionRestriction.value if request.factionRestriction else None)
                )
                
                cursor.execute(
                    "SELECT balance FROM players WHERE id = %s",
                    (player_id,)
                )
                new_balance = cursor.fetchone()['balance']
        
        return {
            'statusCode': 201,
            'body': json.dumps({
                'id': contract_id,
                'escrowHeld': True,
                'balanceAfter': float(new_balance)
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_auth
def accept_handler(event, context):
    """POST /api/contracts/{id}/accept - Accept contract"""
    try:
        player_id = event['player']['player_id']
        contract_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """UPDATE contracts 
                    SET status = 'accepted', accepted_by = %s, accepted_at = NOW()
                    WHERE id = %s AND status = 'available'""",
                    (player_id, contract_id)
                )
                
                if cursor.rowcount == 0:
                    return {
                        'statusCode': 409,
                        'body': json.dumps({'error': {'code': 'CONFLICT', 'message': 'Contract not available'}})
                    }
        
        return {
            'statusCode': 200,
            'body': json.dumps({'success': True})
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_auth
def complete_handler(event, context):
    """POST /api/contracts/{id}/complete - Mark as completed"""
    try:
        player_id = event['player']['player_id']
        contract_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """UPDATE contracts 
                    SET status = 'in_progress'
                    WHERE id = %s AND accepted_by = %s AND status = 'accepted'""",
                    (contract_id, player_id)
                )
        
        return {
            'statusCode': 200,
            'body': json.dumps({'success': True, 'awaitingConfirmation': True})
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

@require_auth
def confirm_handler(event, context):
    """POST /api/contracts/{id}/confirm - Confirm completion"""
    try:
        player_id = event['player']['player_id']
        contract_id = event['pathParameters']['id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Get contract
                cursor.execute(
                    """SELECT issuer_id, accepted_by, reward, status
                    FROM contracts WHERE id = %s""",
                    (contract_id,)
                )
                contract = cursor.fetchone()
                
                if not contract or contract['status'] != 'in_progress':
                    return {
                        'statusCode': 400,
                        'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'Contract not ready'}})
                    }
                
                # Check permission (issuer or GM)
                if contract['issuer_id'] != player_id:
                    cursor.execute(
                        "SELECT is_gm FROM player_roles WHERE player_id = %s",
                        (player_id,)
                    )
                    role = cursor.fetchone()
                    if not role or not role['is_gm']:
                        return {
                            'statusCode': 403,
                            'body': json.dumps({'error': {'code': 'FORBIDDEN', 'message': 'Not authorized'}})
                        }
                
                # Pay executor
                cursor.execute(
                    "UPDATE players SET balance = balance + %s WHERE id = %s",
                    (contract['reward'], contract['accepted_by'])
                )
                
                # Update contract
                cursor.execute(
                    """UPDATE contracts 
                    SET status = 'completed', completed_at = NOW(), escrow_held = FALSE
                    WHERE id = %s""",
                    (contract_id,)
                )
                
                # Update stats
                cursor.execute(
                    "UPDATE players SET total_contracts_completed = total_contracts_completed + 1, reputation = reputation + 10 WHERE id = %s",
                    (contract['accepted_by'],)
                )
                
                cursor.execute(
                    "SELECT balance FROM players WHERE id = %s",
                    (contract['accepted_by'],)
                )
                executor_balance = cursor.fetchone()['balance']
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'rewardPaid': float(contract['reward']),
                'executorBalance': float(executor_balance)
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }
