@echo off
echo Starting Locality Server...
start cmd /k "cd /d %~dp0 && call backend_venv\Scripts\activate.bat && uvicorn main:app --reload --host 127.0.0.1 --port 8080"

echo Starting Frontend...
start cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo Opening Browser...
timeout /t 3 >nul
start http://localhost:5173
