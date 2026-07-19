@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
title KKS AI Design Studio - Setup
color 0E

echo.
echo  ================================================================
echo                  KKS AI Design Studio - Setup
echo  ================================================================
echo.
echo  Press any key to start the installation...
pause >nul

echo.
echo  [1/7] Checking Node.js...
where node >nul 2>&1
if !errorlevel! neq 0 (
    echo  [INFO] Downloading Node.js v20 (portable)...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip' -OutFile 'node_install.zip'"
    powershell -Command "Expand-Archive -Path 'node_install.zip' -DestinationPath 'nodejs' -Force"
    set "PATH=%CD%\nodejs\node-v20.18.0-win-x64;%PATH%"
    del node_install.zip
    echo  [OK] Node.js v20 installed
) else (
    echo  [OK] Node.js found
)

echo.
echo  [2/7] Checking Python 3.11 embedded...
set "PYTHON_DIR=%CD%\python_embeded"
if not exist "!PYTHON_DIR!\python.exe" (
    echo  [INFO] Downloading Python 3.11 embedded...
    powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip' -OutFile 'python_embed.zip'"
    mkdir "!PYTHON_DIR!" 2>nul
    powershell -Command "Expand-Archive -Path 'python_embed.zip' -DestinationPath '!PYTHON_DIR!' -Force"
    del python_embed.zip
    powershell -Command "(Get-Content '!PYTHON_DIR!\python311._pth') -replace '#import site', 'import site' | Set-Content '!PYTHON_DIR!\python311._pth'"
    powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile 'get-pip.py'"
    "!PYTHON_DIR!\python.exe" get-pip.py --quiet
    del get-pip.py
    echo  [OK] Python 3.11 embedded installed
) else (
    echo  [OK] Python 3.11 found
)
set "PYTHON=!PYTHON_DIR!\python.exe"

echo.
echo  [3/7] Installing PyTorch with CUDA 12.1 + Transformers + Pillow...
"!PYTHON!" -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121 --quiet 2>nul
if !errorlevel! neq 0 (
    echo  [WARN] CUDA install failed, falling back to CPU...
    "!PYTHON!" -m pip install torch torchvision --quiet 2>nul
)
"!PYTHON!" -m pip install transformers pillow --quiet 2>nul
echo  [OK] Python packages installed

echo.
echo  [4/7] Cloning ComfyUI...
set "COMFYUI_DIR=%CD%\ComfyUI"
if not exist "!COMFYUI_DIR!\main.py" (
    git clone https://github.com/comfyanonymous/ComfyUI.git "!COMFYUI_DIR!"
    "!PYTHON!" -m pip install -r "!COMFYUI_DIR!\requirements.txt" --quiet 2>nul
    echo  [OK] ComfyUI installed
) else (
    echo  [OK] ComfyUI already exists
)

echo.
echo  [5/7] Installing AnimateDiff-Evolved custom node...
set "CUSTOM_NODES=!COMFYUI_DIR!\custom_nodes"
if not exist "!CUSTOM_NODES!\ComfyUI-AnimateDiff-Evolved" (
    git clone https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved.git "!CUSTOM_NODES!\ComfyUI-AnimateDiff-Evolved"
    echo  [OK] AnimateDiff-Evolved installed
) else (
    echo  [OK] AnimateDiff-Evolved already exists
)

echo.
echo  [6/7] Downloading models...
mkdir "!COMFYUI_DIR!\models\checkpoints" 2>nul
mkdir "!COMFYUI_DIR!\models\animatediff_models" 2>nul

if not exist "!COMFYUI_DIR!\models\checkpoints\sd1.5-pruned.ckpt" (
    echo  [INFO] Downloading SD 1.5 weights (4GB)...
    powershell -Command "Invoke-WebRequest -Uri 'https://huggingface.co/stableai/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.ckpt' -OutFile '!COMFYUI_DIR!\models\checkpoints\sd1.5-pruned.ckpt'"
    echo  [OK] SD 1.5 downloaded
) else (
    echo  [OK] SD 1.5 already exists
)

if not exist "!COMFYUI_DIR!\models\animatediff_models\mm_sd_v15_v2.ckpt" (
    echo  [INFO] Downloading AnimateDiff motion module (1.5GB)...
    powershell -Command "Invoke-WebRequest -Uri 'https://huggingface.co/guoyww/animatediff/resolve/main/mm_sd_v15_v2.ckpt' -OutFile '!COMFYUI_DIR!\models\animatediff_models\mm_sd_v15_v2.ckpt'"
    echo  [OK] AnimateDiff motion module downloaded
) else (
    echo  [OK] AnimateDiff motion module already exists
)

echo.
echo  [7/7] Installing and building web app...
call npm install
call npm run build

echo.
echo  ================================================================
echo              Setup Complete!
echo  Run run.bat to start KKS AI Design Studio.
echo  ================================================================
pause >nul
