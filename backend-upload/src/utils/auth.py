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
    """Generate unique QR code for player"""
    import hashlib
    import time
    data = f"{player_id}:{time.time()}"
    return hashlib.sha256(data.encode()).hexdigest()[:16]
