@echo off
TITLE Centro de Control PropValu IA
COLOR 0B

echo ==================================================
echo      SISTEMA DE AGENTES EN PARALELO - PROPVALU
echo ==================================================
echo.
echo Iniciando Agentes... 
echo.

:: Agente 1: Extractor de Conocimiento (Drive)
start "AGENTE 1: EXTRACTOR DRIVE" cmd /k "node 'Modulo Drive IA/extractor_masivo.js'"

:: Agente 2: Analista de Mercado (IA + IIEG)
:: Este agente se activara cuando el extractor tenga suficientes datos
echo Esperando al Agente de Analisis...
timeout /t 5
start "AGENTE 2: ANALISTA IA + IIEG" cmd /k "echo Agente de Analisis en espera de nuevos datos... && node 'Modulo Drive IA/orquestador.js'"

echo.
echo ==================================================
echo   TODOS LOS AGENTES ESTAN TRABAJANDO EN PARALELO
echo   Puedes minimizar estas ventanas y seguir trabajando.
echo ==================================================
pause
