# Quick Verification Script
# Run this to check if everything is configured correctly

Write-Host "`n=== LMS Workflow Verification ===" -ForegroundColor Cyan

# Check if servers are running
Write-Host "`n1. Checking if servers are running..." -ForegroundColor Yellow
$backend = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$frontend = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue

if ($backend) {
    Write-Host "   ✅ Backend running on port 3001" -ForegroundColor Green
} else {
    Write-Host "   ❌ Backend NOT running on port 3001" -ForegroundColor Red
    Write-Host "      Start it with: cd lms\LMS-backend; npm run start:dev" -ForegroundColor Gray
}

if ($frontend) {
    Write-Host "   ✅ Frontend running on port 3002" -ForegroundColor Green
} else {
    Write-Host "   ❌ Frontend NOT running on port 3002" -ForegroundColor Red
    Write-Host "      Start it with: cd lms\lms-frontend; npm run dev" -ForegroundColor Gray
}

# Test backend health
Write-Host "`n2. Testing backend connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -UseBasicParsing -ErrorAction SilentlyContinue
    Write-Host "   ✅ Backend is responding" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Host "   ✅ Backend is responding (404 is expected)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Backend connection failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test CORS
Write-Host "`n3. Testing CORS configuration..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/courses" `
        -Method OPTIONS `
        -Headers @{
            "Origin"="http://localhost:3002"; 
            "Access-Control-Request-Method"="POST"
        } `
        -UseBasicParsing -ErrorAction Stop
    
    $corsOrigin = $response.Headers["Access-Control-Allow-Origin"]
    if ($corsOrigin -eq "http://localhost:3002") {
        Write-Host "   ✅ CORS is properly configured" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  CORS origin: $corsOrigin" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ CORS test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test frontend
Write-Host "`n4. Testing frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3002" -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✅ Frontend is accessible" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Frontend not accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# Check required files
Write-Host "`n5. Checking required files..." -ForegroundColor Yellow
$files = @(
    "lms\LMS-backend\src\courses\courses.controller.ts",
    "lms\LMS-backend\src\admin\admin.controller.ts",
    "lms\lms-frontend\app\dashboard\instructor\create-course\page.tsx",
    "lms\lms-frontend\app\dashboard\admin\approvals\page.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Missing: $file" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Backend URL:  http://localhost:3001" -ForegroundColor White
Write-Host "Frontend URL: http://localhost:3002" -ForegroundColor White
Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Make sure both servers are running" -ForegroundColor White
Write-Host "2. Open browser: http://localhost:3002" -ForegroundColor White
Write-Host "3. Login and test the workflow" -ForegroundColor White
Write-Host "4. Check browser console (F12) for detailed logs" -ForegroundColor White
Write-Host "5. Check backend terminal for server logs`n" -ForegroundColor White
