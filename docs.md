# CropIntel RAG Chatbot System - Documentation

## Overview

The CropIntel RAG (Retrieval Augmented Generation) Chatbot is an intelligent system that combines real-time agricultural market data with Google Gemini AI to provide contextual answers about crop prices, market trends, and farming recommendations.

## Architecture

### Components

1. **RAG Engine (Backend)** - `price_api.py`
   - Retrieves relevant market data from SQLite database
   - Constructs context-rich prompts
   - Communicates with Google Gemini API
   - Implements caching and rate limit handling

2. **Frontend Interface** - `chatbot.html`, `chatbot.css`, `chatbot.js`
   - Real-time chat interface
   - Message history
   - Typing indicators
   - Error recovery

3. **Database** - `market_data.db`
   - Historical price data
   - Trend analysis data
   - Anomaly detection records

## How It Works

### 1. User Query Flow

```
User Question
    ↓
Frontend JavaScript (chatbot.js)
    ↓
Send to Backend API (/api/chat endpoint)
    ↓
RAG Engine in price_api.py
    ├─ Query market_data.db for relevant prices
    ├─ Format context with market intelligence
    ├─ Create system prompt with agricultural expertise
    └─ Send to Google Gemini API
    ↓
Gemini AI
    ├─ Analyzes query using market context
    └─ Generates agricultural-specific response
    ↓
Response returned to Frontend
    ↓
Display in Chat Interface
```

### 2. Context Retrieval (RAG)

When a user asks a question, the system:

1. **Identifies relevant crops** - Uses keyword matching to find crops mentioned
2. **Retrieves market data** - Queries database for recent prices and trends
3. **Calculates statistics** - Computes averages, changes, anomalies
4. **Formats context** - Creates structured market intelligence summary

**Example context for "Should I sell my wheat?":**

```
Recent Market Data:
- Wheat in Punjab: ₹2,150/quintal (↑2.5% today)
- Wheat in Haryana: ₹2,140/quintal (→ stable)
- Wheat in Uttar Pradesh: ₹2,120/quintal (↓1.2% today)

Trend: UP (price increasing)
Anomaly: None detected
Historical Average (30 days): ₹2,100
```

### 3. Prompt Engineering

The system uses a sophisticated prompt structure:

```
SYSTEM PROMPT:
- You are an agricultural market advisor for Indian farmers
- Use ONLY the provided market data
- Be specific with prices and percentages
- Recommend actions based on trends
- Consider seasonal patterns

USER QUERY + CONTEXT:
[Structured market intelligence]

USER QUESTION:
[Farmer's question]
```

## API Endpoints

### POST `/api/chat`

**Purpose:** Send a message and get an AI-powered response with market context

**Request:**

```json
{
  "message": "Should I sell my wheat now or wait?"
}
```

**Response:**

```json
{
  "response": "Based on current market data, wheat prices in Punjab are showing an upward trend...",
  "context_used": {
    "crops_found": ["wheat"],
    "markets_queried": 3,
    "data_points": 45
  },
  "confidence": "high",
  "timestamp": "2026-02-22T10:30:00Z"
}
```

### GET `/api/chat/history`

**Purpose:** Retrieve chat history

**Response:**

```json
{
  "messages": [
    {
      "role": "user",
      "content": "..."
    },
    {
      "role": "assistant",
      "content": "..."
    }
  ],
  "total": 5
}
```

## Features

### 1. Intelligent Context Retrieval

- Automatic crop recognition from user queries
- Multi-location price comparison
- Trend analysis integration
- Anomaly detection awareness

### 2. Smart Caching

- Caches Gemini responses for 1 hour
- Reduces API calls and costs
- Maintains cache key format: `{crop}:{location}:{time_window}`
- Cache invalidation on data updates

### 3. Rate Limit Handling

- Free tier: 60 requests per minute
- Automatic retry with exponential backoff
- Graceful degradation for rate limits
- Queue management for burst traffic

### 4. Context Windows

- **Current**: Last 24 hours of prices
- **Weekly**: Last 7 days average
- **Monthly**: Last 30 days trend
- **Seasonal**: Last 3 months comparison

## Configuration

### Environment Variables

```bash
# Google Gemini AI
GEMINI_API_KEY=your-free-tier-api-key

# Optional: Custom settings
RAG_CACHE_TTL=3600          # Cache TTL in seconds (default: 1 hour)
RAG_MAX_CONTEXT_ITEMS=50    # Max DB records to retrieve
RAG_RETRY_ATTEMPTS=3        # Retry attempts for 429 errors
```

### Rate Limit Strategy

**Free Tier Limits:**

- 60 requests per minute
- 1,500 requests per day
- 10 MB requests per day

**Optimization for Free Tier:**

1. **Request Batching** - Group similar queries
2. **Response Caching** - 1-hour TTL by default
3. **Lazy Loading** - Fetch context only when needed
4. **Token Counting** - Limit prompt size to ~2000 tokens

## Database Schema

### market_prices Table

```sql
CREATE TABLE market_prices (
    id INTEGER PRIMARY KEY,
    crop TEXT,                    -- e.g., "wheat", "rice"
    location TEXT,                -- e.g., "Delhi"
    state TEXT,                   -- e.g., "Delhi"
    district TEXT,                -- e.g., "New Delhi"
    market TEXT,                  -- e.g., "Mandi"
    price REAL,                   -- current price
    min_price REAL,               -- daily minimum
    max_price REAL,               -- daily maximum
    change_percent REAL,          -- % change
    trend TEXT,                   -- 'UP', 'DOWN', 'STABLE'
    is_anomaly INTEGER,           -- 0 or 1
    timestamp TEXT                -- ISO format datetime
);
```

## Usage Examples

### Example 1: Get Selling Recommendation

**User:** "What's the best time to sell my rice this month?"

**Internal Process:**

1. Identify crop: "rice"
2. Query database: Last 30 days of rice prices
3. Calculate trend and anomalies
4. Send context to Gemini with agricultural expertise
5. Get response with market-based recommendation

### Example 2: Market Comparison

**User:** "Where should I sell my wheat - Punjab or Haryana?"

**Internal Process:**

1. Identify crops and regions: wheat, Punjab, Haryana
2. Fetch current prices from both locations
3. Compare trends and anomalies
4. Send comparative market data to Gemini
5. Get location-based recommendation

### Example 3: Seasonal Planning

**User:** "When should I plant potatoes for best profit?"

**Internal Process:**

1. Identify crop: "potatoes"
2. Query 3-month historical data
3. Calculate seasonal patterns
4. Note anomalies and peak prices
5. Send pattern analysis to Gemini
6. Get season-based planting recommendation

## Performance Optimization

### 1. Database Indexing

```sql
CREATE INDEX idx_crop ON market_prices(crop);
CREATE INDEX idx_timestamp ON market_prices(timestamp);
CREATE INDEX idx_crop_timestamp ON market_prices(crop, timestamp);
```

### 2. Query Optimization

- Use LIMIT clauses to reduce data transfer
- Pre-aggregate common statistics
- Cache popular queries

### 3. Frontend Optimization

- Debounce user input (300ms)
- Lazy load chat history
- Minimize DOM updates
- Use WebSocket (optional future enhancement)

## Error Handling

### Common Errors

1. **Rate Limit (429)**
   - Automatic retry with exponential backoff
   - User sees: "Processing... (this may take longer)"
   - System queues request

2. **No Market Data Found**
   - Check crop name spelling
   - Return: "I don't have recent data for this crop. Try 'wheat', 'rice', or 'potatoes'."

3. **API Timeout**
   - Fallback to cached response if available
   - Return: "Response is slightly delayed, showing recent data..."

4. **Invalid Query**
   - Return helpful prompts
   - Suggest related crops
   - Recommend asking about trends/prices

## Future Enhancements

1. **Multi-Language Support** - Hindi, Punjabi, Tamil
2. **Voice Input** - Speech-to-text for farmers
3. **SMS Integration** - WhatsApp/SMS chat interface
4. **Predictive Analytics** - ML-based price forecasting
5. **Batch Processing** - Handle multiple users efficiently
6. **Analytics Dashboard** - Track popular queries and insights

## Security Considerations

1. **API Key Management**
   - Store key in environment variables
   - Never commit to version control
   - Consider proxy for production

2. **Input Validation**
   - Sanitize user queries
   - Check message length (max 500 chars)
   - Rate limit per IP address

3. **Data Privacy**
   - Don't log sensitive queries
   - Clear chat history regularly
   - GDPR compliance for EU users

## Troubleshooting

### Gemini API Not Responding

Check:

1. API key is valid and set in environment
2. Internet connection is active
3. API quota not exceeded (check Google Cloud console)
4. System time is correct (may affect API signature)

### Chat Shows "Analyzing..." Forever

Solutions:

1. Clear browser cache
2. Check network tab for failed requests
3. Verify API key is set: `echo $GEMINI_API_KEY`
4. Check server logs for errors

### Prices Not Updating

Verify:

1. Market data refresh is running (check market_engine.py)
2. Database has recent timestamps
3. Run: `SELECT MAX(timestamp) FROM market_prices;`

## Testing

### Test Queries

```
1. "What's the current price of wheat?"
2. "Should I sell my rice now?"
3. "Compare potato prices in Punjab vs Haryana"
4. "What crops have price anomalies today?"
5. "What's the trend for tomatoes?"
```

### Load Testing

For free tier, recommend:

- Max 5 concurrent users
- Stagger requests by 200ms
- Cache responses for 1 hour

## Support

For issues or questions:

1. Check this documentation
2. Review error messages carefully
3. Check browser console for JavaScript errors
4. Verify backend is running: `curl http://localhost:8000/prices`

---

**Version:** 1.0.0  
**Last Updated:** 2026-02-22  
**Compatibility:** Python 3.8+, FastAPI, Gemini API (Free Tier)
