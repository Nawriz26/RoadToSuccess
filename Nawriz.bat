@echo off
REM Go to the folder where this bat file lives
cd /d "%~dp0"

REM Start backend in its own window
start "I am on it - Backend" cmd /k "cd backend && npm run dev"

REM Start frontend in its own window
start "I am on it - Frontend" cmd /k "cd frontend && npm run dev"
