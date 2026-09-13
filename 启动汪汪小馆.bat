@echo off
chcp 65001 >nul
title 汪汪小馆 - 治愈系放置经营手游
echo ========================================================
echo   正在启动《汪汪小馆 (Wangwang Diner)》...
echo ========================================================
cd /d "%~dp0"
start "" "http://127.0.0.1:8089/"
node serve.js
if errorlevel 1 (
  echo.
  echo [提示] 正在打开本地页面...
  start "" "index.html"
)
pause
