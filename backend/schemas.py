from datetime import datetime
from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=4, max_length=72)
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


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
