# Fix DNS for Neon Database Connection
# Run this script as Administrator

Write-Host "Getting active network adapter..." -ForegroundColor Cyan
$adapter = Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1

if ($adapter) {
    Write-Host "Active adapter: $($adapter.Name)" -ForegroundColor Green
    
    Write-Host "`nSetting DNS to Google DNS (8.8.8.8, 8.8.4.4)..." -ForegroundColor Cyan
    Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ServerAddresses ("8.8.8.8","8.8.4.4")
    
    Write-Host "`nFlushing DNS cache..." -ForegroundColor Cyan
    Clear-DnsClientCache
    
    Write-Host "`nTesting DNS resolution..." -ForegroundColor Cyan
    $result = Resolve-DnsName -Name "ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech" -Server 8.8.8.8 -ErrorAction SilentlyContinue
    
    if ($result) {
        Write-Host "✅ DNS resolution successful!" -ForegroundColor Green
        Write-Host "`nYou can now restart the backend server." -ForegroundColor Yellow
    } else {
        Write-Host "❌ DNS resolution still failing" -ForegroundColor Red
    }
} else {
    Write-Host "❌ No active network adapter found" -ForegroundColor Red
}

Write-Host "`nPress any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
