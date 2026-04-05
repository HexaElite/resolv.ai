import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./resolv.db")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
SLA_BREACH_MINUTES = int(os.getenv("SLA_BREACH_MINUTES", "30"))
