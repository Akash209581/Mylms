# Script to restart both backend and frontend servers
Write-Host "🔄 Restarting LMS servers..." -ForegroundColor Cyan

# Kill existing node processes
Write-Host "Stopping existing servers..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start backend server
Write-Host "`n🚀 Starting backend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\Documents\lms\LMS-backend; npm run start:dev"

# Wait a bit for backend to initialize
Start-Sleep -Seconds 5

# Start frontend server
Write-Host "🌐 Starting frontend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\Documents\lms\lms-frontend; npm run dev"

Write-Host "`n✅ Servers starting... Please wait 10-15 seconds for initialization" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3000" -ForegroundColor White
Write-Host "Frontend: http://localhost:3001" -ForegroundColor White
