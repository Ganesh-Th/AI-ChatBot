from fastapi import APIRouter, Depends, HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import create_access_token, get_current_user
from app.database import get_db
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/google", response_model=schemas.TokenResponse)
def google_login(body: schemas.GoogleLoginRequest, db: Session = Depends(get_db)):
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not configured on the server.",
        )

    try:
        claims = id_token.verify_oauth2_token(
            body.credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google sign-in credential.",
        )

    email = claims.get("email")
    if not email or not claims.get("email_verified"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A verified Google email is required.",
        )

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        user = models.User(email=email, hashed_password="")
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled.",
        )

    return schemas.TokenResponse(access_token=create_access_token(subject=user.email))


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user
