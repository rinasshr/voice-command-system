import logging
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from models import User, VoiceRecord
from schemas import RecordOut, RecordCorrection
from auth import get_current_user
from speech import transcribe, extract_command_and_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/records", tags=["records"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
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

    logger.info("Audio uploaded by %s: %s", current_user.username, filename)

    try:
        raw_text, duration = transcribe(filepath)
    except Exception as e:
        os.remove(filepath)
        logger.error("Transcription failed for %s: %s", filename, e)
        raise HTTPException(500, f"Ошибка распознавания: {e}")

    command, identifier = extract_command_and_id(raw_text)
    logger.info(
        "Transcription result: text='%s', command='%s', id='%s'",
        raw_text, command, identifier,
    )

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


@router.get("", response_model=list[RecordOut])
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

    # Operators see only their own records; admins see all
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


@router.get("/{record_id}/audio")
def get_audio(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(VoiceRecord).filter(VoiceRecord.id == record_id).first()
    if not record:
        raise HTTPException(404, "Запись не найдена")
    if current_user.role != "admin" and record.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")
    filepath = os.path.join(UPLOAD_DIR, record.audio_path)
    if not os.path.exists(filepath):
        raise HTTPException(404, "Аудиофайл не найден")
    return FileResponse(filepath, media_type="audio/webm")


@router.put("/{record_id}/correct")
def correct_record(
    record_id: int,
    data: RecordCorrection,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(VoiceRecord).filter(VoiceRecord.id == record_id).first()
    if not record:
        raise HTTPException(404, "Запись не найдена")
    if current_user.role != "admin" and record.user_id != current_user.id:
        raise HTTPException(403, "Нет доступа")

    record.corrected_text = data.corrected_text
    if data.command is not None:
        record.command = data.command
    if data.identifier is not None:
        record.identifier = data.identifier
    db.commit()
    logger.info("Record #%d corrected by %s", record_id, current_user.username)
    return {"status": "corrected"}


@router.put("/{record_id}/confirm")
def confirm_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(VoiceRecord).filter(VoiceRecord.id == record_id).first()
    if not record:
        raise HTTPException(404, "Запись не найдена")
    record.is_confirmed = True
    db.commit()
    logger.info("Record #%d confirmed by %s", record_id, current_user.username)
    return {"status": "confirmed"}
