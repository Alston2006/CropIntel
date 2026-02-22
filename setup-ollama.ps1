# CropIntel - Ollama Setup Script
# This script pulls the required gemma2:2b model for local AI inference

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║           CropIntel - Ollama Model Setup                  ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Check if Ollama is installed
Write-Host "[STEP 1/3] Checking if Ollama is installed..." -ForegroundColor Cyan
try {
    $ollamaVersion = ollama --version
    Write-Host "[OK] Ollama is installed: $ollamaVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Ollama is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Ollama from: https://ollama.ai" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "[STEP 2/3] Checking Ollama daemon status..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "[OK] Ollama daemon is running on localhost:11434" -ForegroundColor Green
    }
} catch {
    Write-Host "[ERROR] Ollama daemon is not running" -ForegroundColor Red
    Write-Host "Please start Ollama first (it should auto-start on system startup)" -ForegroundColor Yellow
    Write-Host "Or run 'ollama serve' in a new terminal" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "[STEP 3/3] Pulling gemma2:2b model..." -ForegroundColor Cyan
Write-Host "This may take 2-5 minutes depending on your internet connection (3.3 GB download)..." -ForegroundColor Yellow
Write-Host ""

ollama pull gemma2:2b

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] gemma2:2b model successfully pulled!" -ForegroundColor Green
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║          Setup Complete - Ready to Use CropIntel          ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Start the FastAPI backend:" -ForegroundColor White
    Write-Host "   python -m uvicorn price_api:app --reload --port 8000" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Open the chatbot in your browser:" -ForegroundColor White
    Write-Host "   file:///d:/Hackk/CropIntel/chatbot.html" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Start asking about crop prices!" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "[ERROR] Failed to pull gemma2:2b model" -ForegroundColor Red
    Write-Host "Please check your internet connection and try again" -ForegroundColor Yellow
    exit 1
}
