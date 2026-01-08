import json

ALLOWED_ORIGINS = [
    'https://d3gda670zz1dlb.cloudfront.net',  # Admin panel
    'https://d384azcb4go67w.cloudfront.net',  # PDA frontend
]

def get_cors_origin(event):
    """Get appropriate CORS origin based on request origin"""
    if not event:
        return '*'
    
    headers = event.get('headers', {})
    origin = headers.get('origin') or headers.get('Origin')
    
    print(f"DEBUG CORS: Request origin = {origin}")
    print(f"DEBUG CORS: All headers = {headers}")
    
    # If origin is in allowed list, return it (for credentials support)
    if origin in ALLOWED_ORIGINS:
        print(f"DEBUG CORS: Origin matched, returning {origin}")
        return origin
    
    # Otherwise return wildcard (for backward compatibility)
    print(f"DEBUG CORS: Origin not matched, returning *")
    return '*'

def cors_headers(event=None, with_credentials=False):
    """Return CORS headers for all responses"""
    # For now, always return admin origin when credentials are needed
    # TODO: Make this smarter based on event.headers.origin
    if with_credentials:
        origin = 'https://d3gda670zz1dlb.cloudfront.net'
    else:
        origin = get_cors_origin(event) if event else '*'
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }
    
    if with_credentials:
        headers['Access-Control-Allow-Credentials'] = 'true'
    
    return headers

def success_response(data, status_code=200, event=None, with_credentials=False):
    """Return success response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': cors_headers(event, with_credentials),
        'body': json.dumps(data)
    }

def error_response(message, status_code=400, code='ERROR', event=None, with_credentials=False):
    """Return error response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': cors_headers(event, with_credentials),
        'body': json.dumps({'error': {'code': code, 'message': message}})
    }
