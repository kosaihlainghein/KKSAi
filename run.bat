@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
title KKS AI Smart Trainer
color 0E

set "PYTHON=%CD%\python_embeded\python.exe"
set "COMFYUI_DIR=%CD%\ComfyUI"
if exist "%CD%\nodejs\node-v20.18.0-win-x64\node.exe" set "PATH=%CD%\nodejs\node-v20.18.0-win-x64;%PATH%"

if not exist "!COMFYUI_DIR!\main.py" (
    echo [ERROR] Run setup.bat first. ComfyUI not found.
    pause & exit /b 1
)

echo [1/3] Starting ComfyUI on port 8188...
start "ComfyUI" cmd /k "cd /d "!COMFYUI_DIR!" && "!PYTHON!" main.py --listen 127.0.0.1 --port 8188"
timeout /t 8 /nobreak >nul

echo [2/3] Starting Caption Server on port 8189...
if exist "scripts\caption_server.py" (
    start "Caption Server" cmd /k ""!PYTHON!" "scripts\caption_server.py""
    timeout /t 3 /nobreak >nul
)

echo [3/3] Starting Web App on port 5173...
start "KKS Web App" cmd /k "npm run dev -- --host"
timeout /t 6 /nobreak >nul

start http://localhost:5173
echo.
echo  AI Studio running! Browser opened to http://localhost:5173
echo  Close the 3 command windows to stop.
pause >nul
