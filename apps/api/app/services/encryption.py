import base64
import hashlib

from cryptography.fernet import Fernet

from app.core.config import get_settings


def _fernet() -> Fernet:
    settings = get_settings()
    seed = settings.field_encryption_key or settings.jwt_secret or settings.jwt_refresh_secret
    if not seed:
        raise ValueError("Missing encryption key configuration")
    key = base64.urlsafe_b64encode(hashlib.sha256(seed.encode()).digest())
    return Fernet(key)


def encrypt_text(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt_text(value: str) -> str:
    return _fernet().decrypt(value.encode()).decode()
