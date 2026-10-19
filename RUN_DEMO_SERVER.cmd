@echo off
setlocal
cd /d "%~dp0"
title Martial Training Lab Demo Server

echo.
echo Martial Training Lab portable demo
echo URL: http://127.0.0.1:4173
echo Close this window to stop the demo.
echo.

if not exist "dist\index.html" (
  echo [ERROR] dist\index.html is missing.
  echo Use the complete portable demo ZIP from GitHub Actions.
  pause
  exit /b 1
)

where py >nul 2>&1
if not errorlevel 1 (
  py -3 PORTABLE_SERVER.py --root dist --host 127.0.0.1 --port 4173
  goto :done
)

where python >nul 2>&1
if not errorlevel 1 (
  python PORTABLE_SERVER.py --root dist --host 127.0.0.1 --port 4173
  goto :done
)

echo [ERROR] Python 3 was not found.
echo Install Python 3, then run OPEN_DEMO.cmd again.
pause
exit /b 1

:done
if errorlevel 1 (
  echo.
  echo Demo server stopped with an error.
  pause
)
