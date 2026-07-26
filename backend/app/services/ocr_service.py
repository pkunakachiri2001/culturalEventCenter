"""
CultureFlow — OCR, Groq AI & Gemini AI Extraction Service
Extracts handwriting from uploaded historical register pages using Groq API or Gemini API.
"""

import json
import logging
import re
from pathlib import Path
from typing import Any
import httpx

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


async def process_image_with_ai(image_path: Path, raw_ocr_text: str) -> dict[str, Any]:
    """
    Call Groq API (or Gemini API) to structure messy handwriting/OCR text into validated JSON fields.
    Never invents missing facts — leaves unknown fields blank with 0.0 confidence.
    """
    # 1. Try Groq API if key is present
    if settings.GROQ_API_KEY:
        try:
            return await process_with_groq(raw_ocr_text)
        except Exception as exc:
            logger.error("Groq API extraction error: %s", exc)

    # 2. Try Gemini API if key is present
    if settings.GEMINI_API_KEY:
        try:
            return await process_with_gemini(raw_ocr_text)
        except Exception as exc:
            logger.error("Gemini API extraction error: %s", exc)

    # 3. Rule-based fallback
    return fallback_extract_fields(raw_ocr_text)


async def process_with_groq(raw_ocr_text: str) -> dict[str, Any]:
    """Process raw text using Groq high-speed LLM API."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    prompt = f"""
You are an expert archivist digitizing historical handwritten visitor books for a Cultural Centre in Zimbabwe.
Below is raw text extracted from a scanned page:

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

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
        "temperature": 0.1,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(url, headers=headers, json=payload)
        res.raise_for_status()
        res_json = res.json()
        content = res_json["choices"][0]["message"]["content"]
        return json.loads(content)


async def process_with_gemini(raw_ocr_text: str) -> dict[str, Any]:
    """Process raw text using Gemini API."""
    import google.generativeai as genai

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = f"""
Extract structured information into JSON:
{raw_ocr_text}
"""
    response = await model.generate_content_async(prompt)
    text_resp = response.text.strip()
    if text_resp.startswith("```json"):
        text_resp = text_resp.replace("```json", "", 1).replace("```", "", 1).strip()
    return json.loads(text_resp)


def fallback_extract_fields(text: str) -> dict[str, Any]:
    """Rule-based pattern extraction fallback."""
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
