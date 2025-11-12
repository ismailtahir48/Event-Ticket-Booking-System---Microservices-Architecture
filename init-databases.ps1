# PowerShell script to initialize databases

Write-Host "Waiting for PostgreSQL to be ready..."
$env:PGPASSWORD = "postgres"

do {
    Start-Sleep -Seconds 1
    $result = & psql -h localhost -U postgres -c "SELECT 1;" 2>&1
} while ($LASTEXITCODE -ne 0)

Write-Host "Creating databases..."

$databases = @(
    "auth_db",
    "directory_db",
    "catalog_db",
    "seatmap_db",
    "inventory_db",
    "orders_db",
    "payments_db",
    "waitlist_db",
    "search_db"
)

foreach ($db in $databases) {
    & psql -h localhost -U postgres -c "CREATE DATABASE $db;" 2>&1 | Out-Null
    Write-Host "Created database: $db"
}

Write-Host "Databases created successfully!"

