@echo off
echo Iniciando PropValu completo...
start "Backend PropValu" "C:\Users\pedru\valuation-ai\Pagina-Valuacion-con-Ai--main\start_backend.bat"
timeout /t 3 /nobreak >nul
start "Frontend PropValu" "C:\Users\pedru\valuation-ai\Pagina-Valuacion-con-Ai--main\start_frontend.bat"
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3001
