import json
import os
import boto3
import base64
from uuid import uuid4
from src.middleware.auth import require_gm
from src.utils.responses import success_response, error_response

s3_client = boto3.client('s3')
BUCKET = os.environ.get('ARTIFACTS_BUCKET')

@require_gm
def upload_handler(event, context):
    """Upload artifact image directly through Lambda"""
    try:
        body = json.loads(event.get('body', '{}'))
        
        # Get base64 encoded file data
        file_data = body.get('fileData')
        filename = body.get('filename', 'artifact.png')
        content_type = body.get('contentType', 'image/png')
        
        if not file_data:
            return error_response('File data is required', 400)
        
        # Decode base64
        file_bytes = base64.b64decode(file_data)
        
        # Generate unique key
        file_ext = filename.split('.')[-1] if '.' in filename else 'png'
        s3_key = f"artifacts/{uuid4()}.{file_ext}"
        
        # Upload to S3
        s3_client.put_object(
            Bucket=BUCKET,
            Key=s3_key,
            Body=file_bytes,
            ContentType=content_type
        )
        
        # Public URL for the image
        image_url = f"https://{BUCKET}.s3.{os.environ.get('AWS_REGION', 'eu-north-1')}.amazonaws.com/{s3_key}"
        
        return success_response({
            'imageUrl': image_url,
            'key': s3_key
        })
        
    except Exception as e:
        print(f"Error uploading image: {str(e)}")
        return error_response(str(e), 500)
