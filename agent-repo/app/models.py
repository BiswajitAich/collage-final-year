import enum
from datetime import datetime, timezone
import uuid

from sqlalchemy import Column, DateTime, Enum, Float, Integer, String
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class SessionStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    ENDED = "ENDED"
    FAILED = "FAILED"


class VoiceSession(Base):
    __tablename__ = "VoiceSession"

    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    userId = Column(String, nullable=False, index=True)
    customerId = Column(String, nullable=False, index=True)
    status = Column(
        Enum(SessionStatus, name="SessionStatus"),
        nullable=False, 
        default=SessionStatus.PENDING
    )
    startTime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    endTime = Column(DateTime(timezone=True), nullable=True)
    durationSec = Column(Integer, nullable=True)
    messageCount = Column(Integer, default=0, nullable=False)
    toolCallCount = Column(Integer, default=0, nullable=False)
    successRate = Column(Float, default=0.0, nullable=False)
    createdAt = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    roomName = Column(String, nullable=True)     
    phoneNumber = Column(String, nullable=True)  