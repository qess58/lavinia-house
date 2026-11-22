@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"
title Lavinia House - Vercel'e yayinla

where node >nul 2>nul || (echo Node.js kurulu degil. https://nodejs.org adresinden LTS surumunu kurun. & pause & exit /b 1)

echo.
echo ==================================================
echo    Lavinia House - Vercel'e yayinlama
echo ==================================================
echo  Bu pencere siteyi Vercel'e yukler. Ilk seferde birkac
echo  soru sorabilir; ekrandaki notlara gore cevaplayin.
echo.

rem ---------- 1. Vercel araci ----------
echo [1/6] Vercel araci hazirlaniyor, ilk seferde 1-2 dakika surebilir...
set "VC=vercel"
call npm install --global vercel@latest --no-audit --no-fund --loglevel=error >nul 2>nul
call vercel --version >nul 2>nul
if errorlevel 1 set "VC=npx --yes vercel@latest"
call %VC% --version
if errorlevel 1 goto hata_arac

rem ---------- 2. Giris ----------
echo.
echo [2/6] Vercel hesabi kontrol ediliyor...
call %VC% whoami >nul 2>nul
if not errorlevel 1 goto giris_tamam
echo  Tarayicida Vercel onay sayfasi acilacak. Giris yapip onaylayin,
echo  sonra bu pencereye donun.
call %VC% login
:giris_tamam
call %VC% whoami
if errorlevel 1 goto hata_giris

rem Vercel araci bazen .env.local dosyasi olusturur; bilgisayardaki deneme sitesi
rem canli veritabanina baglanmasin diye, bu pencerenin olusturdugu .env.local sonda silinir.
set "ENVLOCAL_VARDI=0"
if exist ".env.local" set "ENVLOCAL_VARDI=1"

rem ---------- 3. Proje ----------
echo.
echo [3/6] Vercel projesi baglaniyor...
if exist ".vercel\project.json" goto proje_tamam
call %VC% link --yes
if errorlevel 1 goto hata_proje
:proje_tamam

rem ---------- 4. Ayarlar, veritabani, dosya deposu ----------
echo.
echo [4/6] Ayarlar, veritabani ve dosya deposu kontrol ediliyor...
call :ortam_oku

findstr /c:"KURULUM_ANAHTARI" "%TEMP%\lh-ortam.txt" >nul
if errorlevel 1 call :anahtar_ekle

findstr /c:"DATABASE_URL" "%TEMP%\lh-ortam.txt" >nul
if errorlevel 1 call :veritabani_ekle

findstr /c:"BLOB_" "%TEMP%\lh-ortam.txt" >nul
if errorlevel 1 call :depo_ekle

call :ortam_oku
findstr /c:"DATABASE_URL" "%TEMP%\lh-ortam.txt" >nul
if errorlevel 1 goto hata_veritabani
findstr /c:"BLOB_" "%TEMP%\lh-ortam.txt" >nul
if errorlevel 1 goto hata_depo
echo  Veritabani ve dosya deposu bagli.
call :envlocal_temizle

rem ---------- 5. Yayinla ----------
echo.
echo [5/6] Site yayinlaniyor, 2-4 dakika surebilir...
call %VC% deploy --prod --yes
if errorlevel 1 goto hata_yayin

rem ---------- 6. Bitti ----------
echo.
echo ==================================================
echo [6/6] Site yayinda!
echo ==================================================
echo  Site adresiniz yukarida "Aliased" ya da "Production" satirinda yaziyor,
echo  genellikle https://lavinia-house.vercel.app
echo.
echo  Yonetici hesabini acmak icin: [site adresi]/yonetim/kurulum
set "ANAHTAR="
if exist ".vercel\kurulum-anahtari.txt" set /p ANAHTAR=<".vercel\kurulum-anahtari.txt"
if defined ANAHTAR echo  Kurulum anahtari: %ANAHTAR%
if defined ANAHTAR echo  Bu anahtar .vercel\kurulum-anahtari.txt dosyasinda da duruyor.
echo.
echo  Vercel panelinde proje sayfasi aciliyor...
call %VC% open >nul 2>nul
echo.
pause
exit /b 0

rem ================= yardimci adimlar =================
:envlocal_temizle
if "%ENVLOCAL_VARDI%"=="1" exit /b 0
if exist ".env.local" del /q ".env.local"
exit /b 0

:ortam_oku
call %VC% env ls --environment production > "%TEMP%\lh-ortam.txt" 2>&1
exit /b 0

:anahtar_ekle
for /f "usebackq delims=" %%k in (`node -p "require('crypto').randomBytes(12).toString('hex')"`) do set "ANAHTAR=%%k"
call %VC% env add KURULUM_ANAHTARI --environment production --value %ANAHTAR% --sensitive --yes
if errorlevel 1 exit /b 1
if not exist ".vercel" mkdir ".vercel"
> ".vercel\kurulum-anahtari.txt" echo %ANAHTAR%
echo  Yonetici kurulum anahtari olusturuldu.
exit /b 0

:veritabani_ekle
echo.
echo  --- Veritabani olusturuluyor: Neon Postgres, ucretsiz plan ---
echo  Sorulursa:  bolge = Frankfurt / eu-central-1,  plan = Free,
echo              kosullari kabul edin.
echo.
call %VC% integration add neon --name lavinia-house-db -e production -e preview --no-env-pull
exit /b 0

:depo_ekle
echo.
echo  --- Dosya deposu olusturuluyor: Vercel Blob, Frankfurt, gizli erisim ---
call %VC% storage list --type blob > "%TEMP%\lh-depo.txt" 2>&1
findstr /c:"lavinia-house-dosyalar" "%TEMP%\lh-depo.txt" >nul
if errorlevel 1 call %VC% storage create lavinia-house-dosyalar --type blob --access private --region fra1
call %VC% storage connect lavinia-house-dosyalar -e production -e preview --add-rw-token --yes
exit /b 0

rem ================= hatalar =================
:hata_arac
echo.
echo  HATA: Vercel araci kurulamadi. Internet baglantinizi kontrol edip tekrar deneyin.
goto son
:hata_giris
echo.
echo  HATA: Vercel hesabina giris yapilamadi. Pencereyi kapatip tekrar calistirin.
goto son
:hata_proje
echo.
echo  HATA: Vercel projesi olusturulamadi.
goto son
:hata_veritabani
echo.
echo  HATA: Veritabani baglanamadi. Vercel panelinde projeyi acip
echo  Storage ^> Neon ^> Create ^> Frankfurt secip Connect deyin, sonra bu dosyayi tekrar calistirin.
goto son
:hata_depo
echo.
echo  HATA: Dosya deposu baglanamadi. Vercel panelinde projeyi acip
echo  Storage ^> Blob ^> Create ^> Private secip Connect deyin, sonra bu dosyayi tekrar calistirin.
goto son
:hata_yayin
echo.
echo  HATA: Yayinlama basarisiz oldu. Yukaridaki hata mesajinin ekran goruntusunu Claude'a gonderin.
goto son
:son
call :envlocal_temizle
echo.
pause
exit /b 1
