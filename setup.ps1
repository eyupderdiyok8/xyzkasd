# Water Purifier ERP — Device Management Module Setup
Write-Host "Setting up device management module..." -ForegroundColor Green

# ── Directories ──
$dirs = @(
    "src\repositories",
    "src\lib\storage",
    "src\app\api\devices\[id]\photos",
    "src\app\api\devices\[id]\tds",
    "src\app\api\devices\qr",
    "src\app\(dashboard)\devices\new",
    "src\app\(dashboard)\devices\[id]\edit"
)
foreach ($d in $dirs) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
Write-Host "Directories created." -ForegroundColor Green

# Ensure parent dirs exist
New-Item -ItemType Directory -Force -Path "src\repositories" -ErrorAction SilentlyContinue | Out-Null
New-Item -ItemType Directory -Force -Path "src\lib\storage" -ErrorAction SilentlyContinue | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\api\devices" -ErrorAction SilentlyContinue | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\(dashboard)\devices" -ErrorAction SilentlyContinue | Out-Null

Write-Host "All directories ready." -ForegroundColor Green
