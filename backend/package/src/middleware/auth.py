from functools import wraps
from typing import Optional
from src.utils.auth import decode_jwt_token

def get_current_player(event: dict) -> Optional[dict]:
    """Extract player from JWT token in event"""
    headers = event.get('headers', {})
    auth_header = headers.get('Authorization') or headers.get('authorization')
    
    if not auth_header:
        return None
    
    # Extract token from "Bearer <token>"
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return None
    
    token = parts[1]
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
            return {
                'statusCode': 401,
                'body': '{"error": {"code": "UNAUTHORIZED", "message": "Authentication required"}}'
            }
        
        # Add player to event
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
