"""
Market Pulse Engine — Backend
FastAPI application providing real-time commodity price intelligence,
anomaly detection, profit prediction, and Gemini AI insights.
"""

import os
import sqlite3
import statistics
import time
from datetime import datetime, timedelta
from contextlib import contextmanager

import requests
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# ─────────────────────────────────────────────
# App Init
# ─────────────────────────────────────────────
app = FastAPI(title="Market Pulse Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────
DATA_GOV_API_KEY = "579b464db66ec23bdd000001e734b1b830854f41600f7e1097b5bdfe"
DATA_GOV_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyB7be51eXtEHVxVunFg30cOy-ys-p1-zz4")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "market_data.db")

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
    finally:
        conn.close()


def init_db():
    """Create tables if they don't exist."""
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS market_prices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                crop TEXT NOT NULL,
                location TEXT NOT NULL,
                state TEXT,
                district TEXT,
                market TEXT,
                price REAL NOT NULL,
                min_price REAL,
                max_price REAL,
                change_percent REAL DEFAULT 0,
                trend TEXT DEFAULT 'STABLE',
                is_anomaly INTEGER DEFAULT 0,
                timestamp TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_crop ON market_prices(crop)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_timestamp ON market_prices(timestamp)
        """)
        conn.commit()


# ─────────────────────────────────────────────
# Data Fetch & Normalize
# ─────────────────────────────────────────────
def fetch_raw_data(limit: int = 100):
    """Fetch commodity price data from data.gov.in."""
    params = {
        "api-key": DATA_GOV_API_KEY,
        "format": "json",
        "limit": limit,
    }
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
    }
    try:
        resp = requests.get(DATA_GOV_URL, params=params, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return data.get("records", [])
    except Exception as e:
        print(f"[MarketEngine] Data fetch error: {e}")
        return []


def normalize_record(raw: dict, timestamp: str) -> dict:
    """Normalize a raw API record to our schema."""
    modal = float(raw.get("modal_price", 0) or 0)
    mn = float(raw.get("min_price", 0) or 0)
    mx = float(raw.get("max_price", 0) or 0)
    return {
        "crop": raw.get("commodity", "Unknown"),
        "location": raw.get("market", "Unknown"),
        "state": raw.get("state", ""),
        "district": raw.get("district", ""),
        "market": raw.get("market", ""),
        "price": modal,
        "min_price": mn,
        "max_price": mx,
        "timestamp": timestamp,
    }


# ─────────────────────────────────────────────
# Analytics Logic
# ─────────────────────────────────────────────
def compute_trend(change_percent: float) -> str:
    if change_percent > 3:
        return "UP"
    elif change_percent < -3:
        return "DOWN"
    return "STABLE"


def compute_change_percent(current: float, previous: float) -> float:
    if previous == 0:
        return 0.0
    return round(((current - previous) / previous) * 100, 2)


def detect_anomaly(price: float, prices: list[float]) -> bool:
    """Z-score anomaly detection. |z| > 2 → anomaly."""
    if len(prices) < 3:
        return False
    mean = statistics.mean(prices)
    std = statistics.stdev(prices)
    if std == 0:
        return False
    z = (price - mean) / std
    return abs(z) > 2


def predict_prices(prices: list[float], days: int = 7) -> dict:
    """Linear regression price prediction."""
    if len(prices) < 3:
        return {
            "predictedPrice": prices[-1] if prices else 0,
            "confidence": 0,
            "trend": [prices[-1]] * days if prices else [0] * days,
            "recommendation": "WAIT",
        }

    x = np.arange(len(prices), dtype=float)
    y = np.array(prices, dtype=float)

    # Linear regression
    n = len(x)
    sum_x = np.sum(x)
    sum_y = np.sum(y)
    sum_xy = np.sum(x * y)
    sum_x2 = np.sum(x ** 2)

    denom = n * sum_x2 - sum_x ** 2
    if denom == 0:
        slope, intercept = 0.0, float(y[-1])
    else:
        slope = float((n * sum_xy - sum_x * sum_y) / denom)
        intercept = float((sum_y - slope * sum_x) / n)

    # Predict future prices
    future_x = np.arange(n, n + days, dtype=float)
    predicted = [round(float(slope * xi + intercept), 2) for xi in future_x]

    # Confidence (R²)
    y_pred = slope * x + intercept
    ss_res = float(np.sum((y - y_pred) ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    r_squared = round(1 - (ss_res / ss_tot), 2) if ss_tot != 0 else 0.0

    # Recommendation
    predicted_price = predicted[-1]
    current_price = float(prices[-1])
    pct_change = ((predicted_price - current_price) / current_price * 100) if current_price else 0

    if pct_change > 5:
        recommendation = "HOLD"   # Price going up — wait to sell later
    elif pct_change < -5:
        recommendation = "SELL"   # Price going down — sell now
    else:
        recommendation = "WAIT"

    return {
        "predictedPrice": predicted_price,
        "confidence": max(0, r_squared),
        "trend": predicted,
        "recommendation": recommendation,
    }


# ─────────────────────────────────────────────
# Data Refresh Pipeline
# ─────────────────────────────────────────────
def refresh_data():
    """Fetch fresh data, compute analytics, and store in DB."""
    records = fetch_raw_data(limit=100)
    if not records:
        return {"status": "no_data"}

    timestamp = datetime.utcnow().isoformat()
    inserted = 0

    with get_db() as conn:
        for raw in records:
            norm = normalize_record(raw, timestamp)
            if norm["price"] == 0:
                continue

            # Get previous prices for this crop
            rows = conn.execute(
                "SELECT price FROM market_prices WHERE crop = ? ORDER BY timestamp DESC LIMIT 30",
                (norm["crop"],),
            ).fetchall()
            past_prices = [r["price"] for r in rows]

            # Compute change percent
            prev = past_prices[0] if past_prices else norm["price"]
            change = compute_change_percent(norm["price"], prev)
            trend = compute_trend(change)

            # Anomaly detection
            is_anomaly = 1 if detect_anomaly(norm["price"], past_prices) else 0

            conn.execute(
                """INSERT INTO market_prices
                   (crop, location, state, district, market, price, min_price, max_price,
                    change_percent, trend, is_anomaly, timestamp)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    norm["crop"], norm["location"], norm["state"], norm["district"],
                    norm["market"], norm["price"], norm["min_price"], norm["max_price"],
                    change, trend, is_anomaly, timestamp,
                ),
            )
            inserted += 1

        conn.commit()

    return {"status": "ok", "inserted": inserted, "timestamp": timestamp}


# ─────────────────────────────────────────────
# Gemini AI Layer (with cache + retry)
# ─────────────────────────────────────────────
_insight_cache: dict[str, dict] = {}   # {crop: {"text": str, "ts": float}}
CACHE_TTL_SEC = 300  # 5 minutes
MAX_RETRIES = 3
RETRY_BASE_DELAY = 2  # seconds


def get_gemini_insight(crop: str, data: dict) -> str:
    """Call Gemini to generate a natural-language market insight.
    Uses in-memory cache and retries with exponential backoff for 429 errors."""

    # ── Check cache first ──
    cached = _insight_cache.get(crop)
    if cached and (time.time() - cached["ts"]) < CACHE_TTL_SEC:
        return cached["text"]

    prompt = (
        f"You are an agricultural market analyst. Provide a concise, actionable insight "
        f"for Indian farmers about the commodity '{crop}'. "
        f"Current data:\n"
        f"- Modal Price: ₹{data.get('price', 'N/A')}\n"
        f"- Price Change: {data.get('change_percent', 0)}%\n"
        f"- Trend: {data.get('trend', 'STABLE')}\n"
        f"- Anomaly Detected: {'Yes' if data.get('is_anomaly') else 'No'}\n"
        f"- Prediction: ₹{data.get('predicted_price', 'N/A')} (7-day)\n"
        f"- Recommendation: {data.get('recommendation', 'WAIT')}\n\n"
        f"Provide a 3-4 sentence insight covering the current market situation, "
        f"risk factors, and recommended action. Be specific and data-driven."
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
    }

    # ── Retry loop with exponential backoff ──
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.post(GEMINI_URL, json=payload, timeout=25)

            # Handle rate limit specifically
            if resp.status_code == 429:
                delay = RETRY_BASE_DELAY * (2 ** attempt)  # 2s, 4s, 8s
                print(f"[Gemini] 429 rate limited for '{crop}', retrying in {delay}s (attempt {attempt + 1}/{MAX_RETRIES})")
                time.sleep(delay)
                continue

            resp.raise_for_status()
            result = resp.json()
            text = result["candidates"][0]["content"]["parts"][0]["text"].strip()

            # ── Cache the result ──
            _insight_cache[crop] = {"text": text, "ts": time.time()}
            return text

        except requests.exceptions.HTTPError as e:
            if resp.status_code == 429 and attempt < MAX_RETRIES - 1:
                continue
            return f"AI insight unavailable (rate limited). Try again in a minute."
        except Exception as e:
            return f"AI insight unavailable: {str(e)}"

    return "AI insight temporarily unavailable due to rate limits. The insight will load on your next visit (cached for 5 min)."


# ─────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────

@app.on_event("startup")
def startup():
    """Initialize DB and fetch initial data."""
    init_db()
    # Check if DB is empty — if so, do an initial fetch
    with get_db() as conn:
        count = conn.execute("SELECT COUNT(*) as c FROM market_prices").fetchone()["c"]
    if count == 0:
        print("[MarketEngine] Empty DB — performing initial data fetch...")
        result = refresh_data()
        print(f"[MarketEngine] Initial fetch result: {result}")


@app.post("/api/market/refresh")
def api_refresh():
    """Force a data refresh from the API."""
    result = refresh_data()
    return result


@app.get("/api/market/latest")
def api_latest():
    """Return the latest price for each unique crop."""
    with get_db() as conn:
        rows = conn.execute("""
            SELECT m1.* FROM market_prices m1
            INNER JOIN (
                SELECT crop, location, MAX(timestamp) as max_ts
                FROM market_prices
                GROUP BY crop, location
            ) m2 ON m1.crop = m2.crop AND m1.location = m2.location AND m1.timestamp = m2.max_ts
            ORDER BY m1.crop
        """).fetchall()

    return [dict(r) for r in rows]


@app.get("/api/market/history/{crop}")
def api_history(crop: str):
    """Return historical data for a specific crop."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM market_prices WHERE crop = ? ORDER BY timestamp DESC LIMIT 100",
            (crop,),
        ).fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail=f"No data found for crop: {crop}")

    return [dict(r) for r in rows]


@app.get("/api/market/anomaly/{crop}")
def api_anomaly(crop: str):
    """Return anomaly alerts for a crop."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM market_prices WHERE crop = ? AND is_anomaly = 1 ORDER BY timestamp DESC LIMIT 50",
            (crop,),
        ).fetchall()

    alerts = [dict(r) for r in rows]

    # Also compute current anomaly status
    with get_db() as conn:
        latest = conn.execute(
            "SELECT * FROM market_prices WHERE crop = ? ORDER BY timestamp DESC LIMIT 1",
            (crop,),
        ).fetchone()
        prices_rows = conn.execute(
            "SELECT price FROM market_prices WHERE crop = ? ORDER BY timestamp DESC LIMIT 30",
            (crop,),
        ).fetchall()

    prices = [r["price"] for r in prices_rows]
    current_anomaly = False
    z_score = 0.0

    if latest and len(prices) >= 3:
        mean = statistics.mean(prices)
        std = statistics.stdev(prices)
        if std > 0:
            z_score = round((latest["price"] - mean) / std, 2)
            current_anomaly = abs(z_score) > 2

    return {
        "crop": crop,
        "is_anomaly": current_anomaly,
        "z_score": z_score,
        "historical_alerts": alerts,
    }


@app.get("/api/market/prediction/{crop}")
def api_prediction(crop: str):
    """Return 7-day price prediction for a crop."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT price FROM market_prices WHERE crop = ? ORDER BY timestamp ASC",
            (crop,),
        ).fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail=f"No data found for crop: {crop}")

    prices = [r["price"] for r in rows]
    prediction = predict_prices(prices, days=7)

    return {
        "crop": crop,
        "currentPrice": prices[-1],
        "historicalPrices": prices[-30:],  # Last 30 data points
        **prediction,
    }


@app.get("/api/market/recommendation/{crop}")
def api_recommendation(crop: str):
    """Return sell/hold/wait recommendation for a crop."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT price, change_percent, trend, is_anomaly FROM market_prices WHERE crop = ? ORDER BY timestamp DESC LIMIT 30",
            (crop,),
        ).fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail=f"No data found for crop: {crop}")

    prices = [r["price"] for r in rows]
    latest = dict(rows[0])
    prediction = predict_prices(prices)

    return {
        "crop": crop,
        "currentPrice": latest["price"],
        "trend": latest["trend"],
        "changePercent": latest["change_percent"],
        "isAnomaly": bool(latest["is_anomaly"]),
        "predictedPrice": prediction["predictedPrice"],
        "confidence": prediction["confidence"],
        "recommendation": prediction["recommendation"],
    }


@app.get("/api/market/insight/{crop}")
def api_insight(crop: str):
    """Return Gemini AI-generated insight for a crop."""
    with get_db() as conn:
        latest = conn.execute(
            "SELECT * FROM market_prices WHERE crop = ? ORDER BY timestamp DESC LIMIT 1",
            (crop,),
        ).fetchone()
        prices_rows = conn.execute(
            "SELECT price FROM market_prices WHERE crop = ? ORDER BY timestamp ASC",
            (crop,),
        ).fetchall()

    if not latest:
        raise HTTPException(status_code=404, detail=f"No data found for crop: {crop}")

    prices = [r["price"] for r in prices_rows]
    prediction = predict_prices(prices)

    data_for_ai = {
        "price": latest["price"],
        "change_percent": latest["change_percent"],
        "trend": latest["trend"],
        "is_anomaly": latest["is_anomaly"],
        "predicted_price": prediction["predictedPrice"],
        "recommendation": prediction["recommendation"],
    }

    insight = get_gemini_insight(crop, data_for_ai)

    return {
        "crop": crop,
        "insight": insight,
        "data": data_for_ai,
        "structured_summary": (
            f"{crop} price is ₹{latest['price']} in {latest['location']}. "
            f"Change: {latest['change_percent']}%. Trend: {latest['trend']}. "
            f"Anomaly: {'Detected' if latest['is_anomaly'] else 'Not detected'}. "
            f"7-day prediction: ₹{prediction['predictedPrice']}. "
            f"Recommendation: {prediction['recommendation']}."
        ),
    }


@app.get("/api/market/crops")
def api_crops():
    """Return a list of unique crops in the database."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT DISTINCT crop FROM market_prices ORDER BY crop"
        ).fetchall()
    return [r["crop"] for r in rows]
