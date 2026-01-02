import json
import uuid
from src.database import get_db
from src.utils.auth_simple import hash_password, verify_password, create_jwt_token, generate_qr_code
from src.config import config

def login_handler(event, context):
    """POST /api/auth/login"""
    try:
        body = json.loads(event.get('body', '{}'))
        email = body.get('email')
        password = body.get('password')
        
        if not email or not password:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'Email and password required'}})
            }
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id, nickname, email, password_hash, faction FROM players WHERE email = %s",
                    (email,)
                )
                player = cursor.fetchone()
        
        if not player or not verify_password(password, player['password_hash']):
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': {'code': 'UNAUTHORIZED', 'message': 'Invalid credentials'}})
            }
        
        token = create_jwt_token(player['id'])
        
        response = {
            'id': player['id'],
            'nickname': player['nickname'],
            'email': player['email'],
            'faction': player['faction'],
            'token': token
        }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(response)
        }
    
    except Exception as e:
        print(f"Login error: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

def register_handler(event, context):
    """POST /api/auth/register"""
    try:
        body = json.loads(event.get('body', '{}'))
        nickname = body.get('nickname')
        email = body.get('email')
        password = body.get('password')
        faction = body.get('faction')
        
        if not all([nickname, email, password, faction]):
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': {'code': 'BAD_REQUEST', 'message': 'All fields required'}})
            }
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM players WHERE nickname = %s OR email = %s",
                    (nickname, email)
                )
                existing = cursor.fetchone()
                
                if existing:
                    return {
                        'statusCode': 409,
                        'headers': {'Content-Type': 'application/json'},
                        'body': json.dumps({'error': {'code': 'CONFLICT', 'message': 'Nickname or email already exists'}})
                    }
                
                player_id = str(uuid.uuid4())
                qr_code = generate_qr_code(player_id)
                password_hash = hash_password(password)
                
                cursor.execute(
                    """INSERT INTO players 
                    (id, nickname, email, password_hash, faction, balance, qr_code, current_lives)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                    (player_id, nickname, email, password_hash, 
                     faction, config.DEFAULT_BALANCE, qr_code, config.DEFAULT_LIVES)
                )
                
                token = create_jwt_token(player_id)
                
                response = {
                    'id': player_id,
                    'nickname': nickname,
                    'email': email,
                    'faction': faction,
                    'qrCode': qr_code,
                    'token': token
                }
                
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps(response)
                }
    
    except Exception as e:
        print(f"Register error: {e}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }

def me_handler(event, context):
    """GET /api/auth/me"""
    from src.middleware.auth import get_current_player
    
    try:
        player = get_current_player(event)
        if not player:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}})
            }
        
        player_id = player['player_id']
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """SELECT id, nickname, email, faction, status, balance, reputation,
                    current_lives, current_radiation, qr_code,
                    total_kills, total_deaths, total_artifacts_found, total_contracts_completed
                    FROM players WHERE id = %s""",
                    (player_id,)
                )
                player_data = cursor.fetchone()
        
        if not player_data:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': {'code': 'NOT_FOUND', 'message': 'Player not found'}})
            }
        
        response = {
            'id': player_data['id'],
            'nickname': player_data['nickname'],
            'email': player_data['email'],
            'faction': player_data['faction'],
            'status': player_data['status'],
            'balance': float(player_data['balance']),
            'reputation': player_data['reputation'],
            'currentLives': player_data['current_lives'],
            'currentRadiation': player_data['current_radiation'],
            'qrCode': player_data['qr_code'],
            'stats': {
                'kills': player_data['total_kills'],
                'deaths': player_data['total_deaths'],
                'artifactsFound': player_data['total_artifacts_found'],
                'contractsCompleted': player_data['total_contracts_completed']
            }
        }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(response)
        }
    
    except Exception as e:
        print(f"Me error: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': {'code': 'INTERNAL_ERROR', 'message': str(e)}})
        }
