# Quick DNS flush and retry
Write-Host "Flushing DNS cache..." -ForegroundColor Cyan
ipconfig /flushdns

Write-Host "`nRegistering DNS..." -ForegroundColor Cyan  
ipconfig /registerdns

Write-Host "`nWaiting 5 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`nTesting Neon database hostname..." -ForegroundColor Cyan
nslookup ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech 8.8.8.8

Write-Host "`nNow try restarting the backend." -ForegroundColor Green
