# Nexus Public Deployment Script
$BkTunnelLog = "C:\Users\Srijan Roy\.gemini\antigravity-ide\brain\70d64052-ddcc-4356-8448-6e388d6c9f7e\backend-tunnel.log"
$FtTunnelLog = "C:\Users\Srijan Roy\.gemini\antigravity-ide\brain\70d64052-ddcc-4356-8448-6e388d6c9f7e\frontend-tunnel.log"

# Clean old logs
Remove-Item $BkTunnelLog -ErrorAction SilentlyContinue
Remove-Item $FtTunnelLog -ErrorAction SilentlyContinue

Write-Host "1. Starting FastAPI Backend on port 8000..." -ForegroundColor Cyan
Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "main:app", "--port", "8000" -NoNewWindow

Start-Sleep -Seconds 4

Write-Host "2. Starting public tunnel for FastAPI Backend..." -ForegroundColor Cyan
Start-Process -FilePath "npx.cmd" -ArgumentList "localtunnel", "--port", "8000" -RedirectStandardOutput $BkTunnelLog -NoNewWindow

Write-Host "Waiting for Backend tunnel to initialize..."
Start-Sleep -Seconds 6

$BkUrlLine = Get-Content $BkTunnelLog | Select-String -Pattern "your url is:"
if ($BkUrlLine) {
    $BkUrl = ($BkUrlLine -split "your url is: ")[1].Trim()
    Write-Host "Backend Tunnel Active: $BkUrl" -ForegroundColor Green
} else {
    Write-Error "Failed to start Backend tunnel. Logs:"
    Get-Content $BkTunnelLog
    exit 1
}

Write-Host "3. Updating React Config (src/App.jsx) with Backend URL..." -ForegroundColor Cyan
$AppPath = "d:\Heart-Stroke-Predictor-main\Heart-Stroke-Predictor-main\src\App.jsx"
$AppContent = Get-Content $AppPath -Raw
$AppContent = $AppContent -replace "const BACKEND_URL = '[^']+'", "const BACKEND_URL = '$BkUrl'"
Set-Content $AppPath $AppContent -NoNewline

Write-Host "4. Starting Vite Frontend on port 5173..." -ForegroundColor Cyan
Start-Process -FilePath "npx.cmd" -ArgumentList "vite", "--port", "5173" -NoNewWindow

Start-Sleep -Seconds 4

Write-Host "5. Starting public tunnel for React Frontend..." -ForegroundColor Cyan
Start-Process -FilePath "npx.cmd" -ArgumentList "localtunnel", "--port", "5173" -RedirectStandardOutput $FtTunnelLog -NoNewWindow

Write-Host "Waiting for Frontend tunnel to initialize..."
Start-Sleep -Seconds 6

$FtUrlLine = Get-Content $FtTunnelLog | Select-String -Pattern "your url is:"
if ($FtUrlLine) {
    $FtUrl = ($FtUrlLine -split "your url is: ")[1].Trim()
    Write-Host "`n==================================================" -ForegroundColor Magenta
    Write-Host "🚀 LAUNCH SUCCESSFUL!" -ForegroundColor Green
    Write-Host "Frontend Public URL (Share this!): $FtUrl" -ForegroundColor Cyan
    Write-Host "Backend Public API URL: $BkUrl" -ForegroundColor Yellow
    Write-Host "==================================================" -ForegroundColor Magenta
} else {
    Write-Error "Failed to start Frontend tunnel. Logs:"
    Get-Content $FtTunnelLog
    exit 1
}
