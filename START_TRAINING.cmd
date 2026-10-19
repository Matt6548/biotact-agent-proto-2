@echo off
setlocal
cd /d "%~dp0"
title Martial Training Lab Launcher

echo.
echo ============================================
echo   MARTIAL TRAINING LAB - LOCAL START
echo ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Install Node.js 22 LTS, then run this file again.
  pause
  exit /b 1
)

node scripts\runtime-check.mjs
if errorlevel 1 (
  pause
  exit /b 1
)

if not exist "node_modules\vite\package.json" (
  echo [1/3] Installing locked dependencies...
  call npm ci --no-audit --no-fund
  if errorlevel 1 goto :fail
) else (
  echo [1/3] Dependencies already installed.
)

echo [2/3] Preparing local pose model and WASM...
call npm run prepare:vision
if errorlevel 1 goto :fail

echo [3/3] Final launch check...
call npm run launch:check
if errorlevel 1 goto :fail

echo.
echo Starting local training server...
start "Martial Training Lab Server" "%~dp0RUN_SERVER.cmd"

echo Waiting for localhost...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; for($i=0;$i -lt 40;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5173' -TimeoutSec 1; if($r.StatusCode -ge 200){$ok=$true;break} } catch {}; Start-Sleep -Milliseconds 250 }; if(-not $ok){exit 1}"
if errorlevel 1 (
  echo.
  echo [WARNING] Server window opened, but localhost did not answer yet.
  echo Open http://127.0.0.1:5173 manually after a few seconds.
  pause
  exit /b 0
)

start "" "http://127.0.0.1:5173"

echo.
echo READY.
echo Browser opened at http://127.0.0.1:5173
echo Camera access works on localhost.
echo Keep the server window open while training.
echo Close the server window when finished.
echo.
pause
exit /b 0

:fail
echo.
echo [ERROR] Launch preparation failed. Read the message above.
pause
exit /b 1
