@echo off
REM ============================================================
REM  CerebroMensual — actualiza cerebro_datos.json con los OPIs
REM  del perito. Lo corre la tarea de Windows "CerebroMensual"
REM  el dia 4 de cada mes. Escanea --meses 3 (mes actual + 2
REM  anteriores) para capturar avaluos de fin de mes entregados
REM  tarde y los que no se terminaron a tiempo el mes previo.
REM ============================================================
cd /d "C:\Users\pedru\valuation-ai\Pagina-Valuacion-con-Ai--main\Modulo Drive IA"
if not exist logs mkdir logs
echo. >> "logs\cerebro_mensual.log"
echo ===== %DATE% %TIME% — inicio EXTRACCION ===== >> "logs\cerebro_mensual.log"

REM --- Paso 1: extraer OPIs nuevos del perito a cerebro_datos.json ---
"C:\Program Files\nodejs\node.exe" actualizar_cerebro.js --meses 3 >> "logs\cerebro_mensual.log" 2>&1
echo ===== %DATE% %TIME% — fin extraccion (exit %ERRORLEVEL%) ===== >> "logs\cerebro_mensual.log"

REM --- Paso 2: validar el motor contra el set ampliado (reporte de precision) ---
REM ONLINE (usa Serper+Gemini de ..\.env): es la metodologia REAL de produccion.
REM Offline daria 0 a las OPIs nuevas en colonias sin cache (las busca en web en prod)
REM y marcaria falsos fallos. --n 1000 = todas las OPIs incl. el mes recien agregado.
echo ===== %DATE% %TIME% — inicio VALIDACION (online) ===== >> "logs\cerebro_mensual.log"
"C:\Program Files\nodejs\node.exe" validar_40_opis.js --n 1000 > "logs\ultima_validacion.txt" 2>&1
echo ===== %DATE% %TIME% — fin validacion (exit %ERRORLEVEL%) ===== >> "logs\cerebro_mensual.log"

REM --- Paso 3: detectar diferencias mayores y escribir logs\REVISAR.txt ---
"C:\Program Files\nodejs\node.exe" revisar_validacion.js >> "logs\cerebro_mensual.log" 2>&1
echo ===== %DATE% %TIME% — REVISAR.txt generado ===== >> "logs\cerebro_mensual.log"
