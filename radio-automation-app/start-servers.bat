@echo off
echo 🚀 Starting Radio Automation System...
echo.

echo 🧹 Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 "') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 "') do taskkill /PID %%a /F >nul 2>&1

echo.
echo 🔧 Starting Backend Server...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo ⏳ Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo 🎨 Starting Frontend Server...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo 🎉 Both servers are starting!
echo 📱 Frontend: http://localhost:5173
echo 🔧 Backend:  http://localhost:3001
echo.
echo 💡 Tip: Close the server windows to stop the servers
echo Press any key to open the application...
pause >nul
start http://localhost:5173 