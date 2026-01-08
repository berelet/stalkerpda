import json
import os
import boto3
import base64
from uuid import uuid4
from io import BytesIO
from PIL import Image
from src.middleware.auth import require_gm
from src.utils.responses import success_response, error_response

s3_client = boto3.client('s3')
BUCKET = os.environ.get('ARTIFACTS_BUCKET')
MAX_SIZE = 400  # Maximum width/height in pixels

def resize_image(image_bytes, max_size=MAX_SIZE):
    """Resize image to max_size x max_size if larger"""
    img = Image.open(BytesIO(image_bytes))
    
    # Convert RGBA to RGB if needed (for JPEG)
    if img.mode == 'RGBA':
        background = Image.new('RGB', img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])
        img = background
    
    # Check if resize needed
    if img.width > max_size or img.height > max_size:
        # Resize maintaining aspect ratio
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    
    # Save to bytes
    output = BytesIO()
    img.save(output, format='JPEG', quality=85, optimize=True)
    return output.getvalue()

@require_gm
def upload_handler(event, context):
    """Upload artifact image directly through Lambda with auto-resize"""
    try:
        body = json.loads(event.get('body', '{}'))
        
        # Get base64 encoded file data
        file_data = body.get('fileData')
        filename = body.get('filename', 'artifact.jpg')
        
        if not file_data:
            return error_response('File data is required', 400)
        
        # Decode base64
        file_bytes = base64.b64decode(file_data)
        
        # Resize image
        resized_bytes = resize_image(file_bytes)
        
        # Generate unique key (always use .jpg after resize)
        s3_key = f"artifacts/{uuid4()}.jpg"
        
        # Upload to S3 with cache headers
        s3_client.put_object(
            Bucket=BUCKET,
            Key=s3_key,
            Body=resized_bytes,
            ContentType='image/jpeg',
            CacheControl='public, max-age=31536000, immutable'  # 1 year cache
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
