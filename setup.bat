@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
title KKS AI Smart Trainer — Setup Installer
color 0E

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║              KKS AI Smart Trainer — Setup                     ║
echo  ║         Complete Offline AI Studio Installer                   ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  This installer will set up:
echo    1. Node.js (if missing)
echo    2. Python 3.11 embedded (portable, no system install)
echo    3. ComfyUI (local AI image/video generation engine)
echo    4. SD 1.5 model + AnimateDiff motion module
echo    5. BLIP auto-caption server
echo    6. Web app dependencies (npm install)
echo.
echo  Press any key to start, or close this window to cancel...
pause >nul

echo.
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  [1/7] Checking prerequisites...
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

:: ─── Check for Git ───────────────────────────────────────────────
where git >nul 2>&1
if !errorlevel! neq 0 (
    echo  [WARN] Git not found. Please install Git from https://git-scm.com
    echo         ComfyUI download will be skipped. Continuing anyway...
) else (
    echo  [OK] Git found
)

:: ─── Check / Install Node.js ─────────────────────────────────────
where node >nul 2>&1
if !errorlevel! neq 0 (
    echo  [INFO] Node.js not found. Downloading Node.js v20...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip' -OutFile 'node_install.zip'"
    if exist node_install.zip (
        powershell -Command "Expand-Archive -Path 'node_install.zip' -DestinationPath 'nodejs' -Force"
        set "PATH=%CD%\nodejs\node-v20.18.0-win-x64;%PATH%"
        echo  [OK] Node.js v20 installed (portable)
        del node_install.zip
    ) else (
        echo  [ERROR] Failed to download Node.js. Please install manually from https://nodejs.org
        pause
        exit /b 1
    )
) else (
    echo  [OK] Node.js found: 
    node --version
)

:: ─── Check / Download Python 3.11 embedded ───────────────────────
set "PYTHON_DIR=%CD%\python_embeded"
if not exist "!PYTHON_DIR!\python.exe" (
    echo  [INFO] Downloading Python 3.11 embedded...
    powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip' -OutFile 'python_embed.zip'"
    if exist python_embed.zip (
        mkdir "!PYTHON_DIR!" 2>nul
        powershell -Command "Expand-Archive -Path 'python_embed.zip' -DestinationPath '!PYTHON_DIR!' -Force"
        del python_embed.zip

        :: Enable pip by uncommenting import site in python311._pth
        powershell -Command "(Get-Content '!PYTHON_DIR!\python311._pth') -replace '#import site', 'import site' | Set-Content '!PYTHON_DIR!\python311._pth'"

        :: Install pip
        echo  [INFO] Installing pip...
        powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile 'get-pip.py'"
        "!PYTHON_DIR!\python.exe" get-pip.py --quiet
        del get-pip.py
        echo  [OK] Python 3.11 embedded installed
    ) else (
        echo  [ERROR] Failed to download Python. ComfyUI will not work.
        pause
        exit /b 1
    )
) else (
    echo  [OK] Python 3.11 embedded found
)

set "PYTHON=!PYTHON_DIR!\python.exe"
set "PIP=!PYTHON_DIR!\python.exe -m pip"

echo.
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  [2/7] Installing Python AI packages (PyTorch, Transformers)...
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

:: ─── Install PyTorch (CPU first, then CUDA if available) ────────
echo  [INFO] Installing PyTorch with CUDA support...
echo  [INFO] This is a large download (^~2.5GB^). Please be patient...
!PIP! install torch torchvision --index-url https://download.pytorch.org/whl/cu121 --quiet 2>nul
if !errorlevel! neq 0 (
    echo  [WARN] CUDA PyTorch install failed. Trying CPU version...
    !PIP! install torch torchvision --quiet 2>nul
    if !errorlevel! neq 0 (
        echo  [ERROR] Failed to install PyTorch
        pause
        exit /b 1
    )
    echo  [WARN] Using CPU-only PyTorch (generation will be slower)
) else (
    echo  [OK] PyTorch with CUDA installed
)

:: ─── Install Transformers + Pillow for caption server ───────────
echo  [INFO] Installing Transformers and Pillow...
!PIP! install transformers pillow --quiet 2>nul
if !errorlevel! neq 0 (
    echo  [ERROR] Failed to install transformers/pillow
    pause
    exit /b 1
)
echo  [OK] Transformers + Pillow installed

echo.
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  [3/7] Downloading ComfyUI...
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

set "COMFYUI_DIR=%CD%\ComfyUI"
if exist "!COMFYUI_DIR!\main.py" (
    echo  [OK] ComfyUI already exists, skipping download
) else (
    where git >nul 2>&1
    if !errorlevel! neq 0 (
        echo  [ERROR] Git is required to download ComfyUI
        echo         Install from: https://git-scm.com/download/win
        pause
        exit /b 1
    )
    echo  [INFO] Cloning ComfyUI repository...
    git clone https://github.com/comfyanonymous/ComfyUI.git "!COMFYUI_DIR!"
    if !errorlevel! neq 0 (
        echo  [ERROR] Failed to clone ComfyUI
        pause
        exit /b 1
    )
    echo  [OK] ComfyUI cloned
)

:: ─── Install ComfyUI requirements ───────────────────────────────
echo  [INFO] Installing ComfyUI Python dependencies...
!PIP! install -r "!COMFYUI_DIR!\requirements.txt" --quiet 2>nul
if !errorlevel! neq 0 (
    echo  [WARN] Some ComfyUI requirements may have failed. Continuing...
) else (
    echo  [OK] ComfyUI dependencies installed
)

echo.
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  [4/7] Installing ComfyUI custom nodes (AnimateDiff)...
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

set "CUSTOM_NODES=!COMFYUI_DIR!\custom_nodes"
if not exist "!CUSTOM_NODES!\ComfyUI-AnimateDiff-Evolved" (
    where git >nul 2>&1
    if !errorlevel! equ 0 (
        echo  [INFO] Installing AnimateDiff-Evolved custom node...
        git clone https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved.git "!CUSTOM_NODES!\ComfyUI-AnimateDiff-Evolved" 2>nul
        if !errorlevel! equ 0 (
            echo  [OK] AnimateDiff-Evolved installed
        ) else (
            echo  [WARN] Failed to install AnimateDiff-Evolved
        )
    ) else (
        echo  [WARN] Git not found, skipping custom nodes
    )
) else (
    echo  [OK] AnimateDiff-Evolved already installed
)

echo.
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  [5/7] Downloading AI model weights...
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

set "MODELS_DIR=!COMFYUI_DIR!\models\checkpoints"
set "MOTION_DIR=!COMFYUI_DIR!\models\animatediff_models"

mkdir "!MODELS_DIR!" 2>nul
mkdir "!MOTION_DIR!" 2>nul

:: ─── SD 1.5 pruned model (2GB) ──────────────────────────────────
if not exist "!MODELS_DIR!\sd1.5-pruned.ckpt" (
    if not exist "!MODELS_DIR!\v1-5-pruned-emaonly.ckpt" (
        echo  [INFO] Downloading Stable Diffusion 1.5 model (4GB)...
        echo  [INFO] This is a large download. Please be patient...
        powershell -Command "Invoke-WebRequest -Uri 'https://huggingface.co/stableai/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.ckpt' -OutFile '!MODELS_DIR!\sd1.5-pruned.ckpt'"
        if exist "!MODELS_DIR!\sd1.5-pruned.ckpt" (
            echo  [OK] SD 1.5 model downloaded
        ) else (
            echo  [WARN] SD 1.5 download failed. You can download manually:
            echo         https://huggingface.co/stableai/stable-diffusion-v1-5
            echo         Place the .ckpt file in: !MODELS_DIR!
        )
    ) else (
        echo  [OK] SD 1.5 model already exists
    )
) else (
    echo  [OK] SD 1.5 model already exists
)

:: ─── AnimateDiff motion module ──────────────────────────────────
if not exist "!MOTION_DIR!\mm_sd_v15_v2.ckpt" (
    echo  [INFO] Downloading AnimateDiff motion module (1.5GB)...
    powershell -Command "Invoke-WebRequest -Uri 'https://huggingface.co/guoyww/animatediff/resolve/main/mm_sd_v15_v2.ckpt' -OutFile '!MOTION_DIR!\mm_sd_v15_v2.ckpt'"
    if exist "!MOTION_DIR!\mm_sd_v15_v2.ckpt" (
        echo  [OK] AnimateDiff motion module downloaded
    ) else (
        echo  [WARN] AnimateDiff motion module download failed.
        echo         Download manually from:
        echo         https://huggingface.co/guoyww/animatediff
        echo         Place mm_sd_v15_v2.ckpt in: !MOTION_DIR!
    )
) else (
    echo  [OK] AnimateDiff motion module already exists
)

echo.
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  [6/7] Installing web app dependencies (npm install)...
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

where npm >nul 2>&1
if !errorlevel! neq 0 (
    :: Try portable node path
    set "PATH=%CD%\nodejs\node-v20.18.0-win-x64;%PATH%"
)
call npm install
if !errorlevel! neq 0 (
    echo  [ERROR] npm install failed
    pause
    exit /b 1
)
echo  [OK] npm install complete

echo.
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  [7/7] Building web app for production...
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

call npm run build
if !errorlevel! neq 0 (
    echo  [WARN] Build had issues. The dev server will still work.
) else (
    echo  [OK] Build complete
)

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                    Setup Complete!                            ║
echo  ╠══════════════════════════════════════════════════════════════╣
echo  ║                                                              ║
echo  ║  Everything is installed. To start the AI studio:            ║
echo  ║                                                              ║
echo  ║    Double-click  run.bat                                     ║
echo  ║                                                              ║
echo  ║  This will launch:                                           ║
echo  ║    - ComfyUI backend (port 8188)                            ║
echo  ║    - Caption server (port 8189)                             ║
echo  ║    - Web app (port 5173)                                    ║
echo  ║    - Your browser will open automatically                   ║
echo  ║                                                              ║
echo  ║  First generation may be slow as models load into VRAM.     ║
echo  ║  The BLIP caption model will download on first caption run. ║
echo  ║                                                              ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Press any key to exit...
pause >nul
exit /b 0
