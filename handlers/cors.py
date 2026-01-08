"""CORS preflight handler"""

ALLOWED_ORIGINS = [
    'https://d3gda670zz1dlb.cloudfront.net',
    'https://d384azcb4go67w.cloudfront.net',
]

def handler(event, context):
    headers = event.get('headers', {})
    origin = headers.get('origin') or headers.get('Origin')
    
    if origin not in ALLOWED_ORIGINS:
        origin = ALLOWED_ORIGINS[0]
    
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,Cookie',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400'
        },
        'body': ''
    }
