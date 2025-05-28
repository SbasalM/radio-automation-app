# Radio Automation System - Server Startup Script
# This script safely starts both backend and frontend servers

Write-Host "🚀 Starting Radio Automation System..." -ForegroundColor Green

# Function to kill processes on specific ports
function Stop-ProcessOnPort {
    param($Port)
    $processes = netstat -ano | findstr ":$Port " | ForEach-Object { $_.Split(' ')[-1] } | Where-Object { $_ -match '^\d+$' }
    foreach ($pid in $processes) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "✅ Stopped process $pid on port $Port" -ForegroundColor Yellow
        } catch {
            # Process already stopped
        }
    }
}

# Function to wait for server to be ready
function Wait-ForServer {
    param($Url, $Name, $MaxAttempts = 20)
    $attempts = 0
    do {
        $attempts++
        Start-Sleep -Seconds 1
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ $Name is ready!" -ForegroundColor Green
                return $true
            }
        } catch {
            # Server not ready yet
        }
        Write-Host "⏳ Waiting for $Name... ($attempts/$MaxAttempts)" -ForegroundColor Gray
    } while ($attempts -lt $MaxAttempts)
    
    Write-Host "❌ $Name failed to start after $MaxAttempts attempts" -ForegroundColor Red
    return $false
}

# Step 1: Clean up any existing processes
Write-Host "🧹 Cleaning up existing processes..." -ForegroundColor Blue
Stop-ProcessOnPort 3001
Stop-ProcessOnPort 5173
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Step 2: Start Backend Server
Write-Host "🔧 Starting Backend Server..." -ForegroundColor Blue
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm run dev" -WindowStyle Minimized

# Step 3: Wait for backend to be ready
if (Wait-ForServer "http://localhost:3001/health" "Backend Server") {
    # Step 4: Start Frontend Server
    Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Blue
    Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev" -WindowStyle Minimized
    
    # Step 5: Wait for frontend to be ready
    if (Wait-ForServer "http://localhost:5173" "Frontend Server") {
        Write-Host "🎉 Both servers are running successfully!" -ForegroundColor Green
        Write-Host "📱 Frontend: http://localhost:5173" -ForegroundColor Cyan
        Write-Host "🔧 Backend:  http://localhost:3001" -ForegroundColor Cyan
        Write-Host "📊 Health:   http://localhost:3001/health" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "💡 Tip: The servers are running in minimized windows." -ForegroundColor Yellow
        Write-Host "💡 If you need to restart, just run this script again!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Press any key to open the application in your browser..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        Start-Process "http://localhost:5173"
    }
}

Write-Host "Script completed. Check server windows if there are issues." -ForegroundColor Gray 