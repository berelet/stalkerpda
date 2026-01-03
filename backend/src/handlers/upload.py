import json
import os
import boto3
from uuid import uuid4
from src.middleware.auth import require_gm
from src.utils.responses import success_response, error_response

s3_client = boto3.client('s3')
BUCKET = os.environ.get('ARTIFACTS_BUCKET')

@require_gm
def get_upload_url_handler(event, context):
    """Generate presigned URL for artifact image upload"""
    try:
        body = json.loads(event.get('body', '{}'))
        filename = body.get('filename', 'artifact.png')
        content_type = body.get('contentType', 'image/png')
        
        # Generate unique key
        file_ext = filename.split('.')[-1] if '.' in filename else 'png'
        s3_key = f"artifacts/{uuid4()}.{file_ext}"
        
        # Generate presigned URL for PUT
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET,
                'Key': s3_key,
                'ContentType': content_type
            },
            ExpiresIn=300  # 5 minutes
        )
        
        # Public URL for the image
        image_url = f"https://{BUCKET}.s3.{os.environ.get('AWS_REGION', 'eu-north-1')}.amazonaws.com/{s3_key}"
        
        return success_response({
            'uploadUrl': presigned_url,
            'imageUrl': image_url,
            'key': s3_key
        })
        
    except Exception as e:
        print(f"Error generating upload URL: {str(e)}")
        return error_response(str(e), 500)
