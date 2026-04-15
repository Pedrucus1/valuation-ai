# Reglas para Claude Code — PropValu

## 🚀 Al iniciar sesión (AUTOMÁTICO — sin que el usuario lo pida)

Al recibir el **primer mensaje** de una sesión nueva, leer inmediatamente:
1. `memory/BACKLOG.md` — qué está pendiente
2. `C:\Users\pedru\.claude\projects\C--Users-pedru\memory\project_propvalu.md` — estado del proyecto

Luego responder al usuario con contexto ya cargado. No esperar a que pida `/ctx`.

---

## 🗺️ Planear antes de actuar

**Actuar directo** (sin pedir aprobación):
- Cambio en 1 archivo, petición explícita y clara
- Bug fix obvio, ajuste de color/texto/margen
- El usuario describió exactamente qué cambiar

**EnterPlanMode primero** (mostrar plan, esperar aprobación):
- Feature nueva que toca 2+ archivos
- Rediseño de sección completa
- Petición vaga ("mejora X", "arregla Y")
- Cambio backend + frontend juntos
- Cualquier cambio en server.py o archivos críticos

**Por qué:** El usuario no es programador — ver el plan evita sorpresas y trabajo rehecho.

---

## ⚡ Token Efficiency (CRÍTICO)

**Ver:** `~/.claude/EFFICIENCY.md` — guía universal para optimizar tokens en CUALQUIER edición.

**TL;DR:**
- Single-file edit → Read UNA VEZ → Edit UNA VEZ → Done
- Multi-file → Glob + Read each once + Edit each once
- Archivo > 50k líneas → Grep primero, luego Read esa sección
- Código crítico (auth, payments) → Siempre verificar/testear
- Respuesta: máximo 2-3 líneas, nunca explicaciones largas

**Ahorro esperado:** 50% menos tokens por edición.

---

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
| Al crear una página nueva o modificar layout de una existente | `/new-page` + revisar responsividad móvil (ver regla abajo) |
| Al crear un endpoint nuevo | `/new-endpoint` |
| El usuario dice "prueba el endpoint" / "prueba la API" | `/test-api` |
| El usuario dice "hay errores" / "algo está roto" | `/check-errors` |
| Al terminar sesión / el usuario dice "ya terminamos" / "clear" | `/end-session` |
| La memoria parece desactualizada respecto al código | `/sync-memory` |
| El usuario no recuerda qué skills hay | `/ayuda` |

**Formato de sugerencia:** Una línea al final de la respuesta, ej: `→ ¿Corremos /ctx primero?`

## 📱 Responsividad móvil — regla obligatoria

**Siempre que se cree una página nueva o se modifique el layout de una existente**, revisar mentalmente que funcione en móvil (360–414px de ancho):

- Grids: `grid-cols-4` o más → deben colapsar con `grid-cols-2` o `grid-cols-1` en móvil
- Tablas anchas → usar scroll horizontal (`overflow-x-auto`) o diseño apilado en móvil
- Sidebars y menús → verificar que el overlay móvil funcione
- Botones de acción → deben ser accesibles con el pulgar (min 44px de alto)
- Texto truncado → verificar que `truncate` o `min-w-0` estén donde corresponde
- Inputs y selects → ancho completo en móvil (`w-full`)

Si algo claramente no va a funcionar en móvil, mencionarlo al usuario antes de dar la tarea por terminada.

---

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

## Diseño de perfiles / dashboards — reglas aprendidas

### Campos siempre visibles
Nunca ocultar campos con `{session.campo && <Componente>}`. Si el campo está vacío, mostrar
chip ámbar **"✏️ Pendiente"** clickeable que abra el form de edición. El usuario llena datos en
el registro y espera verlos en el perfil — si no aparecen, piensa que se perdieron.

```jsx
// MALO
{session.phone && <DataRow label="Teléfono" value={session.phone} />}

// BUENO
<DataRow label="Teléfono" value={session.phone} />
// DataRow internamente muestra chip Pendiente si value es falsy
```

### Layout — horizontal sobre vertical
Preferir `grid grid-cols-4` para perfiles con muchos campos. Menos scroll = mejor UX.
- Campos cortos (nombre, tel, años): 1 columna
- Campos medios (email, dirección): `col-span-2`
- Chips/tags (operaciones, cobertura, redes): `col-span-4` en fila fluida
- Separadores de sección: línea fina + título inline con ícono, NO sección con padding enorme

### Jerarquía visual de textos
| Elemento | Clase |
|---|---|
| Título de sección | `text-xs font-bold text-[#1B4332] uppercase tracking-wide` |
| Label de campo | `text-[10px] font-bold text-slate-400 uppercase tracking-wide` |
| Valor del campo | `text-sm text-slate-800 font-medium` |
| Chip pendiente | `text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full` |

### Modelo Pydantic — incluir TODOS los campos de registro
Cuando se agrega un campo al formulario de registro, agregarlo TAMBIÉN al modelo `User` en
`server.py`. Si no está en el modelo, `extra="ignore"` lo descarta en `/auth/me` y el usuario
no lo ve en el perfil. Verificar con:
```
grep "campo_nuevo" backend/server.py | grep "class User"
```

### Refresh de sesión al montar dashboards
Los dashboards leen de `localStorage` que puede estar desactualizado. Siempre hacer fetch
silencioso a `/auth/me` al montar y mergear con lo que hay:
```js
fetch(`${API}/auth/me`, { credentials: "include" })
  .then(r => r.ok ? r.json() : null)
  .then(fresh => { if (fresh?.email) { const merged = { ...stored, ...fresh }; setSession(merged); localStorage.setItem("...", JSON.stringify(merged)); }});
```

### Tabs filtrados por rol
Mostrar tabs según `inmobiliaria_tipo` o `role`. Ejemplo: "Equipo" solo para titulares.
```js
...(esTitular ? [{ id: "equipo", label: "👥 Equipo" }] : [])
```

### Estados vacíos con preview
Cuando una tabla/lista no tiene datos reales, mostrar datos mock con `opacity-50` + banner
explicativo. NO mostrar pantalla vacía. El usuario necesita ver cómo va a quedar.

### Acceso directo desde estados vacíos
Si falta una imagen (logo, foto), el placeholder debe ser un botón que navegue directamente
a donde se sube. No dejar estados vacíos sin acción.

## Gemini API

- Rate limit: solo UNA llamada por vez. Segunda llamada consecutiva = 429
- Modelo principal: `gemini-2.5-flash`
- Fallback: `gemini-2.0-flash` → `gemini-2.0-flash-lite`
