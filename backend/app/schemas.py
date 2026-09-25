from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ── Auth schemas ──────────────────────────────────────────────────────────────

class GoogleLoginRequest(BaseModel):
    credential: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Chat schemas ──────────────────────────────────────────────────────────────

class ChatCreate(BaseModel):
    title: Optional[str] = "New Chat"


class ChatOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── Message schemas ───────────────────────────────────────────────────────────

class SendMessageRequest(BaseModel):
    chat_id: int
    content: str


class MessageOut(BaseModel):
    id: int
    chat_id: int
    role: str
    content: str
    created_at: datetime
    model_config = {"from_attributes": True}


class SendMessageResponse(BaseModel):
    user_message: MessageOut
    assistant_message: MessageOut
