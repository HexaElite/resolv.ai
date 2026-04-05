from pydantic import BaseModel
from typing import List, Optional


class AnalyzeRequest(BaseModel):
    description: str

    class Config:
        json_schema_extra = {
            "example": {
                "description": "Server is down and exams are happening"
            }
        }


class AnalyzeResponse(BaseModel):
    priority: str
    category: str
    summary: str
    resolution_steps: List[str]


class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    structured_request: Optional[dict] = None
