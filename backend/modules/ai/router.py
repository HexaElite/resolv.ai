from fastapi import APIRouter

from modules.ai.schemas import AnalyzeRequest, AnalyzeResponse, ChatRequest, ChatResponse
from modules.ai.service import AIService
from modules.alerts.service import AlertService

router = APIRouter(prefix="/ai", tags=["AI"])

ai_service = AIService()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_request(data: AnalyzeRequest):
    """Analyze a request description using AI. Returns priority, category, summary, and resolution steps."""
    result = await ai_service.analyze_request(data.description)
    return AnalyzeResponse(
        priority=result["priority"],
        category=result["category"],
        summary=result["summary"],
        resolution_steps=result["resolution_steps"],
    )


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(data: ChatRequest):
    """Chat with the AI assistant to describe issues conversationally."""
    result = await ai_service.chat(data.message, data.context)
    return ChatResponse(
        reply=result["reply"],
        structured_request=result.get("structured_request"),
    )


@router.get("/alerts")
def get_alerts():
    """Return active alerts (CRITICAL + SLA breaches). Frontend polls this every 10s."""
    return AlertService.get_active_alerts()
