@echo off
echo Matando procesos Python existentes...
wmic process where "name='python.exe'" delete >nul 2>&1
timeout /t 2 /nobreak >nul

echo Iniciando backend PropValu en puerto 8000...
cd /d "C:\Users\pedru\valuation-ai\Pagina-Valuacion-con-Ai--main\backend"
".venv\Scripts\python.exe" -m uvicorn server:app --reload --port 8000
