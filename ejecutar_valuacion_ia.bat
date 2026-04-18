@echo off
title Ejecutor de Valuación IA - PropValu
echo ===================================================
echo   INICIANDO ESCANEO Y EXTRACCION DE AVALUOS IA
echo ===================================================
echo.

cd /d "%~dp0"
node "Modulo Drive IA/orquestador.js"

echo.
echo ===================================================
echo   PROCESO FINALIZADO
echo ===================================================
echo Este reporte ya esta disponible en tu Google Sheet.
echo.
pause
