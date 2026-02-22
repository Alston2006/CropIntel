#!/usr/bin/env pwsh
<#
.SYNOPSIS
    CropIntel RAG Chatbot - Startup Script
    
.DESCRIPTION
    Starts the FastAPI backend and opens the chatbot interface
    
.EXAMPLE
    .\start-chatbot.ps1
#>

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir

Write-Info "================================================"
Write-Info "  CropIntel RAG Chatbot - Startup Script"
Write-Info "================================================"

# Check if venv exists
if (-not (Test-Path "venv")) {
    Write-Warning "Virtual environment not found. Creating..."
    python -m venv venv
    Write-Success "Virtual environment created"
}

# Activate virtual environment
Write-Info "Activating virtual environment..."
& "venv/Scripts/Activate.ps1"
Write-Success "Virtual environment activated"

# Check dependencies
Write-Info "Checking dependencies..."
$requiredPackages = @("fastapi", "uvicorn", "requests")

foreach ($package in $requiredPackages) {
    try {
        python -c "import $($package.replace('-', '_'))" 2>$null
        Write-Success "$package is installed"
    } catch {
        Write-Warning "$package not found, installing..."
        pip install $package
        Write-Success "$package installed"
    }
}

# Set Gemini API Key
Write-Info "Setting Gemini API Key..."
$apiKey = "AIzaSyB7be51eXtEHVxVunFg30cOy-ys-p1-zz4"
$env:GEMINI_API_KEY = $apiKey
Write-Success "GEMINI_API_KEY set for this session"

# Start FastAPI server in background
Write-Info "Starting FastAPI backend server..."
$backendProcess = Start-Process python -ArgumentList "-m", "uvicorn", "price_api:app", "--reload", "--port", "8000" `
    -PassThru -WindowStyle Minimized

Write-Success "FastAPI backend started (PID: $($backendProcess.Id))"

# Wait for server to start
Write-Info "Waiting for server to initialize..."
Start-Sleep -Seconds 3

# Check if server is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Success "Backend server is responding on http://localhost:8000"
    }
} catch {
    Write-Warning "Backend server is starting up, may take a moment..."
}

# Open chatbot in default browser
Write-Info "Opening chatbot in browser..."
$chatbotPath = "file:///$($scriptDir -replace '\\', '/')/chatbot.html"
Start-Process $chatbotPath
Write-Success "Chatbot opened in default browser"

Write-Info ""
Write-Info "================================================"
Write-Info "  CropIntel is Ready!"
Write-Info "================================================"
Write-Info ""
Write-Info "Backend:  http://localhost:8000"
Write-Info "API Docs: http://localhost:8000/docs"
Write-Info "Health:   http://localhost:8000/health"
Write-Info ""
Write-Info "Chat Message Format:"
Write-Info "  {""message"": ""What's the price of wheat?""}"
Write-Info ""
Write-Info "Tips:"
Write-Info "  • Ask about crop prices, trends, and recommendations"
Write-Info "  • Use natural language - system understands context"
Write-Info "  • Clear history with the 🗑️ button if cache seems stale"
Write-Info "  • Check browser console (F12) for detailed logs"
Write-Info ""
Write-Info "To stop the server, close this window or press Ctrl+C"
Write-Info ""

# Keep the terminal open
Write-Info "Backend is running. Press Ctrl+C to stop..."
Wait-Process -Id $backendProcess.Id

Write-Warning "Backend server stopped"
