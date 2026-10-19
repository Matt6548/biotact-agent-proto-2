@echo off
cd /d "%~dp0"
title Martial Training Lab Server
echo Martial Training Lab local server
echo URL: http://127.0.0.1:5173
echo Close this window to stop the server.
echo.
call npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
if errorlevel 1 (
  echo.
  echo Server stopped with an error.
  pause
)
