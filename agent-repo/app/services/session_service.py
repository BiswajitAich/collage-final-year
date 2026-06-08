# import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SessionStatus, VoiceSession

logger = logging.getLogger("session_service")


# def _new_id() -> str:
#     return f"c{uuid.uuid4().hex}"

async def create_session(
    db: AsyncSession,
    user_id: str,
    room_name: str,
    customer_id: str,
    phone_number: Optional[str] = None,
) -> VoiceSession:
    now = datetime.now(timezone.utc)
    session = VoiceSession(
        # id=_new_id(),
        userId=user_id,
        customerId=customer_id,
        status=SessionStatus.PENDING,
        roomName=room_name,
        phoneNumber=phone_number,
        startTime=now,
        createdAt=now,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    logger.info("Session created: id=%s user=%s room=%s customer=%s", session.id, user_id, room_name, customer_id)
    return session

async def get_session(
    db: AsyncSession, session_id: str
) -> Optional[VoiceSession]:
    result = await db.execute(
        select(VoiceSession).where(VoiceSession.id == session_id)
    )
    return result.scalar_one_or_none()


async def get_session_by_room(
    db: AsyncSession, room_name: str
) -> Optional[VoiceSession]:
    """Used by the webhook handler to look up a session from a room name."""
    result = await db.execute(
        select(VoiceSession).where(VoiceSession.roomName == room_name)
    )
    return result.scalar_one_or_none()

async def mark_active(db: AsyncSession, session_id: str) -> None:
    """Called by the webhook when room_started fires."""
    await db.execute(
        update(VoiceSession)
        .where(VoiceSession.id == session_id)
        .where(VoiceSession.status == SessionStatus.PENDING)
        .values(status=SessionStatus.ACTIVE)
    )
    await db.commit()
    logger.info("Session %s → ACTIVE", session_id)


async def end_session(
    db: AsyncSession,
    session_id: str,
    message_count: Optional[int] = None,
    tool_call_count: Optional[int] = None,
    success_rate: Optional[float] = None,
) -> VoiceSession:
    """
    Mark session ENDED and compute duration.
    Safe to call multiple times — second call is a no-op if already ENDED.
    """
    session = await get_session(db, session_id)
    if not session:
        raise ValueError(f"Session not found: {session_id}")

    if session.status == SessionStatus.ENDED:
        return session  # idempotent

    now = datetime.now(timezone.utc)

    # Compute wall-clock duration
    duration: Optional[int] = None
    if session.startTime:
        start = session.startTime
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        duration = max(0, int((now - start).total_seconds()))

    await db.execute(
        update(VoiceSession)
        .where(VoiceSession.id == session_id)
        .values(
            status=SessionStatus.ENDED,
            endTime=now,
            durationSec=duration,
            messageCount=(
                message_count if message_count is not None else session.messageCount
            ),
            toolCallCount=(
                tool_call_count if tool_call_count is not None else session.toolCallCount
            ),
            successRate=(
                success_rate if success_rate is not None else session.successRate
            ),
        )
    )
    await db.commit()
    await db.refresh(session)
    logger.info("Session %s → ENDED (duration=%ss)", session_id, duration)
    return session


async def fail_sessions_for_room(db: AsyncSession, room_name: str) -> None:
    now = datetime.now(timezone.utc)
    await db.execute(
        update(VoiceSession)
        .where(VoiceSession.roomName == room_name)
        .where(VoiceSession.status.notin_([
            SessionStatus.ENDED,
            SessionStatus.FAILED,
        ]))
        .values(status=SessionStatus.FAILED, endTime=now)
    )
    await db.commit()
    logger.info("Sessions for room=%s marked FAILED", room_name)
