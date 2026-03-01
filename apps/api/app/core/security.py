import hashlib
import hmac
import os
import re
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import jwt
from fastapi import HTTPException, status

from app.core.config import get_settings


def parse_duration(value: str) -> timedelta:
    normalized = value.strip().strip('"').strip("'")
    match = re.fullmatch(r"(\d+)([smhd])", normalized)
    if not match:
        raise ValueError(f"Invalid duration: {value}")
    amount = int(match.group(1))
    unit = match.group(2)
    mapping = {"s": "seconds", "m": "minutes", "h": "hours", "d": "days"}
    return timedelta(**{mapping[unit]: amount})


def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    iterations = 390000
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${dk.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    try:
        algo, iter_str, salt, digest = hashed.split("$", 3)
    except ValueError:
        return False
    if algo != "pbkdf2_sha256":
        return False
    try:
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iter_str))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(dk.hex(), digest)


def validate_password_strength(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be >= 8 chars")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must include uppercase letter")
    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must include lowercase letter")
    if not re.search(r"\d", password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must include a number")


def _encode(payload: dict[str, Any], secret: str) -> str:
    return jwt.encode(payload, secret, algorithm="HS256")


def _decode(token: str, secret: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


def create_access_token(user_id: str, email: str) -> str:
    settings = get_settings()
    exp = datetime.now(UTC) + parse_duration(settings.jwt_access_expires)
    payload = {"sub": user_id, "email": email, "type": "access", "exp": exp, "iat": datetime.now(UTC)}
    return _encode(payload, settings.jwt_secret)


def create_refresh_token(user_id: str, session_id: str) -> tuple[str, str]:
    settings = get_settings()
    exp = datetime.now(UTC) + parse_duration(settings.jwt_refresh_expires)
    jti = str(uuid4())
    payload = {
        "sub": user_id,
        "sid": session_id,
        "jti": jti,
        "type": "refresh",
        "exp": exp,
        "iat": datetime.now(UTC),
    }
    return _encode(payload, settings.jwt_refresh_secret), jti


def decode_access_token(token: str) -> dict[str, Any]:
    payload = _decode(token, get_settings().jwt_secret)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")
    return payload


def decode_refresh_token(token: str) -> dict[str, Any]:
    payload = _decode(token, get_settings().jwt_refresh_secret)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return payload


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
