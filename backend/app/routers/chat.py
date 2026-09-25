from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from google import genai
from google.genai import types

from app import models, schemas
from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db

router = APIRouter(prefix="/chat", tags=["chat"])
settings = get_settings()


def _get_gemini_client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


# ── Chat CRUD ─────────────────────────────────────────────────────────────────

@router.post("/sessions", response_model=schemas.ChatOut, status_code=status.HTTP_201_CREATED)
def create_chat(
    body: schemas.ChatCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = models.Chat(user_id=current_user.id, title=body.title or "New Chat")
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


@router.get("/sessions", response_model=List[schemas.ChatOut])
def list_chats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Chat)
        .filter(models.Chat.user_id == current_user.id)
        .order_by(models.Chat.updated_at.desc())
        .all()
    )


@router.delete("/sessions/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat(
    chat_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = db.query(models.Chat).filter(
        models.Chat.id == chat_id, models.Chat.user_id == current_user.id
    ).first()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")
    db.delete(chat)
    db.commit()


@router.get("/sessions/{chat_id}/messages", response_model=List[schemas.MessageOut])
def get_messages(
    chat_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = db.query(models.Chat).filter(
        models.Chat.id == chat_id, models.Chat.user_id == current_user.id
    ).first()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")
    return chat.messages


# ── Send message ──────────────────────────────────────────────────────────────

@router.post("/send", response_model=schemas.SendMessageResponse)
def send_message(
    body: schemas.SendMessageRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Validate chat ownership
    chat = db.query(models.Chat).filter(
        models.Chat.id == body.chat_id, models.Chat.user_id == current_user.id
    ).first()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")

    if not body.content.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message cannot be empty.")

    # Persist user message
    user_msg = models.Message(chat_id=chat.id, role="user", content=body.content)
    db.add(user_msg)
    db.flush()

    # Build conversation history for Gemini (1.x API: Contents list)
    history_msgs = chat.messages  # already ordered by created_at
    contents = []
    for msg in history_msgs:
        role = "user" if msg.role == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=msg.content)]))
    # Add the new user message
    contents.append(types.Content(role="user", parts=[types.Part(text=body.content)]))

    # Call Gemini using 1.x generate_content API
    try:
        client = _get_gemini_client()
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "You are a helpful, friendly AI assistant. "
                    "Keep responses concise and conversational. "
                    "Use markdown formatting when appropriate."
                ),
                max_output_tokens=2048,
                temperature=0.7,
            ),
        )
        assistant_text = response.text or "I'm sorry, I couldn't generate a response."
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini API error: {str(exc)}",
        )

    # Persist assistant message
    assistant_msg = models.Message(chat_id=chat.id, role="assistant", content=assistant_text)
    db.add(assistant_msg)

    # Auto-update chat title from first user message
    if chat.title == "New Chat":
        chat.title = body.content[:50] + ("..." if len(body.content) > 50 else "")

    chat.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user_msg)
    db.refresh(assistant_msg)

    return schemas.SendMessageResponse(user_message=user_msg, assistant_message=assistant_msg)
