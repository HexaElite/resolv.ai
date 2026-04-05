# 🧠 resolv.ai

**AI-Powered Smart Service Request Platform** — NSBM Hackathon 2026

An intelligent campus operations platform that uses Google Gemini to automatically classify, prioritize, and suggest resolutions for service requests. Built with a modular monolithic architecture featuring a Three.js 3D frontend and FastAPI backend.

---

## 🏗️ Architecture

```
resolv.ai/
├── backend/              # FastAPI + SQLite
│   ├── main.py           # App entry point
│   ├── database.py       # SQLAlchemy setup
│   ├── config.py         # Environment config
│   ├── seed.py           # Demo data seeder
│   ├── .env              # API keys (create this)
│   └── modules/
│       ├── core/         # Request CRUD, lifecycle, dashboard
│       ├── ai/           # Gemini integration, chat, analysis
│       └── alerts/       # CRITICAL alerts, SLA breach detection
└── frontend/             # Vite + Three.js
    ├── index.html        # App shell
    └── src/
        ├── main.js       # App orchestrator
        ├── scene.js      # Three.js 3D scene
        ├── api.js        # Axios API client
        └── style.css     # Dark glassmorphism theme
```

---

## ⚡ Quick Start

### Prerequisites

- **Python 3.10+** with [uv](https://docs.astral.sh/uv/) (or pip)
- **Node.js 18+** with pnpm (or npm)
- **Google Gemini API Key** — get one at [aistudio.google.com](https://aistudio.google.com/apikey)

### 1. Clone & Configure

```bash
cd resolv.ai/backend

# Create .env file
echo "GEMINI_API_KEY=your_actual_gemini_api_key" > .env
echo "DATABASE_URL=sqlite:///./resolv.db" >> .env
echo "SLA_BREACH_MINUTES=30" >> .env
```

### 2. Start the Backend

```bash
cd backend

# Install dependencies (using uv)
uv init        # if not already initialized
uv add -r requirements.txt

# Run the server
uv run uvicorn main:app --reload --port 8000
```

The API will be live at **http://localhost:8000**

> On first run, the database is auto-created and seeded with 8 demo requests.

### 3. Start the Frontend

```bash
cd frontend

# Install dependencies
pnpm install   # or: npm install

# Start dev server
pnpm dev       # or: npm run dev
```

The UI will be live at **http://localhost:5173**

> Vite proxies `/api/*` requests to the backend on port 8000.

---

## 🧪 Testing the API

### Health Check

```bash
curl http://localhost:8000/
```

### Dashboard Stats

```bash
curl http://localhost:8000/api/requests/dashboard
```

### List All Requests

```bash
curl http://localhost:8000/api/requests/
```

### List with Filters

```bash
# By status
curl "http://localhost:8000/api/requests/?status=NEW"

# By priority
curl "http://localhost:8000/api/requests/?priority=CRITICAL"

# By category
curl "http://localhost:8000/api/requests/?category=IT"
```

### Create a Request (with AI Auto-Classification)

```bash
curl -X POST http://localhost:8000/api/requests/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "WiFi not working in Library Block B",
    "description": "Students in Library Block B cannot connect to WiFi since 9 AM. About 50 students affected during exam prep.",
    "category": "AUTO",
    "priority": "AUTO",
    "location": "Library Block B"
  }'
```

> Set `category` and `priority` to `"AUTO"` to let Gemini classify them.

### Update Request Status

```bash
# Move from NEW → ASSIGNED
curl -X PUT http://localhost:8000/api/requests/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "ASSIGNED"}'

# Move from ASSIGNED → IN_PROGRESS
curl -X PUT http://localhost:8000/api/requests/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'

# Move from IN_PROGRESS → COMPLETED
curl -X PUT http://localhost:8000/api/requests/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "COMPLETED"}'
```

### Assign a Request

```bash
curl -X PUT http://localhost:8000/api/requests/1/assign \
  -H "Content-Type: application/json" \
  -d '{"assigned_to": "John Silva"}'
```

### AI Analysis (Standalone)

```bash
curl -X POST http://localhost:8000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"description": "The elevator in Building A is making grinding noises and stopped between floors twice today."}'
```

### AI Chat

```bash
curl -X POST http://localhost:8000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "The projector in Room 301 is flickering during lectures"}'
```

### Get Alerts

```bash
curl http://localhost:8000/api/ai/alerts
```

---

## 🎯 Key Features

| Feature | Description |
|---|---|
| 🤖 **AI Classification** | Gemini auto-assigns priority, category, summary, and resolution steps |
| 💬 **AI Chat Assistant** | Natural language issue reporting with structured request extraction |
| 🚨 **Smart Alerts** | Auto-fires for CRITICAL requests and SLA breaches (>30min stuck) |
| 📊 **Live Dashboard** | Real-time metrics with animated count-ups and status/priority charts |
| 🔄 **Lifecycle Management** | NEW → ASSIGNED → IN_PROGRESS → COMPLETED with validation |
| 🎨 **3D Interface** | Three.js particle scene with dark glassmorphism UI |

---

## 🔧 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | *(required)* | Google Gemini API key |
| `DATABASE_URL` | `sqlite:///./resolv.db` | SQLite database path |
| `SLA_BREACH_MINUTES` | `30` | Minutes before SLA breach alert fires |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |

---

## 📋 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/requests/` | List requests (filter by status, category, priority) |
| `POST` | `/api/requests/` | Create request (auto-classifies with AI) |
| `GET` | `/api/requests/{id}` | Get single request |
| `PUT` | `/api/requests/{id}/status` | Update status (lifecycle transition) |
| `PUT` | `/api/requests/{id}/assign` | Assign to technician |
| `GET` | `/api/requests/dashboard` | Aggregated dashboard stats |
| `POST` | `/api/ai/analyze` | Standalone AI analysis |
| `POST` | `/api/ai/chat` | AI chat assistant |
| `GET` | `/api/ai/alerts` | Get active alerts |

---

## 👥 Personas

- **Student** — Submits requests for WiFi, lab equipment, room issues
- **IT Staff** — Handles IT requests, uses dashboard for triage
- **Facilities Manager** — Manages physical infrastructure requests
- **Admin** — Oversees all operations, monitors SLA compliance

---

## 📝 License

Built for NSBM Hackathon 2026.
