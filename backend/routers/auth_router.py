import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import UserCreate, UserOut, TokenOut
from auth import hash_password, verify_password, create_access_token, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut)
def register(data: UserCreate, db: Session = Depends(get_db)):
    username = data.username.strip()

    if not username.isalnum():
        raise HTTPException(400, "Логин может содержать только буквы и цифры")

    if db.query(User).filter(User.username == username).first():
        raise HTTPException(409, "Пользователь с таким логином уже существует")

    user = User(
        username=username,
        hashed_password=hash_password(data.password),
        role="operator",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("User registered: %s", user.username)
    return user


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        logger.warning("Failed login attempt for: %s", form.username)
        raise HTTPException(401, "Неверный логин или пароль")
    if not user.is_active:
        logger.warning("Blocked user login attempt: %s", form.username)
        raise HTTPException(403, "Учётная запись заблокирована. Обратитесь к администратору")

    token = create_access_token({"sub": str(user.id)})
    logger.info("User logged in: %s", user.username)
    return TokenOut(access_token=token, role=user.role, username=user.username)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
