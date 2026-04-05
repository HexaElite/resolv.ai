import json
from typing import Optional, List
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy import func

from modules.core.models import ServiceRequest, StatusEnum, PriorityEnum, CategoryEnum, VALID_TRANSITIONS
from modules.core.schemas import RequestCreate, DashboardStats


class CoreService:
    """Business logic for service request management."""

    @staticmethod
    async def create_request(db: Session, data: RequestCreate, ai_service=None) -> ServiceRequest:
        """Create a new service request. If category/priority is AUTO, call AI."""
        category = data.category
        priority = data.priority
        summary = None
        resolution_steps = None

        # ── Auto-classify via AI ─────────────────────────────
        if ai_service and (category == "AUTO" or priority == "AUTO"):
            try:
                analysis = await ai_service.analyze_request(data.description)
                if category == "AUTO":
                    category = analysis.get("category", "OTHER")
                if priority == "AUTO":
                    priority = analysis.get("priority", "MEDIUM")
                summary = analysis.get("summary", "")
                resolution_steps = json.dumps(analysis.get("resolution_steps", []))
            except Exception:
                if category == "AUTO":
                    category = "OTHER"
                if priority == "AUTO":
                    priority = "MEDIUM"

        # Validate enums
        try:
            category = CategoryEnum(category)
        except ValueError:
            category = CategoryEnum.OTHER
        try:
            priority = PriorityEnum(priority)
        except ValueError:
            priority = PriorityEnum.MEDIUM

        request = ServiceRequest(
            title=data.title,
            description=data.description,
            category=category,
            priority=priority,
            status=StatusEnum.NEW,
            location=data.location,
            summary=summary,
            resolution_steps=resolution_steps,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(request)
        db.commit()
        db.refresh(request)
        return request

    @staticmethod
    def get_requests(
        db: Session,
        status: Optional[str] = None,
        category: Optional[str] = None,
        priority: Optional[str] = None,
    ) -> List[ServiceRequest]:
        """List requests with optional filters."""
        query = db.query(ServiceRequest)
        if status:
            query = query.filter(ServiceRequest.status == status)
        if category:
            query = query.filter(ServiceRequest.category == category)
        if priority:
            query = query.filter(ServiceRequest.priority == priority)
        return query.order_by(ServiceRequest.created_at.desc()).all()

    @staticmethod
    def get_request_by_id(db: Session, request_id: int) -> Optional[ServiceRequest]:
        return db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()

    @staticmethod
    def update_status(db: Session, request_id: int, new_status: str) -> ServiceRequest:
        """Update status with lifecycle validation."""
        request = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
        if not request:
            raise ValueError("Request not found")

        try:
            new_status_enum = StatusEnum(new_status)
        except ValueError:
            raise ValueError(f"Invalid status: {new_status}")

        current = StatusEnum(request.status)
        allowed = VALID_TRANSITIONS.get(current, [])
        if new_status_enum not in allowed:
            raise ValueError(
                f"Invalid transition: {current.value} → {new_status_enum.value}. "
                f"Allowed: {[s.value for s in allowed]}"
            )

        request.status = new_status_enum
        request.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(request)
        return request

    @staticmethod
    def assign_request(db: Session, request_id: int, assigned_to: str) -> ServiceRequest:
        """Assign request to a person and set status to ASSIGNED."""
        request = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
        if not request:
            raise ValueError("Request not found")

        request.assigned_to = assigned_to
        if StatusEnum(request.status) == StatusEnum.NEW:
            request.status = StatusEnum.ASSIGNED
        request.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(request)
        return request

    @staticmethod
    def get_dashboard(db: Session) -> DashboardStats:
        """Aggregate stats for the dashboard."""
        total = db.query(func.count(ServiceRequest.id)).scalar()

        by_status = {}
        for s in StatusEnum:
            count = db.query(func.count(ServiceRequest.id)).filter(
                ServiceRequest.status == s
            ).scalar()
            by_status[s.value] = count

        by_priority = {}
        for p in PriorityEnum:
            count = db.query(func.count(ServiceRequest.id)).filter(
                ServiceRequest.priority == p
            ).scalar()
            by_priority[p.value] = count

        return DashboardStats(
            total=total,
            by_status=by_status,
            by_priority=by_priority,
            open_count=by_status.get("NEW", 0) + by_status.get("ASSIGNED", 0) + by_status.get("IN_PROGRESS", 0),
            critical_count=by_priority.get("CRITICAL", 0),
            completed_count=by_status.get("COMPLETED", 0),
        )
