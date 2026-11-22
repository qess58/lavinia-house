@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js kurulu degil. https://nodejs.org adresinden LTS surumunu kurun. & pause & exit /b)
if not exist node_modules (echo Ilk kurulum yapiliyor, birkac dakika surebilir...)
rem Yeni eklenen paketler varsa kurar (guncelse birkac saniye surer)
call npm install --no-audit --no-fund --loglevel=error
echo Site aciliyor: http://localhost:3000
start "" http://localhost:3000
call npm run dev
