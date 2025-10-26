@echo off
echo Stopping server on port 4000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000') do (
    echo Killing process %%a
    taskkill /PID %%a /F
)
echo Server stopped.
