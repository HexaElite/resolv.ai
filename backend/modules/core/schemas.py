from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


# ── Request Schemas ──────────────────────────────────────────
class RequestCreate(BaseModel):
    title: str
    description: str
    category: str = "AUTO"
    priority: str = "AUTO"
    location: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Server down",
                "description": "Main exam server is not responding",
                "category": "AUTO",
                "priority": "AUTO",
                "location": "Lab 3",
            }
        }


class RequestResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    priority: str
    status: str
    location: Optional[str] = None
    summary: Optional[str] = None
    resolution_steps: Optional[List[str]] = None
    assigned_to: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StatusUpdate(BaseModel):
    status: str


class AssignUpdate(BaseModel):
    assigned_to: str


# ── Dashboard Schemas ────────────────────────────────────────
class DashboardStats(BaseModel):
    total: int
    by_status: dict
    by_priority: dict
    open_count: int
    critical_count: int
    completed_count: int
