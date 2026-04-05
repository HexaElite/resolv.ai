from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS
from database import init_db, SessionLocal
from seed import seed_database

from modules.core.router import router as core_router
from modules.ai.router import router as ai_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────
    init_db()
    db = SessionLocal()
    try:
        seeded = seed_database(db)
        if seeded:
            print("✅ Database seeded with demo data")
        else:
            print("📦 Database already contains data, skipping seed")
    finally:
        db.close()
    yield
    # ── Shutdown ─────────────────────────────────────────────


app = FastAPI(
    title="Resolv.AI",
    description="AI-Powered Smart Service Request Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount module routers ─────────────────────────────────────
app.include_router(core_router, tags=["Service Requests"])
app.include_router(ai_router)


@app.get("/")
def root():
    return {
        "name": "Resolv.AI",
        "version": "1.0.0",
        "description": "AI-Powered Smart Service Request Platform",
        "endpoints": {
            "requests": "/requests",
            "dashboard": "/dashboard",
            "ai_analyze": "/ai/analyze",
            "ai_chat": "/ai/chat",
            "ai_alerts": "/ai/alerts",
        },
    }
