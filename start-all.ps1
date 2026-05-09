# =========================
# P2P Rental - Start All Services
# =========================

Write-Host "===================================" -ForegroundColor Cyan
Write-Host " Starting Full Stack Application "
Write-Host "===================================" -ForegroundColor Cyan

# Root project path
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

# =========================
# Check MongoDB
# =========================
Write-Host "`n[1/5] Checking MongoDB..." -ForegroundColor Yellow

$mongoService = Get-Service MongoDB -ErrorAction SilentlyContinue

if ($mongoService -and $mongoService.Status -ne "Running") {
    Start-Service MongoDB
    Write-Host "MongoDB started." -ForegroundColor Green
} elseif ($mongoService) {
    Write-Host "MongoDB already running." -ForegroundColor Green
} else {
    Write-Host "MongoDB service not found!" -ForegroundColor Red
}

# =========================
# Check RabbitMQ
# =========================
Write-Host "`n[2/5] Checking RabbitMQ..." -ForegroundColor Yellow

$rabbitService = Get-Service RabbitMQ -ErrorAction SilentlyContinue

if ($rabbitService -and $rabbitService.Status -ne "Running") {
    Start-Service RabbitMQ
    Write-Host "RabbitMQ started." -ForegroundColor Green
} elseif ($rabbitService) {
    Write-Host "RabbitMQ already running." -ForegroundColor Green
} else {
    Write-Host "RabbitMQ service not found!" -ForegroundColor Red
}

# =========================
# Start Backend
# =========================
Write-Host "`n[3/5] Starting Backend..." -ForegroundColor Yellow

Start-Process powershell `
    -ArgumentList "-NoExit", "-Command", "cd '$ROOT\backend'; npm start"

# =========================
# Start Frontend
# =========================
Write-Host "`n[4/5] Starting Frontend..." -ForegroundColor Yellow

Start-Process powershell `
    -ArgumentList "-NoExit", "-Command", "cd '$ROOT\frontend'; npm start"

# =========================
# Start Notification Worker
# =========================
Write-Host "`n[5/5] Starting Notification Worker..." -ForegroundColor Yellow

Start-Process powershell `
    -ArgumentList "-NoExit", "-Command", "cd '$ROOT\notification-worker'; npm start"

# =========================
# Wait & Open Browser
# =========================
Write-Host "`nWaiting for services to boot..." -ForegroundColor Cyan

Start-Sleep -Seconds 8

Start-Process "http://localhost:3000"

Write-Host "`n===================================" -ForegroundColor Cyan
Write-Host " Application Started Successfully "
Write-Host "===================================" -ForegroundColor Cyan