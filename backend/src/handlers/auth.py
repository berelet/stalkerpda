import json
import uuid
from src.database import get_db
from src.utils.auth_simple import hash_password, verify_password, create_jwt_token, generate_qr_code
from src.utils.responses import success_response, error_response
from src.config import config

def login_handler(event, context):
    """POST /api/auth/login"""
    try:
        body = json.loads(event.get('body', '{}'))
        email = body.get('email')
        password = body.get('password')
        
        if not email or not password:
            return error_response('Email and password required', 400, 'BAD_REQUEST')
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT p.id, p.nickname, p.email, p.password_hash, p.faction, p.status,
                           COALESCE(pr.is_gm, 0) as is_gm
                    FROM players p
                    LEFT JOIN player_roles pr ON p.id = pr.player_id
                    WHERE p.email = %s
                """, (email,))
                player = cursor.fetchone()
        
        if not player or not verify_password(password, player['password_hash']):
            return error_response('Invalid credentials', 401, 'UNAUTHORIZED')
        
        # Check if player is inactive (dead status = banned/disabled)
        if player['status'] == 'dead':
            return error_response('Account is inactive. Contact administrator.', 403, 'ACCOUNT_INACTIVE')
        
        token = create_jwt_token(player['id'])
        
        response = {
            'id': player['id'],
            'nickname': player['nickname'],
            'email': player['email'],
            'faction': player['faction'],
            'is_gm': bool(player['is_gm']),
            'token': token
        }
        
        return success_response(response)
    
    except Exception as e:
        print(f"Login error: {e}")
        return error_response(str(e), 500, 'INTERNAL_ERROR')

def register_handler(event, context):
    """POST /api/auth/register"""
    try:
        body = json.loads(event.get('body', '{}'))
        nickname = body.get('nickname')
        email = body.get('email')
        password = body.get('password')
        faction = body.get('faction')
        
        if not all([nickname, email, password, faction]):
            return error_response('All fields required', 400, 'BAD_REQUEST')
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM players WHERE nickname = %s OR email = %s",
                    (nickname, email)
                )
                existing = cursor.fetchone()
                
                if existing:
                    return error_response('Nickname or email already exists', 409, 'CONFLICT')
                
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
                
                return success_response(response, 201)
    
    except Exception as e:
        print(f"Register error: {e}")
        import traceback
        traceback.print_exc()
        return error_response(str(e), 500, 'INTERNAL_ERROR')

def me_handler(event, context):
    """GET /api/auth/me"""
    from src.middleware.auth import get_current_player
    
    try:
        player = get_current_player(event)
        if not player:
            return error_response('Authentication required', 401, 'UNAUTHORIZED')
        
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
                
                # Get player roles
                cursor.execute(
                    """SELECT is_gm, is_bartender, permissions 
                    FROM player_roles WHERE player_id = %s""",
                    (player_id,)
                )
                roles_data = cursor.fetchone()
        
        if not player_data:
            return error_response('Player not found', 404, 'NOT_FOUND')
        
        # Determine role for frontend
        role = 'player'
        if roles_data:
            if roles_data.get('is_gm'):
                role = 'gm'
            elif roles_data.get('is_bartender'):
                role = 'bartender'
        
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
            'role': role,
            'stats': {
                'kills': player_data['total_kills'],
                'deaths': player_data['total_deaths'],
                'artifactsFound': player_data['total_artifacts_found'],
                'contractsCompleted': player_data['total_contracts_completed']
            }
        }
        
        return success_response(response)
    
    except Exception as e:
        print(f"Me error: {e}")
        return error_response(str(e), 500, 'INTERNAL_ERROR')
