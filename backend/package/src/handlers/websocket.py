import json
import boto3
from src.utils.auth import decode_jwt_token

dynamodb = boto3.resource('dynamodb')

def connect_handler(event, context):
    """WebSocket $connect"""
    try:
        # Get token from query string
        query_params = event.get('queryStringParameters') or {}
        token = query_params.get('token')
        
        if not token:
            return {'statusCode': 401}
        
        # Verify token
        payload = decode_jwt_token(token)
        if not payload:
            return {'statusCode': 401}
        
        # Store connection
        connection_id = event['requestContext']['connectionId']
        player_id = payload['player_id']
        
        table = dynamodb.Table('pda-zone-connections-dev')
        table.put_item(Item={
            'connectionId': connection_id,
            'playerId': player_id,
            'connectedAt': context.get_remaining_time_in_millis()
        })
        
        return {'statusCode': 200}
    
    except Exception as e:
        print(f"Connect error: {e}")
        return {'statusCode': 500}

def disconnect_handler(event, context):
    """WebSocket $disconnect"""
    try:
        connection_id = event['requestContext']['connectionId']
        
        table = dynamodb.Table('pda-zone-connections-dev')
        table.delete_item(Key={'connectionId': connection_id})
        
        return {'statusCode': 200}
    
    except Exception as e:
        print(f"Disconnect error: {e}")
        return {'statusCode': 500}

def message_handler(event, context):
    """WebSocket $default (messages)"""
    try:
        connection_id = event['requestContext']['connectionId']
        body = json.loads(event.get('body', '{}'))
        
        # Handle different message types
        action = body.get('action')
        
        if action == 'ping':
            return {'statusCode': 200}
        
        # Echo back for now
        return {'statusCode': 200}
    
    except Exception as e:
        print(f"Message error: {e}")
        return {'statusCode': 500}
