"""
Frontend error logging to CloudWatch
"""
import json

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
}

def log_handler(event, context):
    """POST /api/log - Log frontend errors to CloudWatch"""
    try:
        body = json.loads(event.get('body', '{}'))
        level = body.get('level', 'INFO')
        message = body.get('message', '')
        data = body.get('data', {})
        
        # This prints to CloudWatch Logs
        print(f"[FRONTEND {level}] {message} | {json.dumps(data)}")
        
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'logged': True})
        }
    except Exception as e:
        print(f"[LOG ERROR] {str(e)}")
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'logged': False})
        }
