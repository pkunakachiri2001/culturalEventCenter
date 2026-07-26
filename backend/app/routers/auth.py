"""
CultureFlow — Authentication Router
Login, token refresh, logout, profile management, and password updates.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.auth import (
    PasswordChangeRequest,
    ProfileUpdateRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserOut,
)
from app.schemas.common import SuccessResponse
from app.utils.deps import get_current_active_user, get_db
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

from fastapi import APIRouter, Depends, HTTPException, Request, status


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user with email/username and password. Universal handler for JSON & Form Data."""
    username = None
    password = None

    # 1. Try parsing JSON body
    try:
        body = await request.json()
        if isinstance(body, dict):
            username = body.get("username") or body.get("email")
            password = body.get("password")
    except BaseException:
        pass

    # 2. Fallback: Parse raw URL-encoded query string from body bytes
    if not username or not password:
        try:
            raw_bytes = await request.body()
            raw_str = raw_bytes.decode("utf-8")
            import urllib.parse
            parsed_form = urllib.parse.parse_qs(raw_str)
            if "username" in parsed_form:
                username = parsed_form["username"][0]
            elif "email" in parsed_form:
                username = parsed_form["email"][0]
            if "password" in parsed_form:
                password = parsed_form["password"][0]
        except BaseException:
            pass

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Missing email/username or password in request body",
        )

    email_to_check = str(username).strip().lower()

    result = await db.execute(select(User).where(User.email == email_to_check))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # Update last login timestamp
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    access_token = create_access_token(
        subject=user.id,
        claims={"email": user.email, "role": user.role.value},
    )
    refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.get("/me", response_model=UserOut)
async def get_me(
    current_user: User = Depends(get_current_active_user),
):
    """Get profile information for current authenticated user."""
    return current_user


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Obtain fresh access and refresh tokens using valid refresh token."""
    decoded = decode_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id_str = decoded.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    result = await db.execute(select(User).where(User.id == user_id_str))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account unavailable",
        )

    new_access_token = create_access_token(
        subject=user.id,
        claims={"email": user.email, "role": user.role.value},
    )
    new_refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
    )


@router.post("/logout", response_model=SuccessResponse)
async def logout(
    current_user: User = Depends(get_current_active_user),
):
    """Logout endpoint. Client side discards tokens."""
    return SuccessResponse(message="Successfully logged out")


@router.put("/profile", response_model=UserOut)
async def update_profile(
    data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user profile info."""
    current_user.full_name = data.full_name
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/password", response_model=SuccessResponse)
async def change_password(
    data: PasswordChangeRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Change current user password."""
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = hash_password(data.new_password)
    await db.commit()
    return SuccessResponse(message="Password successfully updated")
