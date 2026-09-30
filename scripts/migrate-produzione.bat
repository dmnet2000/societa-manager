@echo off
rem Applica le migrazioni Prisma al database di PRODUZIONE.
rem Legge DIRECT_URL da .env.production (Session pooler Supabase, porta 5432 -
rem vedi docs\deploy-produzione.md), aggiunge sslmode=require se manca, mostra
rem lo stato delle migrazioni e chiede conferma prima di applicarle.
rem DIRECT_URL impostata qui ha la precedenza su quella di .env (dotenv in
rem prisma.config.ts non sovrascrive variabili gia' presenti).
rem Uso: scripts\migrate-produzione.bat   (doppio clic o da terminale)
setlocal DisableDelayedExpansion

rem Root del progetto = cartella padre di questo script.
cd /d "%~dp0.."

set "FILE_ENV=.env.production"
if not exist "%FILE_ENV%" (
  echo ERRORE: %FILE_ENV% non trovato nella root del progetto.
  goto :errore
)

rem Ultima riga DIRECT_URL=... ; %%~B toglie le virgolette esterne.
set "DIRECT_URL="
for /f "usebackq tokens=1,* delims==" %%A in ("%FILE_ENV%") do (
  if /i "%%A"=="DIRECT_URL" set "DIRECT_URL=%%~B"
)

if not defined DIRECT_URL (
  echo ERRORE: DIRECT_URL mancante o vuota in %FILE_ENV%.
  goto :errore
)

echo "%DIRECT_URL%" | find "sslmode=" >nul
if errorlevel 1 (
  echo "%DIRECT_URL%" | find "?" >nul
  if errorlevel 1 (
    set "DIRECT_URL=%DIRECT_URL%?sslmode=require"
  ) else (
    set "DIRECT_URL=%DIRECT_URL%&sslmode=require"
  )
)

rem Mostra solo l'host, mai la password.
for /f "tokens=2 delims=@" %%H in ("%DIRECT_URL%") do for /f "tokens=1 delims=/?" %%I in ("%%H") do echo Database di PRODUZIONE: %%I
echo.

echo === Stato delle migrazioni ===
rem migrate status esce con codice diverso da 0 quando ci sono migrazioni da
rem applicare: non e' un errore per questo script.
call npx prisma migrate status
echo.

set "RISPOSTA="
set /p "RISPOSTA=Applicare le migrazioni in PRODUZIONE? [s/N] "
if /i not "%RISPOSTA%"=="s" if /i not "%RISPOSTA%"=="si" (
  echo Annullato, nessuna modifica.
  goto :fine
)

call npx prisma migrate deploy
if errorlevel 1 (
  echo ERRORE: migrate deploy non riuscito.
  goto :errore
)
echo.
echo Migrazioni applicate.

:fine
endlocal
pause
exit /b 0

:errore
endlocal
pause
exit /b 1
