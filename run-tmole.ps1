# Nexus Public Deployment Script with Tunnelmole
$BkTunnelLog = "d:\Heart-Stroke-Predictor-main\Heart-Stroke-Predictor-main\backend-tmole.log"
$FtTunnelLog = "d:\Heart-Stroke-Predictor-main\Heart-Stroke-Predictor-main\frontend-tmole.log"
$BkErrLog = "d:\Heart-Stroke-Predictor-main\Heart-Stroke-Predictor-main\backend-tmole-err.log"
$FtErrLog = "d:\Heart-Stroke-Predictor-main\Heart-Stroke-Predictor-main\frontend-tmole-err.log"

# Clean old logs
Remove-Item $BkTunnelLog -ErrorAction SilentlyContinue
Remove-Item $FtTunnelLog -ErrorAction SilentlyContinue
Remove-Item $BkErrLog -ErrorAction SilentlyContinue
Remove-Item $FtErrLog -ErrorAction SilentlyContinue

# Stop existing processes on ports 8000, 5173, 5174 to avoid conflicts
Write-Host "Stopping any existing processes on ports 8000, 5173, and 5174..." -ForegroundColor Yellow
$ports = @(8000, 5173, 5174)
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        $pids = $conn.OwningProcess | Select-Object -Unique
        foreach ($p in $pids) {
            Write-Host "Killing process $p on port $port..." -ForegroundColor Cyan
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        }
    }
}

# Stop any orphaned tunnelmole processes
Write-Host "Killing any orphaned tunnelmole processes..." -ForegroundColor Yellow
Get-CimInstance Win32_Process -Filter "name = 'node.exe'" | Where-Object { $_.CommandLine -like "*tunnelmole*" } | ForEach-Object {
    Write-Host "Killing tunnelmole process $($_.ProcessId)..." -ForegroundColor Cyan
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Host "1. Starting FastAPI Backend on port 8000..." -ForegroundColor Cyan
Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "main:app", "--port", "8000" -NoNewWindow

Start-Sleep -Seconds 5

Write-Host "2. Starting public tunnel for FastAPI Backend on port 8000..." -ForegroundColor Cyan
Start-Process -FilePath "npx.cmd" -ArgumentList "tunnelmole", "8000" -RedirectStandardOutput $BkTunnelLog -RedirectStandardError $BkErrLog -NoNewWindow

Write-Host "Waiting for Backend tunnel to initialize..."
Start-Sleep -Seconds 8

# Retrieve backend URL from logs
$BkUrl = $null
if (Test-Path $BkTunnelLog) {
    $BkUrlLine = Get-Content $BkTunnelLog | Select-String -Pattern "https://.*\.tunnelmole\.net" | Select-Object -First 1
    if ($BkUrlLine) {
        if ($BkUrlLine.Line -match "(https://[a-zA-Z0-9\-]+\.tunnelmole\.net)") {
            $BkUrl = $Matches[1]
        }
    }
}

if ($BkUrl) {
    Write-Host "Backend Tunnel Active: $BkUrl" -ForegroundColor Green
} else {
    Write-Error "Failed to start Backend tunnel. Logs:"
    if (Test-Path $BkTunnelLog) { Get-Content $BkTunnelLog }
    if (Test-Path $BkErrLog) {
        Write-Host "Error details:"
        Get-Content $BkErrLog
    }
    exit 1
}

Write-Host "3. Updating React Config (src/App.jsx) with Backend URL..." -ForegroundColor Cyan
$AppPath = "d:\Heart-Stroke-Predictor-main\Heart-Stroke-Predictor-main\src\App.jsx"
$AppContent = Get-Content $AppPath -Raw
$AppContent = $AppContent -replace "const BACKEND_URL = '[^']+'", "const BACKEND_URL = '$BkUrl'"
Set-Content $AppPath $AppContent -NoNewline

Write-Host "4. Starting Vite Frontend on port 5173..." -ForegroundColor Cyan
# Start Vite on port 5173 explicitly
Start-Process -FilePath "npx.cmd" -ArgumentList "vite", "--port", "5173" -NoNewWindow

Start-Sleep -Seconds 5

Write-Host "5. Starting public tunnel for React Frontend on port 5173..." -ForegroundColor Cyan
Start-Process -FilePath "npx.cmd" -ArgumentList "tunnelmole", "5173" -RedirectStandardOutput $FtTunnelLog -RedirectStandardError $FtErrLog -NoNewWindow

Write-Host "Waiting for Frontend tunnel to initialize..."
Start-Sleep -Seconds 8

$FtUrl = $null
if (Test-Path $FtTunnelLog) {
    $FtUrlLine = Get-Content $FtTunnelLog | Select-String -Pattern "https://.*\.tunnelmole\.net" | Select-Object -First 1
    if ($FtUrlLine) {
        if ($FtUrlLine.Line -match "(https://[a-zA-Z0-9\-]+\.tunnelmole\.net)") {
            $FtUrl = $Matches[1]
        }
    }
}

if ($FtUrl) {
    Write-Host "`n==================================================" -ForegroundColor Magenta
    Write-Host "🚀 LAUNCH SUCCESSFUL!" -ForegroundColor Green
    Write-Host "Frontend Public URL (Share this!): $FtUrl" -ForegroundColor Cyan
    Write-Host "Backend Public API URL: $BkUrl" -ForegroundColor Yellow
    Write-Host "==================================================" -ForegroundColor Magenta
} else {
    Write-Error "Failed to start Frontend tunnel. Logs:"
    if (Test-Path $FtTunnelLog) { Get-Content $FtTunnelLog }
    if (Test-Path $FtErrLog) {
        Write-Host "Error details:"
        Get-Content $FtErrLog
    }
    exit 1
}
