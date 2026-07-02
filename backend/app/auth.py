import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext

#place that decides how passwords are hashed
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Turns a plan text password into a hashed password"""
    return pwd_context.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    """Checks if a plan text password matches the hashed password"""
    return pwd_context.verify(password, hashed_password)

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60

def create_token(user_id: int) -> str:
    """Creates a JWT token for the given user id"""
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> int:
    """Verifies the JWT token and returns the user id if valid, raises an exception if invalid"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return int(payload["sub"])
    except JWTError:
        return None