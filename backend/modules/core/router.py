import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from modules.core.schemas import RequestCreate, RequestResponse, StatusUpdate, AssignUpdate, DashboardStats
from modules.core.service import CoreService
from modules.ai.service import AIService

router = APIRouter()


def _to_response(req) -> dict:
    """Convert a ServiceRequest ORM object to a response dict."""
    steps = []
    if req.resolution_steps:
        try:
            steps = json.loads(req.resolution_steps)
        except (json.JSONDecodeError, TypeError):
            steps = []
    return {
        "id": req.id,
        "title": req.title,
        "description": req.description,
        "category": req.category.value if hasattr(req.category, "value") else str(req.category),
        "priority": req.priority.value if hasattr(req.priority, "value") else str(req.priority),
        "status": req.status.value if hasattr(req.status, "value") else str(req.status),
        "location": req.location,
        "summary": req.summary,
        "resolution_steps": steps,
        "assigned_to": req.assigned_to,
        "created_at": req.created_at,
        "updated_at": req.updated_at,
    }


@router.post("/requests", response_model=RequestResponse)
async def create_request(data: RequestCreate, db: Session = Depends(get_db)):
    ai_service = AIService()
    req = await CoreService.create_request(db, data, ai_service)

    # Trigger CRITICAL alert
    from modules.alerts.service import AlertService
    if req.priority.value == "CRITICAL" if hasattr(req.priority, "value") else req.priority == "CRITICAL":
        AlertService.trigger_critical_alert(req)

    return _to_response(req)


@router.get("/requests")
def list_requests(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    requests = CoreService.get_requests(db, status, category, priority)
    return [_to_response(r) for r in requests]


@router.get("/requests/{request_id}", response_model=RequestResponse)
def get_request(request_id: int, db: Session = Depends(get_db)):
    req = CoreService.get_request_by_id(db, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return _to_response(req)


@router.put("/requests/{request_id}/status", response_model=RequestResponse)
def update_status(request_id: int, data: StatusUpdate, db: Session = Depends(get_db)):
    try:
        req = CoreService.update_status(db, request_id, data.status)
        return _to_response(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/requests/{request_id}/assign", response_model=RequestResponse)
def assign_request(request_id: int, data: AssignUpdate, db: Session = Depends(get_db)):
    try:
        req = CoreService.assign_request(db, request_id, data.assigned_to)
        return _to_response(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(db: Session = Depends(get_db)):
    return CoreService.get_dashboard(db)
