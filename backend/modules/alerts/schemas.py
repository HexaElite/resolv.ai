from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class Alert(BaseModel):
    id: str
    type: str  # "CRITICAL" or "SLA_BREACH"
    message: str
    request_id: int
    request_title: str
    timestamp: str
    dismissed: bool = False
