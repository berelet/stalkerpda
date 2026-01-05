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
    """Generate unique QR code for player"""
    import time
    data = f"{player_id}:{time.time()}"
    return hashlib.sha256(data.encode()).hexdigest()[:16]
