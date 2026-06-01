@echo off
REM ============================================================================
REM  lanzar_chrome_scraper.bat
REM  Lanza un Chrome DEDICADO y AISLADO para el scraper de propiedades.com.
REM  - Perfil separado (C:\chrome-scraper-profile) → NO toca tu Chrome personal.
REM  - Puerto de depuracion 9333 → el scraper se conecta aqui, no a tu 9222.
REM  - IP directa (el proxy IPRoyal lo bloquea Akamai; el Chrome real con cookies pasa).
REM
REM  USO:
REM   1. Ejecuta este .bat. Se abre una ventana de Chrome aparte (perfil scraper).
REM   2. UNA SOLA VEZ: entra a https://propiedades.com y navega/resuelve el captcha
REM      si aparece, hasta ver listados. Eso deja cookies validas en el perfil.
REM   3. Deja esa ventana ABIERTA y corre el scraper normal (python scheduler.py).
REM      El scraper usara este Chrome (9333), no el tuyo.
REM   4. Tu Chrome personal: abrelo NORMAL (sin flags). Quedan totalmente separados.
REM ============================================================================

set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

set PROFILE=C:\chrome-scraper-profile
set PORT=9333

echo Lanzando Chrome dedicado del scraper...
echo   Perfil: %PROFILE%
echo   Puerto CDP: %PORT%
echo.

start "" %CHROME% ^
  --remote-debugging-port=%PORT% ^
  --user-data-dir="%PROFILE%" ^
  --no-first-run ^
  --no-default-browser-check ^
  --disable-popup-blocking ^
  https://propiedades.com

echo.
echo Chrome del scraper abierto en el puerto %PORT%.
echo Verifica que en config.py PROPIEDADES_CDP_PORT=%PORT% (ya configurado).
echo Deja esta ventana de Chrome abierta mientras corre el scraper.
