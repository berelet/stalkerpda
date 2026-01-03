import json

def cors_headers():
    """Return CORS headers for all responses"""
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }

def success_response(data, status_code=200):
    """Return success response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': cors_headers(),
        'body': json.dumps(data)
    }

def error_response(message, status_code=400, code='ERROR'):
    """Return error response with CORS headers"""
    return {
        'statusCode': status_code,
        'headers': cors_headers(),
        'body': json.dumps({'error': {'code': code, 'message': message}})
    }
