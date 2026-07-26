"""
Vercel Serverless Function entry point for FastAPI backend.
Allows full-stack CultureFlow deployment on Vercel without separate backend hosting.
"""

import sys
from pathlib import Path

# Add backend directory to Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.main import app
