# Radio Automation Server Management

## Quick Start (Recommended)

**Just double-click `start-servers.bat`** - This will:
- ✅ Clean up any existing servers automatically
- ✅ Start backend on port 3001  
- ✅ Start frontend on port 5173
- ✅ Open your browser to the app

## Manual Start (If Needed)

### Option 1: Individual Terminal Windows
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd radio-automation-app
npm run dev
```

### Option 2: PowerShell (if execution policy allows)
```powershell
.\start-servers.ps1
```

## Common Issues & Solutions

### "Port Already in Use" Errors
**Solution:** Run `start-servers.bat` - it automatically kills old processes

### CORS Errors in Browser Console
**Solution:** Make sure both servers are running and use the exact URLs:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### "Failed to fetch" Errors
**Problem:** Backend isn't running or accessible
**Solution:** Check that backend server window shows "Server running on port 3001"

### Audio Upload Issues
**Symptoms:** Mock waveforms instead of real audio duration
**Solution:** 
1. Check backend server is running
2. Make sure files are uploading to `/backend/watch/` folder
3. Look for "✅ Audio analysis complete" in browser console

## Server Status Check
- Frontend: http://localhost:5173 (should show the app)
- Backend Health: http://localhost:3001/health (should show "OK")
- Backend API: http://localhost:3001/api/shows (should show JSON)

## Stopping Servers
- Close the server command windows, OR
- Run `start-servers.bat` again (it cleans up first)

## Development Tips
- Changes to frontend code auto-reload
- Changes to backend code auto-restart server
- Watch for TypeScript errors in server windows
- Check browser dev console for CORS/fetch errors 