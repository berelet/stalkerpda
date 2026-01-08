import json
from functools import wraps

ALLOWED_ORIGINS = [
    'https://d3gda670zz1dlb.cloudfront.net',  # Admin panel
    'https://d384azcb4go67w.cloudfront.net',  # PDA frontend
]

def get_cors_origin(event):
    """Get appropriate CORS origin based on request origin"""
    if not event:
        return ALLOWED_ORIGINS[0]
    
    headers = event.get('headers', {})
    origin = headers.get('origin') or headers.get('Origin')
    
    if origin in ALLOWED_ORIGINS:
        return origin
    
    return ALLOWED_ORIGINS[0]

def cors_headers(event=None):
    """Return CORS headers for all responses"""
    origin = get_cors_origin(event)
    
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,Cookie',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    }

def handle_cors(event):
    """Handle OPTIONS preflight request"""
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers(event),
            'body': ''
        }
    return None

def with_cors(handler):
    """Decorator to handle CORS preflight"""
    @wraps(handler)
    def wrapper(event, context):
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': cors_headers(event),
                'body': ''
            }
        return handler(event, context)
    return wrapper

def success_response(data, status_code=200, event=None):
    """Return success response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': cors_headers(event),
        'body': json.dumps(data)
    }

def error_response(message, status_code=400, code='ERROR', event=None):
    """Return error response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': cors_headers(event),
        'body': json.dumps({'error': {'code': code, 'message': message}})
    }
