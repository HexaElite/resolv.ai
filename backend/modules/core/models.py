import enum
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SAEnum
from database import Base


class StatusEnum(str, enum.Enum):
    NEW = "NEW"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class PriorityEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class CategoryEnum(str, enum.Enum):
    IT = "IT"
    FACILITIES = "FACILITIES"
    HR = "HR"
    SECURITY = "SECURITY"
    OTHER = "OTHER"


VALID_TRANSITIONS = {
    StatusEnum.NEW: [StatusEnum.ASSIGNED],
    StatusEnum.ASSIGNED: [StatusEnum.IN_PROGRESS],
    StatusEnum.IN_PROGRESS: [StatusEnum.COMPLETED],
    StatusEnum.COMPLETED: [],
}


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(SAEnum(CategoryEnum), nullable=False, default=CategoryEnum.OTHER)
    priority = Column(SAEnum(PriorityEnum), nullable=False, default=PriorityEnum.MEDIUM)
    status = Column(SAEnum(StatusEnum), nullable=False, default=StatusEnum.NEW)
    location = Column(String(255), nullable=True)
    summary = Column(Text, nullable=True)
    resolution_steps = Column(Text, nullable=True)  # JSON string of steps list
    assigned_to = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
