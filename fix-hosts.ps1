# Emergency Hosts File Workaround
# Run as Administrator

$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
$backupPath = "C:\Windows\System32\drivers\etc\hosts.backup"

Write-Host "Creating backup of hosts file..." -ForegroundColor Cyan
Copy-Item $hostsPath $backupPath -Force

Write-Host "`nAdding Neon database entries to hosts file..." -ForegroundColor Cyan

$entries = @"

# Neon Database - Added by LMS fix script
54.86.249.90 ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech
44.211.114.173 ep-gentle-moon-aiq823ba.c-4.us-east-1.aws.neon.tech
98.91.36.187 c-4.us-east-1.aws.neon.tech
"@

Add-Content -Path $hostsPath -Value $entries

Write-Host "`n✅ Hosts file updated!" -ForegroundColor Green
Write-Host "Backup saved at: $backupPath" -ForegroundColor Yellow

Write-Host "`nFlushing DNS cache..." -ForegroundColor Cyan
ipconfig /flushdns

Write-Host "`nNow restart the backend server." -ForegroundColor Green
Write-Host "If you want to undo this, restore from: $backupPath" -ForegroundColor Yellow
