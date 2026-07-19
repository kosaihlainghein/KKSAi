@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
title KKS AI Design Studio
color 0E

set "PYTHON=%CD%\python_embeded\python.exe"
set "COMFYUI_DIR=%CD%\ComfyUI"
if exist "%CD%\nodejs\node-v20.18.0-win-x64\node.exe" set "PATH=%CD%\nodejs\node-v20.18.0-win-x64;%PATH%"

if not exist "!COMFYUI_DIR!\main.py" (
    echo [ERROR] ComfyUI not found. Run setup.bat first.
    pause
    exit /b 1
)

echo ================================================================
echo              KKS AI Design Studio - Launcher
echo ================================================================
echo.

echo [1/3] Starting ComfyUI on port 8188...
start "ComfyUI" cmd /k "cd /d "!COMFYUI_DIR!" && "!PYTHON!" main.py --listen 127.0.0.1 --port 8188"
timeout /t 8 /nobreak >nul

echo [2/3] Starting BLIP Caption Server on port 8189...
if exist "scripts\caption_server.py" (
    start "Caption Server" cmd /k ""!PYTHON!" "scripts\caption_server.py""
    timeout /t 3 /nobreak >nul
) else (
    echo [WARN] caption_server.py not found, skipping.
)

echo [3/3] Starting Web App on port 5173...
start "KKS Web App" cmd /k "npm run dev -- --host"
timeout /t 6 /nobreak >nul

echo.
echo Opening browser...
start http://localhost:5173

echo.
echo ================================================================
echo  KKS AI Design Studio is running!
echo  Browser: http://localhost:5173
echo  ComfyUI: http://localhost:8188
echo  Caption: http://localhost:8189
echo.
echo  Close the 3 command windows to stop all services.
echo ================================================================
pause >nul
