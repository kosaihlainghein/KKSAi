@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
title KKS AI Smart Trainer — AI Studio
color 0E

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║           KKS AI Smart Trainer — Starting...                 ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

:: ─── Set up paths ────────────────────────────────────────────────
set "PYTHON_DIR=%CD%\python_embeded"
set "PYTHON=%PYTHON_DIR%\python.exe"
set "COMFYUI_DIR=%CD%\ComfyUI"
set "CAPTION_SCRIPT=%CD%\scripts\caption_server.py"

:: Add portable Node.js to PATH if it exists
if exist "%CD%\nodejs\node-v20.18.0-win-x64\node.exe" (
    set "PATH=%CD%\nodejs\node-v20.18.0-win-x64;%PATH%"
)

:: ─── Verify setup has been run ───────────────────────────────────
if not exist "!COMFYUI_DIR!\main.py" (
    echo  [ERROR] ComfyUI not found. Please run setup.bat first.
    pause
    exit /b 1
)

if not exist "!PYTHON!" (
    echo  [ERROR] Python not found. Please run setup.bat first.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo  [ERROR] Node modules not found. Please run setup.bat first.
    pause
    exit /b 1
)

echo  [OK] All components found. Starting services...
echo.

:: ─── Start ComfyUI backend ───────────────────────────────────────
echo  [1/3] Starting ComfyUI backend on port 8188...
start "ComfyUI Backend" cmd /k "cd /d "!COMFYUI_DIR!" && "!PYTHON!" main.py --listen 127.0.0.1 --port 8188"

:: Wait for ComfyUI to be ready
echo  [INFO] Waiting for ComfyUI to initialize...
timeout /t 10 /nobreak >nul

:: ─── Start BLIP Caption server ───────────────────────────────────
echo  [2/3] Starting BLIP Caption server on port 8189...
if exist "!CAPTION_SCRIPT!" (
    start "Caption Server" cmd /k ""!PYTHON!" "!CAPTION_SCRIPT!""
    timeout /t 3 /nobreak >nul
    echo  [OK] Caption server started
) else (
    echo  [WARN] Caption server script not found at !CAPTION_SCRIPT!
    echo         Auto-caption will run in demo mode.
)

:: ─── Start web app ───────────────────────────────────────────────
echo  [3/3] Starting KKS AI Smart Trainer web app on port 5173...
start "KKS Web App" cmd /k "npm run dev -- --host"

:: Wait for the dev server to start
echo  [INFO] Waiting for web server to start...
timeout /t 8 /nobreak >nul

:: ─── Open browser ────────────────────────────────────────────────
echo  [OK] Opening browser...
start http://localhost:5173

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                    AI Studio is Running!                     ║
echo  ╠══════════════════════════════════════════════════════════════╣
echo  ║                                                              ║
echo  ║  Web App:        http://localhost:5173                      ║
echo  ║  ComfyUI:        http://localhost:8188                      ║
echo  ║  Caption Server: http://localhost:8189                      ║
echo  ║                                                              ║
echo  ║  Three command windows are running in the background:       ║
echo  ║    - ComfyUI Backend                                        ║
echo  ║    - Caption Server                                         ║
echo  ║    - Web App (Vite dev server)                              ║
echo  ║                                                              ║
echo  ║  To stop the studio, close all three command windows.       ║
echo  ║  Or press any key here to open the app again.               ║
echo  ║                                                              ║
echo  ║  TIP: First image generation may take 30-60 seconds         ║
echo  ║       as the AI model loads into your GPU VRAM.             ║
echo  ║                                                              ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Press any key to keep this window open (services continue running)
pause >nul
