@echo off
title Lonaat Platform Launcher

echo ======================================
echo Starting Lonaat AI Platform
echo ======================================

echo Starting Backend Server...
start cmd /k "cd /d %~dp0lonaat-backend-1 && .\.venv\Scripts\activate && cd backend && python main.py"

timeout /t 4 >nul

echo Starting Frontend Server...
start cmd /k "cd /d %~dp0lonaat-frontend && npm run dev"

echo.
echo ======================================
echo Lonaat is starting...
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo ======================================

pause
