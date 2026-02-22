"""
CropIntel RAG Chatbot API
FastAPI backend with Retrieval Augmented Generation for agricultural market intelligence
Now using local Gemma2:2b via Ollama
"""

import os
import sqlite3
import time
import json
import re
from datetime import datetime, timedelta
from contextlib import contextmanager
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

# ─────────────────────────────────────────────
# App Initialization
# ─────────────────────────────────────────────

app = FastAPI(title="CropIntel RAG API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────

DATA_GOV_API_KEY = "579b464db66ec23bdd000001e734b1b830854f41600f7e1097b5bdfe"
DATA_GOV_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

# Ollama Configuration (Local Gemma2:2b)
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "gemma2:2b")

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "market_data.db")

# RAG Configuration
RAG_CACHE_TTL = 3600  # 1 hour cache
RAG_MAX_CONTEXT_ITEMS = 50
RAG_RETRY_ATTEMPTS = 3
RAG_RETRY_DELAY = 2  # seconds

# ─────────────────────────────────────────────
# Data Models
# ─────────────────────────────────────────────

class ChatMessage(BaseModel):
    message: str
    crop: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    context_used: Dict[str, Any]
    confidence: str
    timestamp: str

# ─────────────────────────────────────────────
# In-Memory Cache & Session Storage
# ─────────────────────────────────────────────

_response_cache: Dict[str, Dict[str, Any]] = {}  # {cache_key: {"response": str, "ts": float}}
_chat_history: List[Dict[str, str]] = []  # [{role, content}]

# ─────────────────────────────────────────────
# Database Layer
# ─────────────────────────────────────────────

@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    except Exception as e:
        print(f"[DB Error] {e}")
    finally:
        conn.close()

# ─────────────────────────────────────────────
# RAG Context Retrieval
# ─────────────────────────────────────────────

def extract_crops_from_query(query: str) -> List[str]:
    """Extract crop names from user query using pattern matching."""
    common_crops = [
        "wheat", "rice", "maize", "barley", "jowar", "sugarcane",
        "cotton", "potato", "onion", "tomato", "chilli", "garlic",
        "turmeric", "ginger", "soybean", "mustard", "linseed",
        "gram", "arhar", "moong", "masoor", "urad", "apple",
        "banana", "mango", "orange", "lemon", "coconut", "tea",
        "coffee", "spices", "pulses", "vegetables", "fruits",
        "oats", "rye", "corn", "rapeseed", "sunflower"
    ]
    
    query_lower = query.lower()
    found_crops = []
    
    for crop in common_crops:
        if crop in query_lower:
            found_crops.append(crop)
    
    return found_crops if found_crops else ["general"]

def get_market_context(crops: List[str], limit: int = RAG_MAX_CONTEXT_ITEMS) -> Dict[str, Any]:
    """Retrieve relevant market data from database for RAG context."""
    context = {
        "crops_found": crops,
        "markets_data": [],
        "statistics": {},
        "trends": {},
        "data_points": 0
    }
    
    try:
        with get_db() as conn:
            for crop in crops:
                if crop == "general":
                    # Get latest prices across all crops
                    rows = conn.execute("""
                        SELECT m1.* FROM market_prices m1
                        INNER JOIN (
                            SELECT crop, location, MAX(timestamp) as max_ts
                            FROM market_prices
                            GROUP BY crop, location
                        ) m2 ON m1.crop = m2.crop AND m1.location = m2.location AND m1.timestamp = m2.max_ts
                        ORDER BY m1.crop
                        LIMIT ?
                    """, (limit,)).fetchall()
                else:
                    # Get specific crop data
                    rows = conn.execute("""
                        SELECT * FROM market_prices 
                        WHERE crop LIKE ? 
                        ORDER BY timestamp DESC 
                        LIMIT ?
                    """, (f"%{crop}%", limit)).fetchall()
                
                for row in rows:
                    context["markets_data"].append({
                        "crop": row["crop"],
                        "location": row["location"],
                        "price": row["price"],
                        "min_price": row["min_price"],
                        "max_price": row["max_price"],
                        "change_percent": row["change_percent"],
                        "trend": row["trend"],
                        "is_anomaly": bool(row["is_anomaly"]),
                        "timestamp": row["timestamp"]
                    })
                    context["data_points"] += 1
                
                # Calculate statistics
                prices = [float(r["price"]) for r in rows if r["price"]]
                if prices:
                    context["statistics"][crop] = {
                        "avg_price": round(sum(prices) / len(prices), 2),
                        "min": round(min(prices), 2),
                        "max": round(max(prices), 2),
                        "count": len(prices)
                    }
                    
                    # Determine overall trend
                    recent_prices = prices[:5] if len(prices) >= 5 else prices
                    if recent_prices:
                        trend_avg = sum(recent_prices) / len(recent_prices)
                        overall_avg = sum(prices) / len(prices)
                        trend_direction = "UP" if trend_avg > overall_avg else "DOWN" if trend_avg < overall_avg else "STABLE"
                        context["trends"][crop] = trend_direction
    
    except Exception as e:
        print(f"[RAG] Context retrieval error: {e}")
    
    return context

def format_context_for_prompt(context: Dict[str, Any]) -> str:
    """Format market context into a readable string for LLM prompt."""
    lines = ["──── CURRENT MARKET DATA ────"]
    
    for data in context["markets_data"][:10]:  # Limit to 10 most recent
        arrow = "↑" if data["trend"] == "UP" else "↓" if data["trend"] == "DOWN" else "→"
        anomaly_note = " [ANOMALY]" if data["is_anomaly"] else ""
        lines.append(
            f"{data['crop'].title()} in {data['location']}: ₹{data['price']}/unit "
            f"({arrow} {data['change_percent']:+.1f}%){anomaly_note}"
        )
    
    if context["statistics"]:
        lines.append("\n──── STATISTICS ────")
        for crop, stats in context["statistics"].items():
            trend = context["trends"].get(crop, "UNKNOWN")
            lines.append(
                f"{crop.title()}: Avg ₹{stats['avg_price']} | Range: ₹{stats['min']}-₹{stats['max']} | Trend: {trend}"
            )
    
    lines.append(f"\n[Data points analyzed: {context['data_points']}]")
    return "\n".join(lines)

# ─────────────────────────────────────────────
# Ollama (Gemma2:2b) API Integration
# ─────────────────────────────────────────────

def call_llm_with_context(user_message: str, market_context: str) -> str:
    """Call local Ollama Gemma2:2b with market context for RAG-based response."""
    
    system_prompt = """You are an expert agricultural market advisor for Indian farmers. Your role is to:
1. Analyze current market data provided to you
2. Give specific, data-driven recommendations
3. Mention exact prices and percentages from the data
4. Consider trends and anomalies in your advice
5. Be concise but informative (2-4 sentences)
6. Always base your answer on the provided market data
7. If you don't have relevant data, say so honestly

Format your response in a natural, conversational way suitable for farmers."""

    full_prompt = f"""{system_prompt}

CURRENT MARKET INTELLIGENCE:
{market_context}

FARMER'S QUESTION:
{user_message}

Provide a specific, actionable response based on the market data above."""

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": full_prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "top_p": 0.9,
            "num_predict": 256
        }
    }
    
    # Retry logic for connection issues
    for attempt in range(RAG_RETRY_ATTEMPTS):
        try:
            response = requests.post(OLLAMA_URL, json=payload, timeout=60)
            
            if response.status_code == 404:
                return "Ollama server is running but model not found. Run: ollama pull gemma2:2b"
            
            if response.status_code == 500:
                error_detail = response.text
                print(f"[Ollama] Server error: {error_detail}")
                if attempt < RAG_RETRY_ATTEMPTS - 1:
                    time.sleep(RAG_RETRY_DELAY * (2 ** attempt))
                    continue
                return "Local LLM encountered an error. Please check Ollama logs."
            
            response.raise_for_status()
            result = response.json()
            
            # Ollama returns response in 'response' field
            text = result.get("response", "").strip()
            
            # Fallback if response is empty
            if not text:
                return "I apologize, but I couldn't generate a response. Please try rephrasing your question."
            
            return text
        
        except requests.exceptions.ConnectionError:
            error_msg = "Cannot connect to Ollama. Is it running?"
            print(f"[Ollama] Connection error on attempt {attempt + 1}")
            if attempt < RAG_RETRY_ATTEMPTS - 1:
                time.sleep(RAG_RETRY_DELAY * (2 ** attempt))
                continue
            return "[WARN] Cannot connect to local LLM. Please ensure Ollama is running on your machine."
        
        except requests.exceptions.Timeout:
            print(f"[Ollama] Timeout on attempt {attempt + 1}")
            if attempt < RAG_RETRY_ATTEMPTS - 1:
                time.sleep(RAG_RETRY_DELAY * (2 ** attempt))
                continue
            return "The local model is taking too long to respond. Please try again."
        
        except Exception as e:
            print(f"[Ollama] Error: {e}")
            return f"Error communicating with local AI: {str(e)}"
    
    return "Unable to get response after multiple attempts. Please try again."

# ─────────────────────────────────────────────
# Cache Management
# ─────────────────────────────────────────────

def get_cache_key(message: str, crops: List[str]) -> str:
    """Generate a cache key for responses."""
    crop_str = "|".join(sorted(crops))
    # Simple hash of message
    msg_hash = hash(message.lower()) & 0x7FFFFFFF
    return f"{crop_str}:{msg_hash}"

def get_cached_response(cache_key: str) -> Optional[str]:
    """Get cached response if still valid."""
    if cache_key in _response_cache:
        cached = _response_cache[cache_key]
        if time.time() - cached["ts"] < RAG_CACHE_TTL:
            return cached["response"]
        else:
            del _response_cache[cache_key]
    return None

def cache_response(cache_key: str, response: str):
    """Cache a response."""
    _response_cache[cache_key] = {"response": response, "ts": time.time()}

# ─────────────────────────────────────────────
# Original Endpoints
# ─────────────────────────────────────────────

@app.get("/prices")
def get_prices():
    """Fetch latest commodity prices from data.gov.in."""
    params = {
        "api-key": DATA_GOV_API_KEY,
        "format": "json",
        "limit": 50
    }
    
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
    }
    
    try:
        response = requests.get(DATA_GOV_URL, params=params, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
        return data["records"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────
# RAG Chat Endpoints
# ─────────────────────────────────────────────

@app.post("/api/chat")
async def chat(request: ChatMessage) -> ChatResponse:
    """
    Main RAG chat endpoint.
    Retrieves market context and generates AI response using local Gemma2:2b.
    """
    user_message = request.message.strip()
    
    if not user_message or len(user_message) > 500:
        raise HTTPException(status_code=400, detail="Message must be 1-500 characters")
    
    # Extract crops from query
    crops = extract_crops_from_query(user_message)
    cache_key = get_cache_key(user_message, crops)
    
    # Check cache
    cached_response = get_cached_response(cache_key)
    if cached_response:
        return ChatResponse(
            response=cached_response,
            context_used={
                "source": "cache",
                "crops_found": crops,
                "ttl_remaining": RAG_CACHE_TTL
            },
            confidence="high",
            timestamp=datetime.utcnow().isoformat()
        )
    
    # Get market context
    context = get_market_context(crops)
    formatted_context = format_context_for_prompt(context)
    
    # Get LLM response (using local Gemma2:2b)
    ai_response = call_llm_with_context(user_message, formatted_context)
    
    # Cache the response
    cache_response(cache_key, ai_response)
    
    # Add to history
    _chat_history.append({"role": "user", "content": user_message})
    _chat_history.append({"role": "assistant", "content": ai_response})
    
    # Keep history to last 50 messages
    if len(_chat_history) > 50:
        _chat_history.pop(0)
    
    return ChatResponse(
        response=ai_response,
        context_used={
            "crops_found": crops,
            "markets_queried": len(context["markets_data"]),
            "data_points": context["data_points"],
            "cache_ttl": RAG_CACHE_TTL
        },
        confidence="high" if context["data_points"] > 5 else "medium" if context["data_points"] > 0 else "low",
        timestamp=datetime.utcnow().isoformat()
    )

@app.get("/api/chat/history")
async def get_chat_history():
    """Get chat conversation history."""
    return {
        "messages": _chat_history,
        "total": len(_chat_history)
    }

@app.post("/api/chat/clear")
async def clear_chat_history():
    """Clear chat history and cache."""
    global _chat_history, _response_cache
    _chat_history.clear()
    _response_cache.clear()
    return {"status": "cleared", "history": 0, "cache": 0}

@app.on_event("startup")
def startup_event():
    """Startup diagnostics and initialization."""
    print("\n" + "="*60)
    print("  CropIntel RAG Chatbot - Startup")
    print("  Using Local LLM: Gemma2:2b via Ollama")
    print("="*60)
    
    # Check Ollama connection
    ollama_status = "[OFFLINE] Not Connected"
    try:
        response = requests.get(OLLAMA_URL.replace("/api/generate", "/api/tags"), timeout=5)
        if response.status_code == 200:
            models = response.json().get("models", [])
            model_names = [m.get("name", "") for m in models]
            if OLLAMA_MODEL in model_names or any(OLLAMA_MODEL in m for m in model_names):
                ollama_status = f"[READY] Connected ({OLLAMA_MODEL} available)"
            else:
                ollama_status = f"[WARN] Connected but {OLLAMA_MODEL} not found. Run: ollama pull {OLLAMA_MODEL}"
        else:
            ollama_status = f"[ERROR] HTTP {response.status_code}"
    except requests.exceptions.ConnectionError:
        ollama_status = "[OFFLINE] Cannot connect. Is Ollama running?"
    except Exception as e:
        ollama_status = f"[ERROR] {str(e)}"
    
    print(f"Ollama Status: {ollama_status}")
    print(f"  URL: {OLLAMA_URL}")
    print(f"  Model: {OLLAMA_MODEL}")
    
    # Check database
    db_status = "[ERROR]"
    try:
        with get_db() as conn:
            count = conn.execute("SELECT COUNT(*) as c FROM market_prices").fetchone()["c"]
        if count > 0:
            db_status = f"[READY] Connected ({count} records)"
        else:
            db_status = "[READY] Connected (empty)"
    except Exception as e:
        db_status = f"[ERROR] {str(e)}"
    print(f"Database: {db_status}")
    
    print(f"[OK] Cache TTL: {RAG_CACHE_TTL}s")
    print("[OK] RAG Engine: Ready")
    print("="*60)
    print("API endpoints ready at http://localhost:8000")
    print("API documentation: http://localhost:8000/docs")
    print("="*60 + "\n")

@app.get("/health")
def health_check():
    """Health check endpoint."""
    db_status = "connected"
    db_records = 0
    try:
        with get_db() as conn:
            conn.execute("SELECT 1")
            count = conn.execute("SELECT COUNT(*) as c FROM market_prices").fetchone()["c"]
            db_records = count
    except:
        db_status = "error"
    
    # Check Ollama status
    ollama_status = "disconnected"
    try:
        response = requests.get(OLLAMA_URL.replace("/api/generate", "/api/tags"), timeout=3)
        if response.status_code == 200:
            models = response.json().get("models", [])
            model_names = [m.get("name", "") for m in models]
            if OLLAMA_MODEL in model_names or any(OLLAMA_MODEL in m for m in model_names):
                ollama_status = "ready"
            else:
                ollama_status = "model_missing"
    except:
        ollama_status = "disconnected"
    
    return {
        "status": "ok",
        "database": db_status,
        "database_records": db_records,
        "ollama_status": ollama_status,
        "ollama_model": OLLAMA_MODEL,
        "cache_size": len(_response_cache),
        "history_messages": len(_chat_history),
        "cache_ttl_seconds": RAG_CACHE_TTL
    }