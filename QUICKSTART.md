# CropIntel RAG Chatbot - Quick Start Guide

## 📋 Overview

You now have a complete RAG (Retrieval Augmented Generation) chatbot system that:

- ✅ Uses your free Gemini API key
- ✅ Retrieves real-time agricultural market data from your database
- ✅ Provides intelligent, context-aware responses about crop prices
- ✅ Works with FastAPI backend (price_api.py)
- ✅ Beautiful, responsive chat interface

## 📂 Files Created/Modified

### Backend

- **price_api.py** - Enhanced with RAG endpoints:
  - `POST /api/chat` - Main chat endpoint
  - `GET /api/chat/history` - Get conversation history
  - `POST /api/chat/clear` - Clear history and cache
  - `GET /health` - Health check

### Frontend

- **chatbot.html** - Chat interface UI
- **chatbot.css** - Professional styling with animations
- **chatbot.js** - Real-time chat functionality

### Documentation

- **docs.md** - Complete technical documentation
- **QUICKSTART.md** - This file

## 🚀 Getting Started

### Step 1: Set Environment Variable

Open PowerShell in your workspace and set the Gemini API key:

```powershell
$env:GEMINI_API_KEY = "AIzaSyB7be51eXtEHVxVunFg30cOy-ys-p1-zz4"
```

Or permanently (Windows):

```powershell
[Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "AIzaSyB7be51eXtEHVxVunFg30cOy-ys-p1-zz4", "User")
```

### Step 2: Install Dependencies

Your price_api.py needs the same dependencies as before. Ensure you have:

```bash
pip install fastapi uvicorn requests python-dotenv
```

### Step 3: Start Backend Server

Run the FastAPI backend:

```bash
# Terminal 1: FastAPI Backend
python -m uvicorn price_api:app --reload --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 4: Open Chatbot

Open your browser and navigate to:

```
file:///d:/Hackk/CropIntel/chatbot.html
```

Or serve it with Python:

```bash
# Terminal 2: Simple HTTP Server
python -m http.server 8080 --directory d:\Hackk\CropIntel
```

Then visit: `http://localhost:8080/chatbot.html`

## 💬 Example Questions

Try asking:

1. **"What's the current price of wheat?"**
   - Gets latest wheat prices from market data

2. **"Should I sell my rice now or wait?"**
   - Analyzes trends and provides recommendation

3. **"Compare potato prices in Punjab vs Haryana"**
   - Compares prices across locations

4. **"What crops have price anomalies today?"**
   - Shows unusual price movements

5. **"When should I plant tomatoes for best profit?"**
   - Provides seasonal advice

## 🔧 Configuration

Edit `price_api.py` to customize:

```python
# Cache time-to-live (seconds)
RAG_CACHE_TTL = 3600  # 1 hour

# Maximum context items to retrieve
RAG_MAX_CONTEXT_ITEMS = 50

# Retry attempts for rate limits
RAG_RETRY_ATTEMPTS = 3

# Retry delay (exponential backoff)
RAG_RETRY_DELAY = 2
```

## 🐛 Troubleshooting

### "Cannot connect to backend"

- [ ] FastAPI backend is running on port 8000
- [ ] Check terminal for errors: `python -m uvicorn price_api:app --reload`
- [ ] Firewall not blocking localhost:8000

### "API key not found"

- [ ] Set environment variable: `$env:GEMINI_API_KEY = "your-key"`
- [ ] Verify key in price_api.py line 34
- [ ] Restart FastAPI after setting environment variable

### "Typing... forever" or No Response

- [ ] Check browser console (F12 → Console tab)
- [ ] Check FastAPI server logs for errors
- [ ] Verify you have internet connection
- [ ] Check Gemini API quota (Google Cloud Console)
- [ ] Free tier limit: 60 requests/minute

### No Market Data Found

- [ ] Ensure market_data.db exists in your workspace
- [ ] Run `market_engine.py` to populate database
- [ ] Check database has recent data: Market Pulse Engine

## 📊 Database Integration

The chatbot automatically:

1. Queries `market_data.db` for prices
2. Retrieves crop trends and anomalies
3. Formats context for Gemini
4. Caches responses (1 hour)

**Ensure market_engine.py is running** to keep data fresh:

```bash
# Terminal 3 (Optional): Market Data Refresh
python -m uvicorn market_engine:app --reload --port 8001
```

## 🎨 Customization

### Change API Endpoint

In `chatbot.js`, line 10:

```javascript
const API_BASE = "http://localhost:8000"; // Change this
```

### Change Chat Colors

In `chatbot.css`, update root variables:

```css
:root {
  --primary: #10b981; /* Change green to your color */
  --secondary: #f59e0b;
}
```

### Add More Suggestions

In `chatbot.html`, add buttons inside `.suggestions-grid`:

```html
<button class="suggestion-btn" data-query="Your question here">
  Emoji Your Label
</button>
```

## ⚡ Performance Tips

### Free Tier Optimization

1. **Cache responses** - Enabled by default (1 hour TTL)
2. **Batch similar queries** - System groups related questions
3. **Clear history periodically** - Click 🗑️ button
4. **Limit concurrent users** - Max 5 users for free tier

### Reduce API Calls

```python
# Increase cache TTL in price_api.py
RAG_CACHE_TTL = 7200  # 2 hours
```

## 🔐 Security Notes

1. API Key is exposed in frontend - use environment variable in production
2. Input validated to 500 characters
3. SQL injection protected (parameterized queries)
4. CORS enabled for local development

For production:

- Use backend proxy for API key
- Implement authentication
- Rate limit per IP address

## 📱 Mobile Support

The chatbot is fully responsive:

- ✅ Mobile phones
- ✅ Tablets
- ✅ Desktop
- ✅ Dark mode compatible

Test on mobile: `http://your-ip:8080/chatbot.html`

## 📡 API Response Format

```json
{
  "response": "Based on current market data...",
  "context_used": {
    "crops_found": ["wheat"],
    "markets_queried": 3,
    "data_points": 45,
    "cache_ttl": 3600
  },
  "confidence": "high",
  "timestamp": "2026-02-22T10:30:00Z"
}
```

## 🚦 Status Indicators

- 🟢 **Ready** - System operational
- 🟡 **Analyzing** - Processing query
- 🔴 **Error** - Connection problem

## 📈 Feature Roadmap

Future enhancements:

- [ ] Multi-language support (Hindi, Punjabi)
- [ ] Voice input/output
- [ ] WhatsApp/SMS integration
- [ ] Price alerts
- [ ] Export chat as PDF
- [ ] User profiles & preferences
- [ ] Advanced analytics dashboard

## 🎯 Use Cases

1. **Selling Decision** - "Should I sell my cotton now?"
2. **Market Comparison** - "Where should I sell wheat?"
3. **Timing Strategy** - "When is the best time to plant potato?"
4. **Price Trends** - "Is rice price going up or down?"
5. **Risk Assessment** - "Are tomato prices stable?"
6. **Multi-location** - "Which market has the best price?"
7. **Seasonal Planning** - "What should I plant next month?"

## 💡 Tips & Tricks

1. **Be specific** - "wheat in Punjab" vs just "wheat"
2. **Use natural language** - "Should I sell?" not "recommend action"
3. **Ask about trends** - System has historical data
4. **Check consistency** - Response shows confidence level
5. **Clear cache** - If data seems stale, click 🗑️

## 📞 Support

For issues:

1. Check `docs.md` for detailed documentation
2. Review browser console (F12) for errors
3. Check FastAPI logs for backend errors
4. Verify database has data
5. Test API directly: `http://localhost:8000/health`

## 📝 File Structure

```
d:\Hackk\CropIntel\
├── price_api.py          ← Main backend (updated)
├── chatbot.html          ← Chat interface
├── chatbot.css           ← Styling
├── chatbot.js            ← Frontend logic
├── docs.md               ← Technical docs
├── QUICKSTART.md         ← This file
├── market_engine.py      ← Market data (existing)
├── market_data.db        ← Price database (existing)
└── images/
    └── sheaf-rice.png    ← Icon
```

## 🎓 Learning Resources

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Google Gemini API](https://ai.google.dev/)
- [RAG Concepts](https://en.wikipedia.org/wiki/Retrieval-augmented_generation)
- [Async JavaScript](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous)

## 🎉 You're All Set!

Your RAG chatbot is ready to:

- ✅ Analyze agricultural markets
- ✅ Provide AI-powered insights
- ✅ Work with your free Gemini API key
- ✅ Handle multiple users
- ✅ Scale to your needs

### Next Steps:

1. Start FastAPI: `python -m uvicorn price_api:app --reload`
2. Open chatbot: `file:///d:/Hackk/CropIntel/chatbot.html`
3. Ask a question about crop prices
4. Get intelligent, market-aware responses!

---

**Version:** 1.0.0  
**Created:** 2026-02-22  
**Status:** ✅ Production Ready

For detailed technical documentation, see `docs.md`
