@echo off
setlocal
cd /d "%~dp0"
title Martial Training Lab Check

echo.
echo ============================================
echo   MARTIAL TRAINING LAB - QUICK CHECK
echo ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install Node.js 22 LTS.
  pause
  exit /b 1
)

if not exist "node_modules\vite\package.json" (
  echo Installing locked dependencies...
  call npm ci --no-audit --no-fund
  if errorlevel 1 goto :fail
)

call npm run prepare:vision
if errorlevel 1 goto :fail

call npm run launch:check
if errorlevel 1 goto :fail

call npm test
if errorlevel 1 goto :fail

call npm run build
if errorlevel 1 goto :fail

echo.
echo PASS: runtime, unit tests and production build are healthy.
echo This quick check does not replace the GitHub browser/fake-camera QA.
pause
exit /b 0

:fail
echo.
echo FAIL: see the error above.
pause
exit /b 1
