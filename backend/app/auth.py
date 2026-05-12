from datetime import datetime, timedelta
from typing import Optional
import os
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from .models import TokenData, UserRole

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
MAX_BCRYPT_PASSWORD_BYTES = 72


def _truncate_to_bcrypt_limit(password: str) -> str:
    """Truncate a string so its UTF-8 encoded form is at most 72 bytes.

    Bcrypt only accepts passwords up to 72 bytes; cut the UTF-8 byte
    sequence and decode ignoring incomplete trailing bytes so the same
    truncation can be applied consistently on verify.
    """
    if not isinstance(password, str):
        password = str(password)
    b = password.encode("utf-8")
    if len(b) <= MAX_BCRYPT_PASSWORD_BYTES:
        return password
    return b[:MAX_BCRYPT_PASSWORD_BYTES].decode("utf-8", "ignore")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    safe = _truncate_to_bcrypt_limit(plain_password)
    return pwd_context.verify(safe, hashed_password)


def get_password_hash(password: str) -> str:
    safe = _truncate_to_bcrypt_limit(password)
    return pwd_context.hash(safe)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[TokenData]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None:
            return None
        return TokenData(email=email, role=UserRole(role) if role else None)
    except JWTError:
        return None


async def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token_data = decode_access_token(token)
    if token_data is None or token_data.email is None:
        raise credentials_exception
    return token_data


async def get_current_admin(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user
