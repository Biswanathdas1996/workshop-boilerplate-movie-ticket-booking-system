from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from ..models import UserCreate, UserLogin, User, Token, UserInDB
from ..auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)
from ..database import get_database
from ..email_service import send_welcome_email
from ..rate_limiter import limiter, AUTH_RATE_LIMIT
from bson import ObjectId

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
@limiter.limit(AUTH_RATE_LIMIT)
async def register(user: UserCreate, request):
    """Register a new user"""
    db = get_database()

    # Check if user exists
    existing_user = db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user
    user_dict = user.model_dump()
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    user_dict["created_at"] = datetime.utcnow()
    user_dict["is_active"] = True

    result = db.users.insert_one(user_dict)

    # Send welcome email
    await send_welcome_email(user.email, user.full_name)

    created_user = db.users.find_one({"_id": result.inserted_id})
    created_user["id"] = str(created_user.pop("_id"))
    created_user.pop("hashed_password")

    return User(**created_user)


@router.post("/login", response_model=Token)
@limiter.limit(AUTH_RATE_LIMIT)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login with email and password"""
    db = get_database()

    user = db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]}
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=User)
async def get_current_user_info(current_user = Depends(get_current_user)):
    """Get current user information"""
    db = get_database()

    user = db.users.find_one({"email": current_user.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user["id"] = str(user.pop("_id"))
    user.pop("hashed_password")

    return User(**user)


@router.post("/oauth/google")
async def google_oauth(token: dict):
    """OAuth login with Google (simulation)"""
    # In production, verify token with Google API
    # For now, this is a simulation
    email = token.get("email")
    name = token.get("name")

    if not email or not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth token"
        )

    db = get_database()
    user = db.users.find_one({"email": email})

    if not user:
        # Create new user
        user_dict = {
            "email": email,
            "full_name": name,
            "role": "user",
            "created_at": datetime.utcnow(),
            "is_active": True,
            "hashed_password": ""  # OAuth users don't have password
        }
        result = db.users.insert_one(user_dict)
        user = db.users.find_one({"_id": result.inserted_id})

    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]}
    )

    return {"access_token": access_token, "token_type": "bearer"}
