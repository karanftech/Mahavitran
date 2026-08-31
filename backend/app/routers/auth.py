from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime

from app.database import get_database
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.utils.security import verify_password, get_password_hash, create_access_token
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_field_officer(
    request: RegisterRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    clean_email = request.email.lower().strip()

    # 1. Check if email already registered
    existing_user = await db.users.find_one({"email": clean_email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    # 2. Create User Account Document
    user_doc = {
        "email": clean_email,
        "password_hash": get_password_hash(request.password),
        "full_name": request.full_name,
        "role": "field_officer",
        "phone": request.phone or "",
        "is_active": True,
        "created_at": now_str
    }
    user_res = await db.users.insert_one(user_doc)
    user_id_str = str(user_res.inserted_id)

    # 3. Create Field Officer Profile
    officer_count = await db.officers.count_documents({})
    officer_id = f"OFF-{1001 + officer_count}"

    officer_doc = {
        "officer_id": officer_id,
        "user_id": user_id_str,
        "full_name": request.full_name,
        "email": clean_email,
        "phone": request.phone or "",
        "assigned_area": request.assigned_area or "Central Ward",
        "target_collections_count": 15,
        "target_collection_amount": 30000.0,
        "current_latitude": 21.1458,
        "current_longitude": 79.0882,
        "is_active": True,
        "created_at": now_str
    }
    await db.officers.insert_one(officer_doc)

    # 4. Generate JWT Token
    access_token = create_access_token(
        data={"sub": clean_email, "role": "field_officer", "user_id": user_id_str}
    )

    user_resp = UserResponse(
        id=user_id_str,
        email=clean_email,
        full_name=request.full_name,
        role="field_officer",
        phone=request.phone,
        officer_id=officer_id,
        is_active=True
    )

    return TokenResponse(access_token=access_token, user=user_resp)

@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    clean_email = request.email.lower().strip()
    user = await db.users.find_one({"email": clean_email})
    if not user or not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )

    # Fetch officer_id if field officer
    officer_id = None
    if user.get("role") == "field_officer":
        officer = await db.officers.find_one({"user_id": str(user["_id"])})
        if officer:
            officer_id = officer.get("officer_id")

    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"], "user_id": str(user["_id"])}
    )

    user_resp = UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        full_name=user.get("full_name", ""),
        role=user.get("role", "field_officer"),
        phone=user.get("phone"),
        officer_id=officer_id,
        is_active=user.get("is_active", True)
    )

    return TokenResponse(access_token=access_token, user=user_resp)

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    officer_id = None
    if current_user.get("role") == "field_officer":
        officer = await db.officers.find_one({"user_id": current_user["_id"]})
        if officer:
            officer_id = officer.get("officer_id")

    return UserResponse(
        id=current_user["_id"],
        email=current_user["email"],
        full_name=current_user.get("full_name", ""),
        role=current_user.get("role", "field_officer"),
        phone=current_user.get("phone"),
        officer_id=officer_id,
        is_active=current_user.get("is_active", True)
    )
