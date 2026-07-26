# CultureFlow — Cultural Centre Management System

A modern, production-ready web application to replace paper visitor books, handwritten diaries, printed registers, and spreadsheets at a cultural centre.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + TailwindCSS |
| Backend | FastAPI (Python) |
| Database | PostgreSQL (Neon serverless) |
| Auth | JWT (access + refresh tokens) |
| OCR | Tesseract / PaddleOCR |
| AI | Google Gemini 1.5 Flash |
| Deployment | Render (frontend + backend) + Neon (DB) |

---

## Project Structure

```
cultureflow/
├── backend/          # FastAPI application
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   ├── services/
│   │   └── utils/
│   ├── alembic/
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/         # React + Vite app
    ├── public/
    │   └── icons/
    └── src/
        ├── components/
        │   ├── ui/
        │   └── layout/
        ├── pages/
        ├── hooks/
        ├── services/
        ├── stores/
        ├── types/
        └── utils/
```

---

## Quick Start (Development)

### Prerequisites
- Python 3.11+
- Node.js 20+
- Tesseract OCR installed ([Windows installer](https://github.com/UB-Mannheim/tesseract/wiki))
- Neon PostgreSQL account (free tier works)

---

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env — set DATABASE_URL, SECRET_KEY, etc.

# Run the server
uvicorn app.main:app --reload --port 8000
```

Visit: http://localhost:8000/api/health
API Docs: http://localhost:8000/api/docs

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit: http://localhost:5173

---

### 3. Database Migrations

```bash
cd backend

# Generate first migration (after DB is configured)
alembic revision --autogenerate -m "initial schema"

# Apply migrations
alembic upgrade head
```

---

## Default Admin Account

On first startup, the system automatically creates an admin user:

| Field | Value |
|-------|-------|
| Email | admin@cultureflow.com |
| Password | ChangeMe123! |

> ⚠️ Change the password immediately after first login.

Override via `.env`:
```env
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=YourSecurePassword!
```

---

## Build Order (Modules)

| # | Module | Status |
|---|--------|--------|
| 1 | Project Scaffold | ✅ Done |
| 2 | Authentication | ✅ Done |
| 3 | Dashboard | ✅ Done |
| 4 | Visitor Management | ✅ Done |
| 5 | School Management | ✅ Done |
| 6 | Booking Management | ✅ Done |
| 7 | Finance | ✅ Done |
| 8 | Reports | ✅ Done |
| 9 | AI Digitization | ✅ Done |
| 10 | Global Search | ✅ Done |
| 11 | Admin Panel | ✅ Done |
| 12 | Documentation & Vercel Deploy | ✅ Done |

---

## Environment Variables

### Backend (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon asyncpg connection string |
| `SECRET_KEY` | ✅ | 256-bit random key for JWT signing |
| `GEMINI_API_KEY` | ✅ | Google AI Studio API key |
| `ALGORITHM` | — | JWT algorithm (default: HS256) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | — | Default: 30 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | — | Default: 7 |
| `OCR_ENGINE` | — | `tesseract` or `paddleocr` |
| `TESSERACT_CMD` | — | Path on Windows |
| `UPLOAD_DIR` | — | Default: ./uploads |
| `CORS_ORIGINS` | — | Comma-separated allowed origins |

### Frontend (`.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend URL |
| `VITE_APP_NAME` | App display name |

---

## Deployment (Render)

### Backend (Web Service)
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment:** Set all backend env vars

### Frontend (Static Site)
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Add Redirect Rule:** `/* → /index.html` (for React Router)

---

## PWA Installation

CultureFlow is installable as a Progressive Web App:

1. Visit the site on Chrome/Safari
2. Click "Install" in browser address bar (desktop)
3. On Android: "Add to Home Screen"
4. On iOS: Share → Add to Home Screen

---

## Tesseract Installation

### Windows
Download from: https://github.com/UB-Mannheim/tesseract/wiki
Install and set `TESSERACT_CMD=C:/Program Files/Tesseract-OCR/tesseract.exe`

### Ubuntu/Render
```bash
apt-get install tesseract-ocr
```
No path config needed.

---

## License

Internal use only — Cultural Centre.
