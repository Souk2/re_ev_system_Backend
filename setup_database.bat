@echo off
set PGPASSWORD=542494

echo ====================================
echo Setting up Database...
echo ====================================
echo.

echo Step 1: Creating database...
psql -U postgres -c "CREATE DATABASE re_ev_system;" 2>nul
if %errorlevel% equ 0 (
    echo [OK] Database created
) else (
    echo [INFO] Database might already exist
)

echo.
echo Step 2: Running database schema...
psql -U postgres -d re_ev_system -f "..\database.sql"
if %errorlevel% equ 0 (
    echo [OK] Schema applied
) else (
    echo [ERROR] Failed to apply schema
    pause
    exit /b 1
)

echo.
echo Step 3: Creating test users...
psql -U postgres -d re_ev_system -f "..\test_users.sql"
if %errorlevel% equ 0 (
    echo [OK] Test users created
) else (
    echo [ERROR] Failed to create test users
    pause
    exit /b 1
)

echo.
echo ====================================
echo Setup Complete!
echo ====================================
echo.
echo Test Credentials:
echo   Admin: admin / admin
echo   Staff: staff / staff
echo.
pause
