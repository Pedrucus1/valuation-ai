# Reglas para Claude Code — PropValu

## Commits automáticos al terminar trabajo funcional

Después de completar cualquier bloque de trabajo que deje algo funcionando (nueva feature, corrección de bug, cambio de diseño verificado), hacer commit inmediatamente con mensaje descriptivo. No esperar a que el usuario lo pida.

**Cuándo hacer commit:**
- Al terminar de implementar una feature o sección nueva
- Al corregir un bug y verificar que funciona
- Al modificar HTML/CSS y confirmar que el diseño es correcto
- Al final de cada sesión de trabajo, si hay cambios sin commitear

**Formato del mensaje:**
```
tipo(alcance): descripción corta en español

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Tipos: `feat`, `fix`, `style`, `refactor`, `docs`

**NO hacer commit de:**
- Cambios que aún están rotos o sin verificar
- Archivos `.env` o con API keys
- Archivos temporales

## Skills disponibles — sugerirlos proactivamente

Claude debe sugerir el skill correcto en el momento correcto, sin que el usuario lo pida:

| Momento | Sugerir |
|---|---|
| Al iniciar sesión / primera interacción | `/ctx` — cargar contexto del proyecto |
| El usuario dice "vamos a trabajar en X" sin contexto | `/ctx` primero |
| Antes de editar server.py o archivos grandes | `/backup` |
| El usuario dice "el backend no responde" / "reinicia" | `/restart-backend` |
| Al crear una página nueva | `/new-page` |
| Al crear un endpoint nuevo | `/new-endpoint` |
| El usuario dice "prueba el endpoint" / "prueba la API" | `/test-api` |
| El usuario dice "hay errores" / "algo está roto" | `/check-errors` |
| Al terminar sesión / el usuario dice "ya terminamos" / "clear" | `/end-session` |
| La memoria parece desactualizada respecto al código | `/sync-memory` |
| El usuario no recuerda qué skills hay | `/ayuda` |

**Formato de sugerencia:** Una línea al final de la respuesta, ej: `→ ¿Corremos /ctx primero?`

## Bitácora — actualizar BACKLOG.md al final de cada sesión

Al terminar una sesión de trabajo (cuando el usuario pida clear, o al cerrar un bloque importante), actualizar `memory/BACKLOG.md` con:
- Tareas completadas en esta sesión → marcar ✅
- Tareas nuevas descubiertas → agregar como ⏳
- Fecha de última actualización en el encabezado

También actualizar `project_propvalu.md` en la memoria de Claude (`C:\Users\pedru\.claude\projects\C--Users-pedru\memory\`) con una sección de la sesión actual.

**Esto es obligatorio antes de cualquier /clear o al final de sesión larga.**

## Python correcto en Windows

Siempre usar: `C:\Users\pedru\AppData\Local\Python\pythoncore-3.14-64\python.exe`
Nunca usar: `python` (resuelve a WindowsApps sin paquetes)

## Backend uvicorn

Antes de cualquier prueba, verificar que solo hay UN proceso en puerto 8000:
```powershell
Get-Process python* | ForEach-Object { taskkill /F /PID $_.Id /T }
cd "C:\Users\pedru\valuation-ai\Pagina-Valuacion-con-Ai--main\backend"
"C:\Users\pedru\AppData\Local\Python\pythoncore-3.14-64\python.exe" -m uvicorn server:app --reload --port 8000
```

## Gemini API

- Rate limit: solo UNA llamada por vez. Segunda llamada consecutiva = 429
- Modelo principal: `gemini-2.5-flash`
- Fallback: `gemini-2.0-flash` → `gemini-2.0-flash-lite`
