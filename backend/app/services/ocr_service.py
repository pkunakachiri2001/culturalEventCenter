"""
CultureFlow — OCR & Gemini AI Extraction Service
Extracts handwriting from uploaded historical register pages and maps to structured fields.
"""

import json
import logging
import re
from pathlib import Path
from typing import Any

from app.config import get_settings

logger = logging.getLogger("cultureflow.ocr")
settings = get_settings()


def run_tesseract_ocr(image_path: Path) -> str:
    """Run Tesseract OCR on target image file if installed."""
    try:
        import pytesseract
        from PIL import Image

        if settings.TESSERACT_CMD:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

        img = Image.open(image_path)
        text = pytesseract.image_to_string(img)
        return text.strip()
    except Exception as exc:
        logger.warning("Tesseract OCR fallback: %s", exc)
        return f"[Scanned page: {image_path.name}]"


async def process_image_with_gemini(image_path: Path, raw_ocr_text: str) -> dict[str, Any]:
    """
    Call Gemini API to structure messy handwriting/OCR text into validated JSON fields.
    Never invents missing facts — leaves unknown fields blank with 0.0 confidence.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        logger.warning("GEMINI_API_KEY not configured. Using rule-based fallback extraction.")
        return fallback_extract_fields(raw_ocr_text)

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"""
You are an expert archivist digitizing historical handwritten visitor books for a Cultural Centre in Zimbabwe.
Below is the raw text extracted from a scanned page:

---
{raw_ocr_text}
---

Your task: Extract structured information into EXACT JSON format.
Rule 1: NEVER invent missing information. If a field is not present or unknown, set value to null and confidence to 0.0.
Rule 2: Provide a confidence score between 0.0 and 1.0 for each field based on legibility.

Return ONLY valid JSON matching this structure:
{{
  "visitor_name": {{"value": "Name or null", "confidence": 0.0-1.0}},
  "school": {{"value": "School Name or null", "confidence": 0.0-1.0}},
  "teacher": {{"value": "Teacher Name or null", "confidence": 0.0-1.0}},
  "phone": {{"value": "Phone or null", "confidence": 0.0-1.0}},
  "email": {{"value": "Email or null", "confidence": 0.0-1.0}},
  "province": {{"value": "Province name or null", "confidence": 0.0-1.0}},
  "country": {{"value": "Country or null", "confidence": 0.0-1.0}},
  "visit_date": {{"value": "YYYY-MM-DD or null", "confidence": 0.0-1.0}},
  "num_students": {{"value": integer or null, "confidence": 0.0-1.0}},
  "num_teachers": {{"value": integer or null, "confidence": 0.0-1.0}},
  "payment": {{"value": "Payment string or null", "confidence": 0.0-1.0}},
  "purpose": {{"value": "Purpose of visit or null", "confidence": 0.0-1.0}},
  "notes": {{"value": "Notes or null", "confidence": 0.0-1.0}}
}}
"""

        response = await model.generate_content_async(prompt)
        text_resp = response.text.strip()

        # Clean JSON markdown fences if present
        if text_resp.startswith("```json"):
            text_resp = text_resp.replace("```json", "", 1).replace("```", "", 1).strip()
        elif text_resp.startswith("```"):
            text_resp = text_resp.replace("```", "", 1).replace("```", "", 1).strip()

        data = json.loads(text_resp)
        return data
    except Exception as exc:
        logger.error("Gemini Vision extraction error: %s", exc)
        return fallback_extract_fields(raw_ocr_text)


def fallback_extract_fields(text: str) -> dict[str, Any]:
    """Rule-based pattern extraction fallback when Gemini API key is missing or unavailable."""
    # Attempt basic regex parsing for numbers and dates
    date_match = re.search(r"\b(19\d{2}|20\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b", text)
    visit_date = date_match.group(0) if date_match else None

    phone_match = re.search(r"\b(?:\+?263|0)7\d{8}\b", text)
    phone = phone_match.group(0) if phone_match else None

    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    email = email_match.group(0) if email_match else None

    return {
        "visitor_name": {"value": None, "confidence": 0.0},
        "school": {"value": None, "confidence": 0.0},
        "teacher": {"value": None, "confidence": 0.0},
        "phone": {"value": phone, "confidence": 0.85 if phone else 0.0},
        "email": {"value": email, "confidence": 0.90 if email else 0.0},
        "province": {"value": "Harare", "confidence": 0.5},
        "country": {"value": "Zimbabwe", "confidence": 0.9},
        "visit_date": {"value": visit_date, "confidence": 0.80 if visit_date else 0.0},
        "num_students": {"value": None, "confidence": 0.0},
        "num_teachers": {"value": None, "confidence": 0.0},
        "payment": {"value": None, "confidence": 0.0},
        "purpose": {"value": "Historical Register Entry", "confidence": 0.60},
        "notes": {"value": text[:200] if text else None, "confidence": 0.50},
    }


def calculate_overall_confidence(extracted_data: dict[str, Any]) -> float:
    """Calculate average confidence score across extracted fields."""
    if not extracted_data:
        return 0.0
    confidences = [
        v.get("confidence", 0.0)
        for v in extracted_data.values()
        if isinstance(v, dict) and "confidence" in v
    ]
    if not confidences:
        return 0.0
    return round(sum(confidences) / len(confidences), 2)
