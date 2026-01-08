from functools import wraps
from typing import Optional
from src.utils.auth_simple import decode_jwt_token

def get_current_player(event: dict) -> Optional[dict]:
    """Extract player from JWT token in event (from Authorization header or Cookie)"""
    headers = event.get('headers', {})
    
    # Try Authorization header first
    auth_header = headers.get('Authorization') or headers.get('authorization')
    token = None
    
    if auth_header:
        # Extract token from "Bearer <token>"
        parts = auth_header.split()
        if len(parts) == 2 and parts[0].lower() == 'bearer':
            token = parts[1]
    
    # If no Authorization header, try Cookie
    if not token:
        cookie_header = headers.get('Cookie') or headers.get('cookie')
        if cookie_header:
            # Parse cookies
            cookies = {}
            for cookie in cookie_header.split(';'):
                cookie = cookie.strip()
                if '=' in cookie:
                    key, value = cookie.split('=', 1)
                    cookies[key] = value
            
            token = cookies.get('auth_token')
    
    if not token:
        return None
    
    payload = decode_jwt_token(token)
    
    if not payload:
        return None
    
    return {'player_id': payload.get('player_id')}

def require_auth(handler):
    """Decorator to require authentication"""
    @wraps(handler)
    def wrapper(event, context):
        player = get_current_player(event)
        if not player:
            from src.utils.responses import cors_headers
            return {
                'statusCode': 401,
                'headers': cors_headers(event),
                'body': '{"error": {"code": "UNAUTHORIZED", "message": "Authentication required"}}'
            }
        event['player'] = player
        return handler(event, context)
    
    return wrapper

def require_gm(handler):
    """Decorator to require GM role"""
    @wraps(handler)
    def wrapper(event, context):
        player = get_current_player(event)
        if not player:
            return {
                'statusCode': 401,
                'body': '{"error": {"code": "UNAUTHORIZED", "message": "Authentication required"}}'
            }
        
        # Check if player is GM
        from src.database import execute_query
        result = execute_query(
            "SELECT is_gm FROM player_roles WHERE player_id = %s",
            (player['player_id'],),
            fetch_one=True
        )
        
        if not result or not result.get('is_gm'):
            return {
                'statusCode': 403,
                'body': '{"error": {"code": "FORBIDDEN", "message": "GM access required"}}'
            }
        
        event['player'] = player
        return handler(event, context)
    
    return wrapper
