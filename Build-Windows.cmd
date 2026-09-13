@echo off
cd /d "%~dp0"
node scripts\build-windows.cjs
if errorlevel 1 (echo Build failed. Read the error above. & pause & exit /b 1)
pause
