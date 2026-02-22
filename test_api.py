#!/usr/bin/env python3
"""
Gemini API Connection Test
Tests if the Gemini API key and connection work properly
"""

import os
import sys
import requests
import json

# Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyDa9ekgBefTrKLbHoA0dsyLg5LIRlTW2iw").strip()
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

def test_gemini_connection():
    """Test basic Gemini API connectivity"""
    print("\n" + "="*70)
    print("  GEMINI API CONNECTION TEST")
    print("="*70)
    
    # Check API Key
    print(f"\n[1] API Key Status:")
    if GEMINI_API_KEY:
        key_preview = GEMINI_API_KEY[:15] + "..." + GEMINI_API_KEY[-5:]
        print(f"    [OK] API Key Set: {key_preview}")
    else:
        print(f"    [ERROR] API Key NOT SET")
        print(f"    Please set: $env:GEMINI_API_KEY = 'your-key'")
        return False
    
    # Test basic request
    print(f"\n[2] Testing API Connection:")
    print(f"    URL: {GEMINI_URL[:60]}...")
    
    test_prompt = "What is the price of agricultural commodities? Answer in one sentence."
    
    payload = {
        "contents": [{"parts": [{"text": test_prompt}]}],
    }
    
    try:
        print(f"    Sending test request...")
        response = requests.post(GEMINI_URL, json=payload, timeout=10)
        
        print(f"    Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print(f"    [OK] Connection Successful (200 OK)")
            
            # Parse response
            result = response.json()
            if "candidates" in result and len(result["candidates"]) > 0:
                text = result["candidates"][0]["content"]["parts"][0]["text"]
                print(f"\n[3] API Response:")
                print(f"    [OK] Received: {text[:100]}...")
                return True
            else:
                print(f"    [ERROR] No response text in API response")
                print(f"    Response: {result}")
                return False
                
        elif response.status_code == 403:
            print(f"    [ERROR] Authentication Failed (403)")
            print(f"    The API key is invalid or expired")
            print(f"    Response: {response.text[:200]}")
            return False
            
        elif response.status_code == 429:
            print(f"    [WARN] Rate Limited (429)")
            print(f"    You've exceeded the API quota")
            print(f"    Wait a moment and try again")
            return False
            
        elif response.status_code == 400:
            print(f"    [ERROR] Bad Request (400)")
            print(f"    Response: {response.text[:200]}")
            return False
        else:
            print(f"    [ERROR] Unexpected Status Code: {response.status_code}")
            print(f"    Response: {response.text[:200]}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"    [ERROR] Request Timeout")
        print(f"    The API took too long to respond")
        return False
        
    except requests.exceptions.ConnectionError as e:
        print(f"    [ERROR] Connection Error: {str(e)[:100]}")
        print(f"    Check your internet connection")
        return False
        
    except Exception as e:
        print(f"    [ERROR] {str(e)[:100]}")
        return False

def test_rag_context_retrieval():
    """Test if market data retrieval works"""
    print(f"\n[4] Testing Database Connection:")
    
    DB_PATH = "market_data.db"
    if not os.path.exists(DB_PATH):
        print(f"    [WARN] Database not found: {DB_PATH}")
        return False
    
    try:
        import sqlite3
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM market_prices")
        count = cursor.fetchone()[0]
        conn.close()
        
        if count > 0:
            print(f"    [OK] Database Connected: {count} records found")
            return True
        else:
            print(f"    [WARN] Database connected but empty")
            return False
    except Exception as e:
        print(f"    [ERROR] Database Error: {str(e)}")
        return False

def main():
    """Run all tests"""
    results = []
    
    # Test 1: API Connection
    api_ok = test_gemini_connection()
    results.append(("Gemini API", api_ok))
    
    # Test 2: Database
    db_ok = test_rag_context_retrieval()
    results.append(("Database", db_ok))
    
    # Summary
    print(f"\n" + "="*70)
    print("  TEST SUMMARY")
    print("="*70)
    
    for name, status in results:
        status_icon = "OK" if status else "FAIL"
        status_text = "PASS" if status else "FAIL"
        print(f"  [{status_icon}] {name}: {status_text}")
    
    all_passed = all(status for _, status in results)
    
    if all_passed:
        print(f"\n[OK] All tests passed! System is ready to use.")
        print(f"\nNext Steps:")
        print(f"  1. Start backend: python -m uvicorn price_api:app --reload --port 8000")
        print(f"  2. Open chatbot: file:///d:/Hackk/CropIntel/chatbot.html")
    else:
        print(f"\n[ERROR] Some tests failed. Check the output above.")
        print(f"\nTroubleshooting:")
        if not api_ok:
            print(f"  - API Issue: Check TROUBLESHOOTING.md for Gemini API setup")
        if not db_ok:
            print(f"  - DB Issue: Run market_engine.py to populate data")
    
    print("="*70 + "\n")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
