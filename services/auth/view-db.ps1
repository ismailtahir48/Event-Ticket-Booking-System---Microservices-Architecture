# Quick script to view auth database

Write-Host "📊 Auth Database - Users Table" -ForegroundColor Cyan
Write-Host ""

$query = @"
SELECT 
    id,
    email,
    role,
    org_id,
    created_at
FROM users
ORDER BY created_at DESC;
"@

docker exec app-stack6-postgres-1 psql -U postgres -d auth_db -c $query

Write-Host ""
Write-Host "💡 To view in Drizzle Studio:" -ForegroundColor Yellow
Write-Host "   1. Open: http://localhost:4983" -ForegroundColor Green
Write-Host "   2. Or use online: https://drizzle.team/studio" -ForegroundColor Green
Write-Host "      Connection: postgresql://postgres:postgres@localhost:5432/auth_db" -ForegroundColor Cyan

