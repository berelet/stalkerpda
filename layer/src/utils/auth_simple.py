import hashlib
import jwt
from datetime import datetime, timedelta
from src.config import config

def hash_password(password: str) -> str:
    """Simple hash for testing (NOT FOR PRODUCTION)"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == hashed

def create_jwt_token(player_id: str, expires_hours: int = None) -> str:
    """Create JWT token for player"""
    if expires_hours is None:
        expires_hours = config.JWT_EXPIRATION_HOURS
    
    payload = {
        'player_id': player_id,
        'exp': datetime.utcnow() + timedelta(hours=expires_hours),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)

def decode_jwt_token(token: str):
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
        return payload
    except:
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
