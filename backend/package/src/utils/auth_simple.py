import hashlib

def hash_password(password: str) -> str:
    """Simple hash for testing (NOT FOR PRODUCTION)"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == hashed
