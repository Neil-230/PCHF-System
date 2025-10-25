@echo off
echo Checking for existing server on port 4000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000') do (
    echo Killing existing process %%a
    taskkill /PID %%a /F >nul 2>&1
)

echo Starting server...
node src/server.js
