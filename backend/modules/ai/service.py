import json
import google.generativeai as genai
from config import GEMINI_API_KEY

SYSTEM_PROMPT = """You are a service triage assistant for a university campus. 
Given a service request description, analyze it and return a JSON object with:

{
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "category": "IT" | "FACILITIES" | "HR" | "SECURITY" | "OTHER",
  "summary": "A concise 1-2 sentence summary of the issue",
  "resolution_steps": ["Step 1", "Step 2", "Step 3", ...]
}

Priority guidelines:
- CRITICAL: Safety risk, active exam disruption, complete service failure
- HIGH: Blocking work/classes, needs fix within 1 hour
- MEDIUM: Inconvenient but workaround exists, fix within 24 hours
- LOW: Nice-to-have, cosmetic, scheduled maintenance

Category guidelines:
- IT: Servers, WiFi, computers, software, printers, network
- FACILITIES: AC, plumbing, electrical, furniture, cleaning, rooms
- HR: Staff issues, payroll, leave, contracts
- SECURITY: Access control, theft, safety hazards, surveillance
- OTHER: Anything that doesn't fit above

Return ONLY valid JSON, no markdown, no explanation."""

CHAT_SYSTEM_PROMPT = """You are resolv.ai, a helpful AI assistant for a university campus service request platform.
Help users describe their issues clearly. If they describe a problem, extract key details and offer to create a structured service request.

If the user describes an issue, respond with helpful guidance AND include a JSON block at the end like:
```json
{
  "title": "Brief title",
  "description": "Detailed description",
  "category": "IT|FACILITIES|HR|SECURITY|OTHER",
  "priority": "LOW|MEDIUM|HIGH|CRITICAL",
  "location": "Location if mentioned"
}
```

Be conversational, empathetic, and efficient."""


class AIService:
    """Google Gemini API integration for request analysis and chat."""

    def __init__(self):
        self.model = None
        if GEMINI_API_KEY:
            genai.configure(api_key=GEMINI_API_KEY)
            self.model = genai.GenerativeModel(
                "gemini-2.0-flash",
                system_instruction=SYSTEM_PROMPT,
            )
            self.chat_model = genai.GenerativeModel(
                "gemini-2.0-flash",
                system_instruction=CHAT_SYSTEM_PROMPT,
            )

    async def analyze_request(self, description: str) -> dict:
        """Analyze a request description and return priority, category, summary, steps."""
        if not self.model:
            return self._fallback_analysis(description)

        try:
            response = self.model.generate_content(description)
            response_text = response.text.strip()

            # Parse JSON from response
            try:
                result = json.loads(response_text)
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code block
                if "```" in response_text:
                    json_str = response_text.split("```")[1]
                    if json_str.startswith("json"):
                        json_str = json_str[4:]
                    result = json.loads(json_str.strip())
                else:
                    return self._fallback_analysis(description)

            # Validate fields
            valid_priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
            valid_categories = ["IT", "FACILITIES", "HR", "SECURITY", "OTHER"]

            if result.get("priority") not in valid_priorities:
                result["priority"] = "MEDIUM"
            if result.get("category") not in valid_categories:
                result["category"] = "OTHER"
            if "summary" not in result:
                result["summary"] = description[:100]
            if "resolution_steps" not in result:
                result["resolution_steps"] = ["Investigate the reported issue", "Apply appropriate fix", "Verify resolution"]

            return result

        except Exception:
            return self._fallback_analysis(description)

    async def chat(self, message: str, context: str = None) -> dict:
        """Chat assistant for issue submission."""
        if not self.model:
            return {
                "reply": "AI service is not configured. Please submit your request using the form.",
                "structured_request": None,
            }

        try:
            prompt_parts = []
            if context:
                prompt_parts.append(f"Previous context: {context}\n\n")
            prompt_parts.append(message)

            response = self.chat_model.generate_content("".join(prompt_parts))
            reply_text = response.text.strip()

            # Try to extract structured request from reply
            structured = None
            if "```json" in reply_text:
                try:
                    json_part = reply_text.split("```json")[1].split("```")[0].strip()
                    structured = json.loads(json_part)
                except (json.JSONDecodeError, IndexError):
                    pass

            return {
                "reply": reply_text,
                "structured_request": structured,
            }

        except Exception as e:
            return {
                "reply": f"I encountered an issue processing your request. Please try the form instead. Error: {str(e)}",
                "structured_request": None,
            }

    @staticmethod
    def _fallback_analysis(description: str) -> dict:
        """Rule-based fallback when AI is unavailable."""
        desc_lower = description.lower()

        # Priority detection
        priority = "MEDIUM"
        if any(w in desc_lower for w in ["down", "crash", "emergency", "critical", "exam", "urgent", "fire"]):
            priority = "CRITICAL"
        elif any(w in desc_lower for w in ["broken", "not working", "failed", "can't access"]):
            priority = "HIGH"
        elif any(w in desc_lower for w in ["slow", "intermittent", "uncomfortable"]):
            priority = "MEDIUM"
        elif any(w in desc_lower for w in ["request", "schedule", "minor", "cosmetic"]):
            priority = "LOW"

        # Category detection
        category = "OTHER"
        if any(w in desc_lower for w in ["wifi", "server", "computer", "network", "printer", "software", "login", "password", "internet"]):
            category = "IT"
        elif any(w in desc_lower for w in ["ac", "air conditioning", "plumbing", "electrical", "room", "furniture", "cleaning", "light", "door"]):
            category = "FACILITIES"
        elif any(w in desc_lower for w in ["staff", "payroll", "leave", "contract", "hr"]):
            category = "HR"
        elif any(w in desc_lower for w in ["security", "theft", "access", "cctv", "guard", "safety"]):
            category = "SECURITY"

        return {
            "priority": priority,
            "category": category,
            "summary": description[:150],
            "resolution_steps": [
                "Investigate the reported issue",
                "Contact relevant department",
                "Apply appropriate fix",
                "Verify resolution with requester",
            ],
        }
