import json
import uuid
from src.database import get_db
from src.utils.auth_simple import hash_password, verify_password, create_jwt_token, generate_qr_code
from src.utils.responses import success_response, error_response
from src.config import config

def login_handler(event, context):
    """POST /api/auth/login"""
    # Test sync - 2026-01-09 07:43
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
        
        response_data = {
            'id': player['id'],
            'nickname': player['nickname'],
            'email': player['email'],
            'faction': player['faction'],
            'is_gm': bool(player['is_gm']),
            'token': token  # Still return token for backward compatibility
        }
        
        # Create HttpOnly cookie
        cookie_value = f"auth_token={token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800"  # 7 days
        
        # Get CORS headers with credentials support
        from src.utils.responses import cors_headers
        headers = cors_headers(event, with_credentials=True)
        headers['Set-Cookie'] = cookie_value
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response_data)
        }
    
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
                
                return success_response(response, 201, event=event)
    
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
        
        return success_response(response, event=event, with_credentials=True)
    
    except Exception as e:
        print(f"Me error: {e}")
        return error_response(str(e), 500, 'INTERNAL_ERROR', event=event, with_credentials=True)

def logout_handler(event, context):
    """POST /api/auth/logout - Clear HttpOnly cookie"""
    try:
        # Clear cookie by setting Max-Age=0
        cookie_value = "auth_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
        
        from src.utils.responses import cors_headers
        headers = cors_headers(event, with_credentials=True)
        headers['Set-Cookie'] = cookie_value
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'success': True})
        }
    except Exception as e:
        print(f"Logout error: {e}")
        return error_response(str(e), 500, 'INTERNAL_ERROR', event)

def forgot_password_handler(event, context):
    """POST /api/auth/forgot-password"""
    import hashlib
    from datetime import datetime, timedelta
    from src.utils.email import send_password_reset_email
    
    try:
        body = json.loads(event.get('body', '{}'))
        email = body.get('email', '').strip().lower()
        
        if not email:
            return error_response('Email required', 400, 'BAD_REQUEST')
        
        # Get IP for rate limiting
        ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown')
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Check rate limit
                rate_key = f"forgot_password#{ip}"
                cursor.execute("SELECT last_request FROM rate_limits WHERE id = %s", (rate_key,))
                rate_result = cursor.fetchone()
                
                if rate_result:
                    last_request = rate_result['last_request']
                    if datetime.utcnow() - last_request < timedelta(minutes=5):
                        return error_response('Too many requests. Try again in 5 minutes.', 429, 'TOO_MANY_REQUESTS')
                
                # Update rate limit
                cursor.execute(
                    "INSERT INTO rate_limits (id, last_request) VALUES (%s, NOW()) "
                    "ON DUPLICATE KEY UPDATE last_request = NOW()",
                    (rate_key,)
                )
                
                # Look up player
                cursor.execute("SELECT id, email FROM players WHERE email = %s", (email,))
                player = cursor.fetchone()
                
                if player:
                    # Generate token
                    token = create_jwt_token(player['id'], expires_hours=1)
                    token_hash = hashlib.sha256(token.encode()).hexdigest()
                    expires_at = datetime.utcnow() + timedelta(hours=1)
                    
                    # Store token
                    token_id = str(uuid.uuid4())
                    cursor.execute(
                        """INSERT INTO password_reset_tokens 
                        (id, player_id, token_hash, expires_at) 
                        VALUES (%s, %s, %s, %s)""",
                        (token_id, player['id'], token_hash, expires_at)
                    )
                    
                    # Send email
                    frontend_url = config.FRONTEND_URL
                    reset_link = f"{frontend_url}/reset-password?token={token}"
                    expiry_time = expires_at.strftime('%Y-%m-%d %H:%M:%S')
                    
                    try:
                        send_password_reset_email(player['email'], reset_link, expiry_time)
                        print(f"Password reset email sent to {player['email']}")
                    except Exception as email_error:
                        print(f"Failed to send email: {email_error}")
                        import traceback
                        traceback.print_exc()
        
        # Always return success (security: don't leak email existence)
        return success_response({
            'message': "If your frequency exists in our database, we've transmitted recovery coordinates to it."
        })
    
    except Exception as e:
        print(f"Forgot password error: {e}")
        import traceback
        traceback.print_exc()
        return error_response('Failed to process request', 500, 'INTERNAL_ERROR')

def reset_password_handler(event, context):
    """POST /api/auth/reset-password"""
    import hashlib
    from datetime import datetime
    from src.utils.auth_simple import decode_jwt_token
    
    try:
        body = json.loads(event.get('body', '{}'))
        token = body.get('token', '').strip()
        new_password = body.get('newPassword', '').strip()
        
        if not token or not new_password:
            return error_response('Token and new password required', 400, 'BAD_REQUEST')
        
        if len(new_password) < 6:
            return error_response('Password must be at least 6 characters', 400, 'INVALID_PASSWORD')
        
        # Decode JWT
        payload = decode_jwt_token(token)
        if not payload:
            return error_response('Reset link is invalid or expired', 401, 'INVALID_TOKEN')
        
        player_id = payload.get('player_id')
        if not player_id:
            return error_response('Invalid token format', 401, 'INVALID_TOKEN')
        
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Check token in database
                token_hash = hashlib.sha256(token.encode()).hexdigest()
                cursor.execute(
                    """SELECT id, player_id, expires_at, used 
                    FROM password_reset_tokens 
                    WHERE token_hash = %s AND player_id = %s""",
                    (token_hash, player_id)
                )
                token_record = cursor.fetchone()
                
                if not token_record:
                    return error_response('Reset link is invalid or expired', 401, 'INVALID_TOKEN')
                
                if token_record['used']:
                    return error_response('Reset link has already been used', 401, 'INVALID_TOKEN')
                
                if datetime.utcnow() > token_record['expires_at']:
                    return error_response('Reset link has expired', 401, 'INVALID_TOKEN')
                
                # Update password
                password_hash = hash_password(new_password)
                cursor.execute(
                    "UPDATE players SET password_hash = %s WHERE id = %s",
                    (password_hash, player_id)
                )
                
                # Mark token as used
                cursor.execute(
                    "UPDATE password_reset_tokens SET used = TRUE WHERE id = %s",
                    (token_record['id'],)
                )
        
        return success_response({'message': 'Password updated successfully'})
    
    except Exception as e:
        print(f"Reset password error: {e}")
        import traceback
        traceback.print_exc()
        return error_response('Failed to reset password', 500, 'INTERNAL_ERROR')
