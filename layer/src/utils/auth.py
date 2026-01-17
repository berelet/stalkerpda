import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from src.config import config

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(player_id: str) -> str:
    """Create JWT token for player"""
    payload = {
        'player_id': player_id,
        'exp': datetime.utcnow() + timedelta(hours=config.JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)

def decode_jwt_token(token: str) -> Optional[dict]:
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def generate_qr_code(player_id: str) -> str:
    """Generate QR code SVG and upload to S3, return URL"""
    import qrcode
    import qrcode.image.svg
    import io
    import boto3
    import os
    
    qr_data = f"STALKER_LOOT:{player_id}"
    
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=4)
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    factory = qrcode.image.svg.SvgImage
    img = qr.make_image(image_factory=factory)
    
    buffer = io.BytesIO()
    img.save(buffer)
    svg_bytes = buffer.getvalue()
    
    # Upload to S3
    s3 = boto3.client('s3')
    bucket = os.environ.get('S3_BUCKET', 'pda-zone-frontend-dev-707694916945')
    key = f"qr/{player_id}.svg"
    
    s3.put_object(Bucket=bucket, Key=key, Body=svg_bytes, ContentType='image/svg+xml')
    
    # Return CloudFront URL
    cf_domain = os.environ.get('CLOUDFRONT_DOMAIN', 'd384azcb4go67w.cloudfront.net')
    return f"https://{cf_domain}/{key}"
