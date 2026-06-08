import logging
from fastapi import APIRouter, HTTPException, Request
from livekit.api import TokenVerifier, WebhookReceiver
from app.config import LIVEKIT_API_KEY, LIVEKIT_API_SECRET
from app.database import SessionLocal
from app.services import session_service

logger = logging.getLogger("webhook")
router = APIRouter(prefix="/webhook", tags=["webhook"])

_receiver = WebhookReceiver(TokenVerifier(LIVEKIT_API_KEY, LIVEKIT_API_SECRET))

@router.post("/livekit")
async def livekit_webhook(request: Request):
    auth_header = request.headers.get("Authorization", "")
    body = await request.body()

    try:
        event = _receiver.receive(body.decode("utf-8"), auth_header)
    except Exception as exc:
        logger.warning("Webhook signature verification failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid webhook signature") from exc

    event_type: str = event.event
    room_name: str | None = event.room.name if event.room else None
    participant_identity: str | None = (
        event.participant.identity if event.participant else None
    )

    logger.info(
        "LiveKit event: %s | room=%s | participant=%s",
        event_type,
        room_name,
        participant_identity,
    )

    async with SessionLocal() as db:
        match event_type:
            case "room_started":
                if room_name:
                    session = await session_service.get_session_by_room(db, room_name)
                    if session:
                        await session_service.mark_active(db, session.id)

            case "room_finished":
                if room_name:
                    await session_service.fail_sessions_for_room(db, room_name)

            case "participant_joined":
                logger.info(
                    "Participant joined: identity=%s room=%s",
                    participant_identity,
                    room_name,
                )

            case "participant_left":
                logger.info(
                    "Participant left: identity=%s room=%s",
                    participant_identity,
                    room_name,
                )

    return {"ok": True, "event": event_type}
