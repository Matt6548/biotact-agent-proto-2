@echo off
setlocal
cd /d "%~dp0"
title Martial Training Lab Portable Demo

echo.
echo ============================================
echo   MARTIAL TRAINING LAB - PORTABLE DEMO
echo ============================================
echo.

if not exist "dist\index.html" (
  echo [ERROR] Built demo files are missing.
  echo Download and extract the complete martial-training-windows-demo artifact.
  pause
  exit /b 1
)

where py >nul 2>&1
if errorlevel 1 (
  where python >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] Python 3 was not found.
    echo Install Python 3 and run this file again.
    pause
    exit /b 1
  )
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4173' -TimeoutSec 1; if($r.StatusCode -ge 200){exit 0} } catch {}; exit 1"
if errorlevel 1 (
  start "Martial Training Lab Demo Server" "%~dp0RUN_DEMO_SERVER.cmd"
)

echo Waiting for local demo...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; for($i=0;$i -lt 40;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4173' -TimeoutSec 1; if($r.StatusCode -ge 200){$ok=$true;break} } catch {}; Start-Sleep -Milliseconds 250 }; if(-not $ok){exit 1}"
if errorlevel 1 (
  echo.
  echo [ERROR] Local demo did not start.
  echo Check the server window for the exact message.
  pause
  exit /b 1
)

start "" "http://127.0.0.1:4173"

echo.
echo READY.
echo The browser opened the verified local build.
echo No npm, Node.js, Netlify or TinyFish is required for this demo.
echo Keep the Demo Server window open while using the camera.
echo.
pause
