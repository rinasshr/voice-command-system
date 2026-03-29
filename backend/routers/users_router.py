import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import UserCreate, UserOut, UserUpdate
from auth import hash_password, require_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("", response_model=UserOut)
def create_user(
    data: UserCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Пользователь с таким логином уже существует")
    user = User(
        username=data.username,
        hashed_password=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Admin %s created user %s (role=%s)", admin.username, user.username, user.role)
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    data: UserUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    if data.role is not None:
        user.role = data.role
        logger.info("Admin %s changed role of %s to %s", admin.username, user.username, data.role)
    if data.is_active is not None:
        user.is_active = data.is_active
        action = "activated" if data.is_active else "blocked"
        logger.info("Admin %s %s user %s", admin.username, action, user.username)
    db.commit()
    db.refresh(user)
    return user
