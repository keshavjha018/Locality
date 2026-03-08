@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   Locality Automated Release Packager
echo ===================================================
echo.

echo [1/4] Building React Frontend...
cd frontend
call npm run build
if errorlevel 1 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b 1
)
cd ..
echo [OK] Frontend built successfully.
echo.

echo [2/4] Obfuscating Python Backend with PyArmor...
pyarmor gen -O release main.py sync.py database.py ingestion.py
if errorlevel 1 (
    echo [ERROR] PyArmor obfuscation failed! Ensure pyarmor is installed: pip install pyarmor
    pause
    exit /b 1
)
echo [OK] Python backend obfuscated.
echo.

echo [3/4] Assembling Release Package...
:: Copy built frontend
robocopy frontend\dist release\frontend\dist /E /NFL /NDL /NJH /NJS /nc /ns /np
:: Copy required configuration files
copy requirements.txt release\ >nul
copy README.md release\ >nul
:: start.bat is maintained directly in the release/ directory.
echo [OK] Files assembled in release\ folder.
echo.

echo [4/4] Compressing into Locality_Release.zip...
if exist "Locality_Release.zip" (
    del "Locality_Release.zip" 2>nul
    if exist "Locality_Release.zip" (
        echo.
        echo [ERROR] Locality_Release.zip is locked!
        echo Please close the zip file if you have it open in Windows Explorer or another program, then try again.
        pause
        exit /b 1
    )
)

:: Create a temporary python script to selectively compress everything except ignored folders
echo import zipfile, os > _zip_helper.py
echo exclude = {'env', 'models_cache', 'storage'} >> _zip_helper.py
echo with zipfile.ZipFile('Locality_Release.zip', 'w', zipfile.ZIP_DEFLATED) as zf: >> _zip_helper.py
echo     for root, dirs, files in os.walk('release'): >> _zip_helper.py
echo         dirs[:] = [d for d in dirs if d not in exclude] >> _zip_helper.py
echo         for file in files: >> _zip_helper.py
echo             zf.write(os.path.join(root, file), os.path.relpath(os.path.join(root, file), 'release')) >> _zip_helper.py

python _zip_helper.py
if errorlevel 1 (
    echo [ERROR] Zipping failed!
    del _zip_helper.py 2>nul
    pause
    exit /b 1
)
del _zip_helper.py 2>nul
echo [OK] Compression complete!
echo.

echo ===================================================
echo   SUCCESS! Release package generated: Locality_Release.zip
echo ===================================================
pause
