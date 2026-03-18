# Quick Backend Restart Script
Write-Host "Stopping all Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

Start-Sleep -Seconds 2

Write-Host "`nStarting backend server..." -ForegroundColor Cyan
Set-Location -Path "d:\Documents\lms\LMS-backend"
npm run start:dev
