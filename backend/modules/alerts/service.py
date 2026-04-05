import uuid
from datetime import datetime, timezone, timedelta
from typing import List

from modules.alerts.schemas import Alert
from config import SLA_BREACH_MINUTES

# ── In-memory alert store ────────────────────────────────────
_alerts: List[Alert] = []


class AlertService:
    """Alert engine for CRITICAL requests and SLA breaches."""

    @staticmethod
    def trigger_critical_alert(request) -> Alert:
        """Fire an alert when a CRITICAL request is created."""
        alert = Alert(
            id=str(uuid.uuid4()),
            type="CRITICAL",
            message=f"🚨 CRITICAL request created: {request.title}",
            request_id=request.id,
            request_title=request.title,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        _alerts.append(alert)
        return alert

    @staticmethod
    def check_sla_breaches(db) -> List[Alert]:
        """Scan for IN_PROGRESS requests exceeding SLA threshold."""
        from modules.core.models import ServiceRequest, StatusEnum

        threshold = datetime.now(timezone.utc) - timedelta(minutes=SLA_BREACH_MINUTES)
        breached = (
            db.query(ServiceRequest)
            .filter(
                ServiceRequest.status == StatusEnum.IN_PROGRESS,
                ServiceRequest.updated_at < threshold,
            )
            .all()
        )

        new_alerts = []
        existing_ids = {a.request_id for a in _alerts if a.type == "SLA_BREACH"}

        for req in breached:
            if req.id not in existing_ids:
                alert = Alert(
                    id=str(uuid.uuid4()),
                    type="SLA_BREACH",
                    message=f"⏰ SLA breach: \"{req.title}\" has been IN_PROGRESS for over {SLA_BREACH_MINUTES} minutes",
                    request_id=req.id,
                    request_title=req.title,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )
                _alerts.append(alert)
                new_alerts.append(alert)

        return new_alerts

    @staticmethod
    def get_active_alerts() -> List[dict]:
        """Return non-dismissed alerts."""
        return [a.model_dump() for a in _alerts if not a.dismissed]

    @staticmethod
    def dismiss_alert(alert_id: str) -> bool:
        """Dismiss an alert by its ID."""
        for alert in _alerts:
            if alert.id == alert_id:
                alert.dismissed = True
                return True
        return False

    @staticmethod
    def clear_all():
        """Clear all alerts (used in testing)."""
        _alerts.clear()
