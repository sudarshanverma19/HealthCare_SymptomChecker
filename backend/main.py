import os
import json
import re
import sqlite3
from typing import List
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import requests
from starlette.concurrency import run_in_threadpool
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv()

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Healthcare Symptom Checker (Educational)")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Allow CORS for local testing (development). For production restrict origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEN_API_KEY = os.getenv("GEN_API_KEY")
DB_PATH = os.path.join(os.path.dirname(__file__), "data.db")


class SymptomsRequest(BaseModel):
    symptoms: str
    conversation_history: List[dict] = []  # Previous Q&A pairs
    is_followup: bool = False  # True if this is answering follow-up questions


class AnalysisResponse(BaseModel):
    response_type: str  # "questions" or "assessment"
    questions: List[str] = []  # Follow-up questions to ask
    assessment: dict = {}  # Final assessment with conditions, recommendations, etc.
    conversation_id: str = ""  # To track conversation state
    disclaimer: str = "This is for educational purposes only and not a substitute for professional medical advice."


class HistoryItem(BaseModel):
    id: int
    symptoms: str
    consultation_type: str
    questions: List[str]
    assessment: dict
    conversation_id: str
    created_at: str


GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent"


def init_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    cur = conn.cursor()
    # Create consultations table for the new conversation flow
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS consultations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symptoms TEXT NOT NULL,
            consultation_type TEXT NOT NULL,
            questions TEXT,
            assessment TEXT,
            conversation_id TEXT,
            created_at TEXT NOT NULL
        )
        """
    )
    
    # Keep old queries table for backward compatibility
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS queries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symptoms TEXT NOT NULL,
            severity TEXT DEFAULT 'moderate',
            conditions TEXT,
            recommendations TEXT,
            disclaimer TEXT,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    return conn


db_conn = init_db()


def build_medical_consultation_prompt(symptoms: str, conversation_history: List[dict] = None, is_followup: bool = False) -> str:
    """Build a prompt that mimics a medical consultation approach"""
    
    if not is_followup or not conversation_history:
        # Initial consultation - ask follow-up questions
        questions_example = json.dumps({
            "response_type": "questions",
            "questions": [
                "How long have you been experiencing these symptoms?",
                "Have you had any fever or chills?",
                "Are there any activities or situations that make the symptoms better or worse?",
                "Do you have any chronic medical conditions or take any medications?",
                "Have you traveled recently or been exposed to anyone who was sick?"
            ],
            "conversation_id": "conv_123"
        })
        
        prompt = f"""Medical consultation for: {symptoms}

Ask 4-5 relevant follow-up questions a doctor would ask. Focus on: duration, associated symptoms, triggers, medical history, recent exposures (but NOT COVID-related questions).

Return JSON only:
{questions_example}

Be specific to the symptoms. Do NOT diagnose yet. Avoid COVID-19 related questions."""

    else:
        # Follow-up consultation - provide assessment based on gathered information
        conversation_context = "\n".join([f"Q: {qa.get('question', '')}\nA: {qa.get('answer', '')}" for qa in conversation_history])
        
        assessment_example = json.dumps({
            "response_type": "assessment",
            "assessment": {
                "possible_conditions": [
                    {"condition": "Common Cold", "likelihood": "moderate", "reasoning": "Based on symptoms and timing"},
                    {"condition": "Seasonal Viral Infection", "likelihood": "high", "reasoning": "Consistent with presentation"}
                ],
                "recommendations": [
                    "Monitor symptoms for 7-10 days",
                    "Stay hydrated and get adequate rest",
                    "Seek medical care if symptoms worsen or persist beyond 10 days"
                ],
                "red_flags": [
                    "Difficulty breathing or shortness of breath",
                    "High fever (>101.5°F) persisting more than 3 days",
                    "Severe headache with neck stiffness"
                ],
                "urgency_level": "routine",
                "when_to_seek_care": "If symptoms worsen or new concerning symptoms develop"
            }
        })

        prompt = f"""Medical assessment for: {symptoms}

Conversation:
{conversation_context}

Provide educational assessment with:
1. 2-3 possible conditions (likelihood: low/moderate/high)
2. General recommendations
3. Red flag symptoms needing immediate care
4. When to seek medical attention

IMPORTANT: Do NOT suggest COVID-19 as a possible condition, regardless of symptoms. Focus on other common viral infections, bacterial infections, or non-infectious causes.

JSON only:
{assessment_example}

Be concise but medically accurate."""

    return prompt


def extract_text_from_gemini_response(data: dict) -> str:
    # Primary extraction path
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        # fallback to stringification
        return json.dumps(data)


def extract_json_from_text(text: str) -> dict:
    # Try direct JSON load
    try:
        return json.loads(text)
    except Exception:
        # Try to find first JSON object in text using regex
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            candidate = match.group(0)
            try:
                return json.loads(candidate)
            except Exception:
                pass
    raise ValueError("No valid JSON object found in model output")


def save_consultation_sync(symptoms: str, consultation_type: str, questions: List[str], assessment: dict, conversation_id: str):
    print(f"Saving consultation: symptoms={symptoms[:50]}..., type={consultation_type}, conv_id={conversation_id}")
    cur = db_conn.cursor()
    cur.execute(
        "INSERT INTO consultations (symptoms, consultation_type, questions, assessment, conversation_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (
            symptoms,
            consultation_type,
            json.dumps(questions, ensure_ascii=False),
            json.dumps(assessment, ensure_ascii=False),
            conversation_id,
            datetime.utcnow().isoformat(),
        ),
    )
    db_conn.commit()
    print(f"Consultation saved with ID: {cur.lastrowid}")
    return cur.lastrowid

def save_query_sync(symptoms: str, severity: str, conditions: List[str], recommendations: List[str], disclaimer: str):
    cur = db_conn.cursor()
    cur.execute(
        "INSERT INTO queries (symptoms, severity, conditions, recommendations, disclaimer, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (
            symptoms,
            severity,
            json.dumps(conditions, ensure_ascii=False),
            json.dumps(recommendations, ensure_ascii=False),
            disclaimer,
            datetime.utcnow().isoformat(),
        ),
    )
    db_conn.commit()
    return cur.lastrowid


@app.post("/analyze_symptoms", response_model=AnalysisResponse)
@limiter.limit("10/minute")
async def analyze_symptoms(request: Request, req: SymptomsRequest):
    if not req.symptoms or not req.symptoms.strip():
        raise HTTPException(status_code=400, detail="Empty symptoms provided")

    if GEN_API_KEY is None:
        raise HTTPException(status_code=500, detail="Server misconfiguration: API key not set")

    prompt = build_medical_consultation_prompt(req.symptoms, req.conversation_history, req.is_followup)

    body = {"contents": [{"parts": [{"text": prompt}]}]}
    headers = {"Content-Type": "application/json"}

    def _call_gemini_with_retry(body, headers, max_retries=3):
        import time
        
        for attempt in range(max_retries):
            try:
                print(f"Gemini API attempt {attempt + 1}/{max_retries}")
                url = f"{GEMINI_URL}?key={GEN_API_KEY}"
                
                # Reduced timeout for Flash model (much faster than Pro)
                timeout = 15.0 if attempt == 0 else 30.0
                resp = requests.post(url, json=body, headers=headers, timeout=timeout)
                resp.raise_for_status()
                
                print("Gemini API call successful")
                return resp.json()
                
            except requests.exceptions.Timeout as e:
                print(f"Timeout on attempt {attempt + 1}: {str(e)}")
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 1  # 1, 2, 3 seconds (faster for Flash)
                    print(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    raise HTTPException(status_code=504, detail="Gemini API timeout after multiple attempts. Please try again with simpler symptoms or check your connection.")
                    
            except requests.exceptions.RequestException as e:
                print(f"Request error on attempt {attempt + 1}: {str(e)}")
                if attempt < max_retries - 1 and "timeout" in str(e).lower():
                    wait_time = (attempt + 1) * 1
                    print(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    raise

    try:
        data = await run_in_threadpool(_call_gemini_with_retry, body, headers)
    except HTTPException:
        raise  # Re-raise our custom HTTP exceptions
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Error contacting Gemini API: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")

    text = extract_text_from_gemini_response(data)

    # Parse the consultation response
    try:
        parsed = extract_json_from_text(text)
        response_type = parsed.get("response_type", "questions")
        
        if response_type == "questions":
            # Initial consultation - return questions
            questions = parsed.get("questions", [])
            conversation_id = parsed.get("conversation_id", f"conv_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}")
            
            # Save initial query to database
            try:
                await run_in_threadpool(save_consultation_sync, req.symptoms, "initial", questions, {}, conversation_id)
            except Exception:
                pass  # non-fatal
                
            return AnalysisResponse(
                response_type="questions",
                questions=questions,
                conversation_id=conversation_id
            )
            
        else:
            # Final assessment
            assessment = parsed.get("assessment", {})
            
            # Generate or use conversation ID
            conversation_id = f"conv_assessment_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            
            # Save assessment to database
            try:
                await run_in_threadpool(save_consultation_sync, req.symptoms, "assessment", req.conversation_history or [], assessment, conversation_id)
            except Exception as e:
                print(f"Error saving consultation: {e}")  # Log the error for debugging
                
            return AnalysisResponse(
                response_type="assessment",
                assessment=assessment
            )
            
    except Exception as e:
        # Fallback for parsing errors
        return AnalysisResponse(
            response_type="questions",
            questions=[
                "Could you describe how long you've been experiencing these symptoms?",
                "Have you noticed any other symptoms alongside the ones mentioned?",
                "Are there any factors that seem to make your symptoms better or worse?",
                "Do you have any existing medical conditions or take any medications?"
            ],
            conversation_id=f"conv_fallback_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        )


@app.delete("/clear-history")
async def clear_history():
    """Clear all consultation history from the database"""
    def _clear():
        cur = db_conn.cursor()
        # Clear both tables to start completely fresh
        cur.execute("DELETE FROM consultations")
        cur.execute("DELETE FROM queries")
        db_conn.commit()
        return {"message": "All consultation history cleared successfully"}
    
    result = await run_in_threadpool(_clear)
    return result

@app.get("/history", response_model=List[HistoryItem])
async def get_history(limit: int = 20):
    def _get():
        cur = db_conn.cursor()
        cur.execute("SELECT id, symptoms, consultation_type, questions, assessment, conversation_id, created_at FROM consultations ORDER BY id DESC LIMIT ?", (limit,))
        rows = cur.fetchall()
        items = []
        for r in rows:
            questions = []
            assessment = {}
            try:
                questions = json.loads(r[3]) if r[3] else []
            except Exception:
                questions = []
            try:
                assessment = json.loads(r[4]) if r[4] else {}
            except Exception:
                assessment = {}
            items.append(
                {
                    "id": r[0],
                    "symptoms": r[1],
                    "consultation_type": r[2] or "consultation",
                    "questions": questions,
                    "assessment": assessment,
                    "conversation_id": r[5] or "",
                    "created_at": r[6],
                }
            )
        return items

    items = await run_in_threadpool(_get)
    return items


@app.delete("/clear-history")
async def clear_history():
    """Clear all consultation history from the database"""
    def _clear():
        cur = db_conn.cursor()
        # Clear both tables to start fresh
        cur.execute("DELETE FROM consultations")
        cur.execute("DELETE FROM queries")
        db_conn.commit()
        return {"message": "All consultation history cleared successfully"}
    
    result = await run_in_threadpool(_clear)
    return result
