import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, LargeBinary
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="operator")  # admin / operator
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    records = relationship("VoiceRecord", back_populates="user")


class VoiceRecord(Base):
    __tablename__ = "voice_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    audio_path = Column(String(500), nullable=False)
    raw_text = Column(Text, nullable=False)
    command = Column(String(100), nullable=True)
    identifier = Column(String(200), nullable=True)
    is_confirmed = Column(Boolean, default=False)
    corrected_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    duration_seconds = Column(Integer, nullable=True)

    user = relationship("User", back_populates="records")
