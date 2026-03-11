# Quick Hosts File Fix for Neon Database
# Run this as Administrator: Right-click PowerShell -> Run as Administrator

Write-Host "=== Neon Database DNS Fix ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell" -ForegroundColor White
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor White
    Write-Host "3. Run: cd d:\Documents\lms; .\fix-dns-hosts.ps1" -ForegroundColor White
    Write-Host ""
    pause
    exit 1
}

$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
$backupPath = "C:\Windows\System32\drivers\etc\hosts.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# Backup hosts file
Write-Host "Creating backup..." -ForegroundColor Yellow
Copy-Item $hostsPath $backupPath
Write-Host "Backup saved to: $backupPath" -ForegroundColor Green
Write-Host ""

# Add Neon database entries
$neonEntries = @"

# Neon Database - Added $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
54.86.249.90 ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech
44.211.114.173 ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech
98.91.36.187 ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech
"@

Write-Host "Adding Neon database IPs to hosts file..." -ForegroundColor Yellow
Add-Content -Path $hostsPath -Value $neonEntries
Write-Host "Hosts file updated successfully!" -ForegroundColor Green
Write-Host ""

# Flush DNS
Write-Host "Flushing DNS cache..." -ForegroundColor Yellow
ipconfig /flushdns | Out-Null
Write-Host "DNS cache flushed!" -ForegroundColor Green
Write-Host ""

# Test resolution
Write-Host "Testing DNS resolution..." -ForegroundColor Cyan
$testResult = nslookup ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech 2>&1
if ($testResult -match "54.86.249.90") {
    Write-Host "SUCCESS! DNS now resolves correctly!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Check resolution manually with nslookup" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Fix Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now run:" -ForegroundColor Yellow
Write-Host "  cd d:\Documents\lms" -ForegroundColor White
Write-Host "  .\restart-backend.ps1" -ForegroundColor White
Write-Host ""
pause
