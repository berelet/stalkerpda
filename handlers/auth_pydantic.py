import json
import uuid
from src.database import execute_query, get_db
from src.models.schemas import RegisterRequest, LoginRequest, AuthResponse
from src.utils.auth import hash_password, verify_password, create_jwt_token, generate_qr_code
from src.config import config
from src.middleware.auth import require_auth

def login_handler(event, context):
    """POST /api/auth/login"""
    try:
        body = json.loads(event.get('body', '{}'))
        request = LoginRequest(**body)
        
        # Find player by email
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id, nickname, email, password_hash, faction FROM players WHERE email = %s",
                    (request.email,)
                )
                player = cursor.fetchone()
        
        if not player or not verify_password(request.password, player['password_hash']):
            return {
                'statusCode': 401,
                'body': json.dumps({'error': {'code': 'UNAUTHORIZED', 'message': 'Invalid credentials'}})
            }
        
        # Create token
        token = create_jwt_token(player['id'])
        
        response = AuthResponse(
            id=player['id'],
            nickname=player['nickname'],
            email=player['email'],
            faction=player['faction'],
            token=token
        )
        
        return {
            'statusCode': 200,
            'body': response.json()
        }
    
    except Exception as e:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': str(e)}})
        }

def register_handler(event, context):
    """POST /api/auth/register"""
    try:
        body = json.loads(event.get('body', '{}'))
        request = RegisterRequest(**body)
        
        # Check if nickname or email exists
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM players WHERE nickname = %s OR email = %s",
                    (request.nickname, request.email)
                )
                existing = cursor.fetchone()
                
                if existing:
                    return {
                        'statusCode': 409,
                        'body': json.dumps({'error': {'code': 'CONFLICT', 'message': 'Nickname or email already exists'}})
                    }
                
                # Create player
                player_id = str(uuid.uuid4())
                qr_code = generate_qr_code(player_id)
                password_hash = hash_password(request.password)
                
                cursor.execute(
                    """INSERT INTO players 
                    (id, nickname, email, password_hash, faction, balance, qr_code, current_lives)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                    (player_id, request.nickname, request.email, password_hash, 
                     request.faction.value, config.DEFAULT_BALANCE, qr_code, config.DEFAULT_LIVES)
                )
                
                # Create token
                token = create_jwt_token(player_id)
                
                response = AuthResponse(
                    id=player_id,
                    nickname=request.nickname,
                    email=request.email,
                    faction=request.faction,
                    token=token,
                    qrCode=qr_code
                )
                
                return {
                    'statusCode': 201,
                    'body': response.json()
                }
    
    except Exception as e:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': str(e)}})
        }

@require_auth
def me_handler(event, context):
    """GET /api/auth/me"""
    try:
        player_id = event['player']['player_id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """SELECT id, nickname, email, faction, status, balance, reputation,
                    current_lives, current_radiation, qr_code,
                    total_kills, total_deaths, total_artifacts_found, total_contracts_completed
                    FROM players WHERE id = %s""",
                    (player_id,)
                )
                player = cursor.fetchone()
        
        if not player:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': {'code': 'NOT_FOUND', 'message': 'Player not found'}})
            }
        
        response = {
            'id': player['id'],
            'nickname': player['nickname'],
            'email': player['email'],
            'faction': player['faction'],
            'status': player['status'],
            'balance': float(player['balance']),
            'reputation': player['reputation'],
            'currentLives': player['current_lives'],
            'currentRadiation': player['current_radiation'],
            'qrCode': player['qr_code'],
            'stats': {
                'kills': player['total_kills'],
                'deaths': player['total_deaths'],
                'artifactsFound': player['total_artifacts_found'],
                'contractsCompleted': player['total_contracts_completed']
            }
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
