# Reglas para Claude Code — PropValu

## 🚀 Al iniciar sesión (AUTOMÁTICO)
Al primer mensaje, leer **solo** `memory/ESTADO.md` (snapshot compacto) y responder con contexto cargado.
NO leer BACKLOG.md ni project_propvalu.md completos — son grandes; consultarlos por grep cuando la tarea lo pida
(`BACKLOG.md` = tabla de tareas por #; `MOTOR_ANTECEDENTES.md` = motor, SIEMPRE por grep/sección, nunca completo).

## 🗺️ DÓNDE VIVE CADA COSA — leer el índice ANTES de buscar/adivinar
- **Motor** (`Modulo Drive IA/`): leer `Modulo Drive IA/INDICE_MOTOR.md` — cuál motor/validador/caché es canónico vs experimento, dónde están OPIs del perito (`cerebro_datos.json`), comps (`cache_consolidado.json`), IDX (`cache_index.json`), NSE, y cómo correr el validador offline. NUNCA adivinar en qué archivo está algo del motor.
- **Todas las API keys** (qué cuenta/proyecto/valor): memoria `credentials_registry.md`.
- Al crear un archivo o guardar info nueva importante, registrarlo en el índice correspondiente (INDICE_MOTOR.md para el motor) — no dejar cosas sueltas sin mapa.

## ⚡ Token efficiency (CRÍTICO) — ver `~/.claude/EFFICIENCY.md`
- 1 archivo → Read una vez → Edit una vez. Multi-archivo → Glob + Read c/u una vez.
- Archivo grande (>1k líneas) → Grep primero, luego Read solo esa sección. Nunca leer archivos enormes completos.
- Respuestas cortas (2-3 líneas), sin resúmenes largos al final.

## 🗺️ Planear antes de actuar
- **Directo** (sin aprobación): cambio en 1 archivo claro, bug fix obvio, ajuste de color/texto/margen.
- **EnterPlanMode primero**: feature que toca 2+ archivos, rediseño, petición vaga, backend+frontend juntos, o **cualquier cambio en server.py / archivos críticos**. El usuario no es programador — ver el plan evita retrabajo.

## Commits automáticos
Al dejar algo funcionando (feature, bug fix verificado, diseño confirmado) → commit inmediato, sin que lo pidan.
Formato: `tipo(alcance): descripción en español` (`feat`/`fix`/`style`/`refactor`/`docs`) + línea `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
NO commitear: cosas rotas/sin verificar, `.env`/API keys, `.bak`/`.log`/temporales.

## Cierre de sesión (al pedir clear o cerrar bloque grande) — OBLIGATORIO
1. Marcar ✅/🔄/⏳ en las tablas de `memory/BACKLOG.md`.
2. **Sobrescribir** `memory/ESTADO.md` con el estado vigente (no acumular narrativa).
3. Mover la narrativa de la sesión a `memory/BACKLOG_ARCHIVE.md` y actualizar `project_propvalu.md` (memoria Claude) si cambió el estado.

## Skills — sugerir el correcto proactivamente (1 línea al final)
El harness ya lista los skills. Sugerir cuando aplique: `/backup` antes de tocar server.py; `/restart-backend` si el backend no responde; `/new-page`/`/new-endpoint` al crear; `/check-errors` si "algo está roto"; `/end-session` al cerrar.

## Frontend / dashboards
Reglas de diseño (campos visibles, grid 4-col, Pydantic, refresh sesión, móvil 360-414px) en **`docs/FRONTEND_RULES.md`** — leer al tocar perfiles/dashboards/forms. Regla clave: campo nuevo en registro → agregarlo al modelo `User` en `backend/models.py` o `extra="ignore"` lo descarta.

## Entorno Windows
- Python: `C:\Users\pedru\AppData\Local\Python\pythoncore-3.14-64\python.exe` (nunca `python` → WindowsApps sin paquetes).
- Backend: antes de probar, matar procesos en :8000 sin tocar otros python (¡enrichers!). Luego:
  `cd backend; <PY> -m uvicorn server:app --reload --port 8000`. Backend local apunta a **staging**.

## Gemini API
1 llamada por vez (2ª consecutiva = 429). Principal `gemini-2.5-flash`; fallback `gemini-2.0-flash`→`-lite`.

## 🚨 Monitoreo de procesos largos — obligatorio
Tras cualquier `Bash run_in_background` (scraper, extractor, build): lanzar `Monitor` `persistent:true` con grep que cubra éxito Y fallas (`ERROR|TIMEOUT|Quota|ENOTFOUND|completado|===`). Si llega error → diagnosticar y actuar sin esperar. Sin output >10 min → matar y relanzar. Nunca dejar un proceso largo sin monitoreo.
