@echo off
setlocal enabledelayedexpansion
title Locality Startup

echo ===================================================
echo   Locality Privacy-First Intelligence Engine
echo ===================================================
echo.

:: Check for Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python 3.10+ from python.org and ensure "Add to PATH" is checked.
    pause
    exit /b 1
)

:: Create Virtual Environment
if not exist "env\Scripts\activate.bat" (
    echo [INFO] First time setup: Creating isolated runtime environment...
    python -m venv env
)

:: Activate Virtual Environment
echo [INFO] Activating environment...
call "env\Scripts\activate.bat"

:: Install Requirements
set /p REINSTALL_DEPS="reinstall/refresh dependencies -- Y/N: "
if /I "!REINSTALL_DEPS!"=="Y" (
    echo [INFO] Checking dependencies...
    python -m pip install -r requirements.txt
    if errorlevel 1 (
        echo [WARNING] Dependency installation had issues. The app may be unstable.
    )
) else (
    echo [INFO] Skipping dependency installation.
)

:: Start the Application
echo [INFO] Starting Locality...
echo [INFO] The Web UI will open in your browser automatically shortly.
echo.
echo Please leave this window open while using Locality.
echo To stop the engine, close this window or press Ctrl+C.
echo ===================================================

:: Start the backend and open the browser
start "" cmd /c "echo Waiting for AI engine to initialize... & timeout /t 8 >nul & start http://127.0.0.1:8080"
python -m uvicorn main:app --host 127.0.0.1 --port 8080

pause
