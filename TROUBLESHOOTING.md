# CropIntel Chatbot - Troubleshooting Guide

## Current Issue: Error 403 (or other API errors)

If you're seeing "Unable to get AI insight" or API errors, follow these steps:

---

## 🔧 Step 1: Verify API Key is Set

### Check in PowerShell:

```powershell
# See if GEMINI_API_KEY is set
echo $env:GEMINI_API_KEY
```

**Expected output:** Should show your API key (starting with `AIzaSy...`)

### If it's empty, set it:

```powershell
# Set temporarily (for current session only)
$env:GEMINI_API_KEY = "AIzaSyB7be51eXtEHVxVunFg30cOy-ys-p1-zz4"

# Verify it worked
echo $env:GEMINI_API_KEY
```

### If you need to set it permanently (Windows):

```powershell
# Set environment variable permanently
[Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "AIzaSyB7be51eXtEHVxVunFg30cOy-ys-p1-zz4", "User")

# Then RESTART FastAPI after setting
```

---

## 🔴 Step 2: Restart FastAPI Backend

**Important:** After setting the API key, you MUST restart the backend!

```powershell
# Stop FastAPI (Ctrl+C in the terminal running uvicorn)
# Then restart it
python -m uvicorn price_api:app --reload --port 8000
```

You should see in the startup output:

```
✓ Gemini API Key: AIzaSy...
```

---

## 📋 Step 3: Verify Health Check

Open your browser and go to:

```
http://localhost:8000/health
```

You should see something like:

```json
{
  "status": "ok",
  "database": "connected",
  "database_records": 42,
  "api_key_configured": true,
  "cache_size": 0,
  "history_messages": 0,
  "cache_ttl_seconds": 3600
}
```

**Look for:**

- ✅ `"status": "ok"` - System is running
- ✅ `"api_key_configured": true` - API key is set
- ✅ `"database_records": > 0` - Database has data

---

## ⚠️ Common Problems & Solutions

### Problem 1: API Key Not Set

```
Error: "api_key_configured": false
```

**Solution:**

```powershell
$env:GEMINI_API_KEY = "AIzaSyB7be51eXtEHVxVunFg30cOy-ys-p1-zz4"
# Restart FastAPI
```

### Problem 2: No Database Records

```
Error: "database_records": 0
```

**Solution:** Populate the database:

```powershell
# Terminal: Run market_engine.py to populate market data
python -m uvicorn market_engine:app --reload --port 8001
```

Wait a few seconds, then check health again.

### Problem 3: Backend Not Running

```
Browser: "Cannot connect to backend server"
```

**Solution:** Start FastAPI:

```powershell
python -m uvicorn price_api:app --reload --port 8000
```

You should see: `Uvicorn running on http://127.0.0.1:8000`

### Problem 4: 403 API Error in Chat

```
Message: "API authentication failed"
```

**Likely Causes:**

1. API key not set (check Step 1)
2. API key is incorrect
3. API quota exceeded
4. API key expired or revoked

**Solutions:**

```powershell
# 1. Verify API key is set
echo $env:GEMINI_API_KEY

# 2. If empty, set it
$env:GEMINI_API_KEY = "AIzaSyB7be51eXtEHVxVunFg30cOy-ys-p1-zz4"

# 3. Restart FastAPI
# (Stop current with Ctrl+C)
python -m uvicorn price_api:app --reload --port 8000

# 4. Check health endpoint
# Open: http://localhost:8000/health
```

### Problem 5: Image Icon 404 Error

```
Error: "Failed to load resource: the server responded with a status of 404"
Image: images/sheaf-rice.png
```

**Solution:** ✅ Already fixed! The icon now uses `crop.png` which exists.

---

## 📊 Backend Startup Diagnostics

When you start FastAPI, you should see:

```
============================================================
  CropIntel RAG Chatbot - Startup
============================================================
✓ Gemini API Key: AIzaSyB...
Database: ✓ Connected (45 records)
✓ Cache TTL: 3600s
✓ RAG Engine: Ready
============================================================
API endpoints ready at http://localhost:8000
API documentation: http://localhost:8000/docs
============================================================
```

If you see:

- ⚠️ `API Key: NOT SET` → Set environment variable
- ✗ `Database: error` → Make sure `market_data.db` exists
- If count is 0 → Run `market_engine.py` first

---

## 🔍 Debug Checklist

Use this checklist to verify everything:

- [ ] **API Key Set**: `echo $env:GEMINI_API_KEY` shows key
- [ ] **FastAPI Running**: Terminal shows "Uvicorn running..."
- [ ] **Health Check**: `http://localhost:8000/health` returns `"status": "ok"`
- [ ] **API Key Configured**: Health check shows `"api_key_configured": true`
- [ ] **Database Connected**: Health check shows database records > 0
- [ ] **Browser Console**: No red error messages (F12)
- [ ] **Chatbot Page**: Loads without 404 errors
- [ ] **Chat Input**: You can type in the input field
- [ ] **Status Bar**: Shows status (not error red)

---

## 🚀 Quick Fix Recipe

If everything is broken, try this:

```powershell
# 1. Set API key in this session
$env:GEMINI_API_KEY = "AIzaSyB7be51eXtEHVxVunFg30cOy-ys-p1-zz4"

# 2. Verify database exists and has data
# (Check that market_data.db exists in D:\Hackk\CropIntel)

# 3. Stop any running FastAPI (Ctrl+C)

# 4. Start fresh
python -m uvicorn price_api:app --reload --port 8000

# 5. Open browser and check health
# http://localhost:8000/health

# 6. Open chatbot
# file:///d:/Hackk/CropIntel/chatbot.html

# 7. Try asking a question: "What is the price of wheat?"
```

---

## 💡 Pro Tips

### Monitor Backend Logs

Watch the FastAPI terminal for real-time logs:

```
[Timestamp] INFO: Request to /api/chat
[Timestamp] [Gemini] Making request...
[Timestamp] [Gemini] Response received
```

### Test API Directly

```powershell
# Test chat endpoint directly
$body = @{ message = "What is the price of wheat?" } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:8000/api/chat" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body
```

### Check API Quota

Visit: https://console.cloud.google.com/

- Sign in with Google account
- Check Gemini API usage and quota
- Verify you have requests remaining

### Browser Console Debugging

1. Open chatbot in browser
2. Press F12 to open DevTools
3. Go to "Console" tab
4. Look for red error messages
5. Copy full error for debugging

---

## 📞 Getting Help

If you're still stuck:

1. **Check backend logs** - What errors do you see?
2. **Check browser console** (F12) - Any red messages?
3. **Check health endpoint** - What does it show?
4. **Verify each step** - Did you restart FastAPI?

### Share these details for help:

```powershell
# 1. API key set?
echo $env:GEMINI_API_KEY

# 2. Backend running?
# (Just show if "Uvicorn running" appears)

# 3. Health status?
curl http://localhost:8000/health

# 4. Database records?
# (From health check output)

# 5. Any error messages?
# (Copy from browser console or FastAPI logs)
```

---

## ✅ Expected Behavior When Everything Works

1. **Page loads** → Status bar shows "Ready (45 records)"
2. **You type** → Input accepts text
3. **You send** → "Analyzing market data..." appears
4. **Typing indicator** → Three dots animate briefly
5. **Response** → AI response appears in chat in 2-5 seconds
6. **No errors** → Browser console is clean

---

## 🎯 Next Steps

Once it's working:

1. Ask a few test questions
2. Check response quality
3. Clear history if you want fresh start
4. Try different questions to see how it performs

---

**Last Updated:** 2026-02-22
**Version:** 1.0
**Status:** Troubleshooting Guide
