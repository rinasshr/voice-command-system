import os
import uuid
from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import engine, get_db, Base
from models import User, VoiceRecord
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_admin,
)
from speech import transcribe, extract_command_and_id

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Voice Command Recognition System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# --- Schemas ---

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "operator"


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    role: str | None = None
    is_active: bool | None = None


class RecordOut(BaseModel):
    id: int
    user_id: int
    username: str | None = None
    raw_text: str
    command: str | None
    identifier: str | None
    is_confirmed: bool
    corrected_text: str | None
    created_at: datetime
    duration_seconds: int | None

    class Config:
        from_attributes = True


class RecordCorrection(BaseModel):
    corrected_text: str
    command: str | None = None
    identifier: str | None = None


# --- Startup: create default admin ---

@app.on_event("startup")
def create_default_admin():
    db = next(get_db())
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(
            username="admin",
            hashed_password=hash_password("admin"),
            role="admin",
        )
        db.add(admin)
        db.commit()
    db.close()


# --- Auth endpoints ---

@app.post("/api/auth/register", response_model=UserOut)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Username already exists")
    user = User(
        username=data.username,
        hashed_password=hash_password(data.password),
        role="operator",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/api/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    if not user.is_active:
        raise HTTPException(403, "Account is blocked")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "role": user.role, "username": user.username}


@app.get("/api/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# --- Voice record endpoints ---

@app.post("/api/records/upload")
def upload_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "webm"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(file.file.read())

    try:
        raw_text, duration = transcribe(filepath)
    except Exception as e:
        os.remove(filepath)
        raise HTTPException(500, f"Transcription failed: {e}")

    command, identifier = extract_command_and_id(raw_text)

    record = VoiceRecord(
        user_id=current_user.id,
        audio_path=filename,
        raw_text=raw_text,
        command=command,
        identifier=identifier,
        duration_seconds=int(duration),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "raw_text": raw_text,
        "command": command,
        "identifier": identifier,
        "duration_seconds": record.duration_seconds,
        "created_at": record.created_at.isoformat(),
    }


@app.get("/api/records", response_model=list[RecordOut])
def list_records(
    command: str | None = Query(None),
    identifier: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    username: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(VoiceRecord)

    if current_user.role != "admin":
        q = q.filter(VoiceRecord.user_id == current_user.id)

    if command:
        q = q.filter(VoiceRecord.command.ilike(f"%{command}%"))
    if identifier:
        q = q.filter(VoiceRecord.identifier.ilike(f"%{identifier}%"))
    if date_from:
        q = q.filter(VoiceRecord.created_at >= date_from)
    if date_to:
        q = q.filter(VoiceRecord.created_at <= date_to)
    if username:
        q = q.join(User).filter(User.username.ilike(f"%{username}%"))

    records = q.order_by(VoiceRecord.created_at.desc()).all()

    result = []
    for r in records:
        out = RecordOut.model_validate(r)
        out.username = r.user.username
        result.append(out)
    return result


@app.get("/api/records/{record_id}/audio")
def get_audio(record_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(VoiceRecord).filter(VoiceRecord.id == record_id).first()
    if not record:
        raise HTTPException(404, "Record not found")
    if current_user.role != "admin" and record.user_id != current_user.id:
        raise HTTPException(403, "Access denied")
    filepath = os.path.join(UPLOAD_DIR, record.audio_path)
    if not os.path.exists(filepath):
        raise HTTPException(404, "Audio file not found")
    return FileResponse(filepath, media_type="audio/webm")


@app.put("/api/records/{record_id}/correct")
def correct_record(
    record_id: int,
    data: RecordCorrection,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(VoiceRecord).filter(VoiceRecord.id == record_id).first()
    if not record:
        raise HTTPException(404, "Record not found")
    if current_user.role != "admin" and record.user_id != current_user.id:
        raise HTTPException(403, "Access denied")

    record.corrected_text = data.corrected_text
    if data.command is not None:
        record.command = data.command
    if data.identifier is not None:
        record.identifier = data.identifier
    db.commit()
    return {"status": "corrected"}


@app.put("/api/records/{record_id}/confirm")
def confirm_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(VoiceRecord).filter(VoiceRecord.id == record_id).first()
    if not record:
        raise HTTPException(404, "Record not found")
    record.is_confirmed = True
    db.commit()
    return {"status": "confirmed"}


# --- Admin: user management ---

@app.get("/api/users", response_model=list[UserOut])
def list_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(User).order_by(User.created_at.desc()).all()


@app.post("/api/users", response_model=UserOut)
def create_user(data: UserCreate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Username already exists")
    user = User(
        username=data.username,
        hashed_password=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.put("/api/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    data: UserUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    db.commit()
    db.refresh(user)
    return user
