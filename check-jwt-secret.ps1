# Script to verify JWT_SECRET is set correctly

Write-Host "Checking JWT_SECRET configuration..." -ForegroundColor Yellow
Write-Host ""

# Check if .env.local exists in root
$rootEnv = ".env.local"
if (Test-Path $rootEnv) {
    Write-Host "✅ Found .env.local in root" -ForegroundColor Green
    $rootContent = Get-Content $rootEnv -Raw
    $rootJwtSecret = $rootContent | Select-String "JWT_SECRET\s*=\s*(.+)" | ForEach-Object { $_.Matches.Groups[1].Value.Trim() }
    if ($rootJwtSecret) {
        Write-Host "   JWT_SECRET=$rootJwtSecret" -ForegroundColor Cyan
    } else {
        Write-Host "   ❌ JWT_SECRET not found in root .env.local" -ForegroundColor Red
    }
} else {
    Write-Host "❌ .env.local not found in root directory" -ForegroundColor Red
    Write-Host "   Create it with: JWT_SECRET=your-secret-key-change-in-production-use-rsa-keys" -ForegroundColor Yellow
}

Write-Host ""

# Check if .env.local exists in services/auth
$authEnv = "services/auth/.env.local"
if (Test-Path $authEnv) {
    Write-Host "✅ Found .env.local in services/auth" -ForegroundColor Green
    $authContent = Get-Content $authEnv -Raw
    $authJwtSecret = $authContent | Select-String "JWT_SECRET\s*=\s*(.+)" | ForEach-Object { $_.Matches.Groups[1].Value.Trim() }
    if ($authJwtSecret) {
        Write-Host "   JWT_SECRET=$authJwtSecret" -ForegroundColor Cyan
    } else {
        Write-Host "   ❌ JWT_SECRET not found in services/auth/.env.local" -ForegroundColor Red
        Write-Host "   File contents:" -ForegroundColor Yellow
        Get-Content $authEnv | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
    }
} else {
    Write-Host "❌ .env.local not found in services/auth" -ForegroundColor Red
    Write-Host "   Create it with: JWT_SECRET=your-secret-key-change-in-production-use-rsa-keys" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "⚠️  IMPORTANT: Both JWT_SECRET values MUST be identical!" -ForegroundColor Yellow
Write-Host ""

# Compare values if both exist
if ($rootJwtSecret -and $authJwtSecret) {
    if ($rootJwtSecret -eq $authJwtSecret) {
        Write-Host "✅ JWT_SECRET values MATCH!" -ForegroundColor Green
    } else {
        Write-Host "❌ JWT_SECRET values DO NOT MATCH!" -ForegroundColor Red
        Write-Host "   Root:      $rootJwtSecret" -ForegroundColor Yellow
        Write-Host "   Auth:      $authJwtSecret" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Fix: Make sure both .env.local files have the EXACT same JWT_SECRET value" -ForegroundColor Red
    }
} elseif ($rootJwtSecret -or $authJwtSecret) {
    Write-Host "⚠️  Cannot compare - one or both JWT_SECRET values are missing" -ForegroundColor Yellow
}
Write-Host ""

