@echo off
echo ================================================
echo Droplets of Creation - API Deployment Script
echo ================================================
echo.

echo IMPORTANT: Before running this script, update wrangler.toml with:
echo 1. Your D1 Database ID (replace YOUR_D1_DATABASE_ID_HERE)
echo 2. Your KV Namespace ID (replace YOUR_KV_NAMESPACE_ID_HERE)
echo.
pause

echo Step 1: Creating D1 database tables...
wrangler d1 execute droplets-db --file=./migrations/0001_initial_schema.sql
if errorlevel 1 (
    echo Failed to run migrations. Make sure you've updated the database ID in wrangler.toml
    pause
    exit /b 1
)

echo.
echo Step 2: Deploying API to Cloudflare Workers...
wrangler deploy
if errorlevel 1 (
    echo Failed to deploy API. Check the error message above.
    pause
    exit /b 1
)

echo.
echo ================================================
echo Deployment Complete!
echo ================================================
echo.
echo Your API should now be available at:
echo https://droplets-api.YOUR-SUBDOMAIN.workers.dev
echo.
echo Next steps:
echo 1. Copy your Worker URL from above
echo 2. Update the frontend to use this API URL
echo.
pause