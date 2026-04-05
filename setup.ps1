# Database Setup Script
# Run this in PowerShell: .\setup.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$DB_NAME = "re_ev_system"
$DB_USER = "postgres"

Write-Host "Step 1: Testing PostgreSQL connection..." -ForegroundColor Yellow
Write-Host "Enter your postgres password when prompted." -ForegroundColor Yellow
Write-Host ""

# Test connection
$env:PGPASSWORD = Read-Host "Enter PostgreSQL password" -AsSecureString
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:PGPASSWORD))

$env:PGPASSWORD = $plainPassword

# Check if database exists
$dbExists = psql -U $DB_USER -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>$null

if ($dbExists -eq 1) {
    Write-Host "✅ Database '$DB_NAME' already exists!" -ForegroundColor Green
} else {
    Write-Host "❌ Database '$DB_NAME' does not exist." -ForegroundColor Red
    Write-Host "Creating database..." -ForegroundColor Yellow
    
    # Create database
    psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database created successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create database. Check your credentials." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Step 2: Running database schema..." -ForegroundColor Yellow
psql -U $DB_USER -d $DB_NAME -f "..\database.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database schema applied successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Schema might already be applied or there was an error." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 3: Creating test users..." -ForegroundColor Yellow
psql -U $DB_USER -d $DB_NAME -f "..\test_users.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Test users created successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create test users." -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now start the backend server:" -ForegroundColor Yellow
Write-Host "  cd Re_Ev_System_Backend" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor Yellow
Write-Host "  Admin: admin / admin" -ForegroundColor White
Write-Host "  Staff: staff / staff" -ForegroundColor White
Write-Host ""

pause
