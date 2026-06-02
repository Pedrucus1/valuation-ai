# Seguridad y Arquitectura — Antecedentes (PropValu)

> **Fuente de verdad** para la auditoría de seguridad (#64) y la migración del monolito (#66).
> Actualizar EN TIEMPO REAL conforme se verifica/arregla algo. La compactación de contexto
> descarta análisis no escritos — todo hallazgo va aquí al momento.
>
> Última actualización: **02 Jun 2026** — verificación inicial tras corte de sesión.

---

## 0. Estado del repo (al 02-Jun-2026)

- Repo git: `C:\Users\pedru\valuation-ai\Pagina-Valuacion-con-Ai--main`
- Branch de trabajo: **`feature/search-api`** (todo desde Mar 2026 vive aquí; falta merge → main, BACKLOG #63)
- Backend: `backend/` (FastAPI + Motor/MongoDB Atlas). `server.py` = **1786 líneas** (era 4482, −60%).
- Python correcto: `C:\Users\pedru\AppData\Local\Python\pythoncore-3.14-64\python.exe`

---

## 1. Migración del monolito (#66.1) — casi terminada

**Fundación creada** (`backend/core/`):
- `db.py` — cliente Motor único + `load_dotenv`, lee `MONGO_URL` / `DB_NAME`, TLS con certifi.
- `auth.py` — `pwd_context` (bcrypt), `get_current_user`, `require_auth`, `require_admin`.
- `config.py` — rutas `UPLOADS_DIR/KYC_DIR/ADS_DIR`, `SCRAPER_DIR`.
- `accesos.py`, `pricing.py` (PRECIOS_DEFAULT), `cache.py` (caché de mercado).

**Routers extraídos (18)** en `backend/routers/`: access, admin_config, admin_inmobiliarias,
admin_misc, admin_reportes, admin_scraper, admin_usuarios, ads, auth, cms, directorio,
encargos, feedback, inmobiliaria, kyc, mercado, mercado_accesos, newsletter.
Patrón: `APIRouter(prefix="/api")` + `app.include_router(...)`.

**Pendiente de extraer:** solo `valuations` (~1230 líneas) — **diferido a propósito** mientras se
prueban avalúos. Más el glue de app/scheduler (mercado-admin snapshot/sync entrelazado con jobs;
puede quedarse en server.py).

---

## 2. Auditoría de seguridad — hallazgos y estado

### ✅ Ya resuelto (verificado en código)
| Tema | Detalle | Dónde |
|---|---|---|
| CORS abierto | Antes regex aceptaba CUALQUIER `*.vercel.app` con credenciales. Ahora regex restringido a localhost + `frontend-rosy-six-74.vercel.app` + `*-pedrucus-projects.vercel.app` + `*.propvalu.mx`. | server.py:1779 |
| Auth admin fragmentada (#66.2) | Unificado en `require_admin` (valida token contra colección `admins`, `activo:true`). Commit **c9bdaf4**. No quedan comparaciones `token==ADMIN_SECRET` sueltas fuera del login. | core/auth.py:59 |
| Higiene repo (#66.6) | `server.py.bak` (2935 líneas) y `uvicorn.log` eliminados del repo. `.gitignore` cubre `*.env`, `*.bak`, `*.log`, `memory/`. `git check-ignore` confirma `.env` y `.bak` ignorados. Commit **c9bdaf4**. | .gitignore |
| Secrets en repo | `backend/.env` NO está rastreado por git (verificado con `git ls-files`). | — |
| Cookies de sesión | `httponly=True, secure=True, samesite="none"` (correcto para front cross-origin en Vercel). Sesiones de usuario expiran (`expires_at` validado en get_current_user). | routers/auth.py:74 |
| Upload KYC | Allowlist MIME (pdf/jpg/png/webp), límite 5 MB, filename uuid, carpeta por usuario, lectura valida ownership (`doc_id + user_id`). | routers/kyc.py:89 |
| Sentry (#66.5 parcial) | `SENTRY_DSN` cableado en server.py:55 (errores). Faltan métricas. | server.py:55 |
| Índices Mongo (#65.1) | `_ensure_indexes()` en startup: users, user_sessions, valuations, authorized_access, admins. | server.py |

### 🔄 En progreso — RECUPERADO del corte de sesión (sin commitear al 02-Jun)
| # | Hallazgo | Fix |
|---|---|---|
| IDOR avalúos | `GET /valuations/{id}` y `POST /valuations/{id}/upload-photos` devolvían/modificaban CUALQUIER avalúo por ID sin checar dueño. | `_puede_acceder_valuacion()` (dueño / misma inmobiliaria / admin). Avalúos anónimos sin `user_id` siguen accesibles por link (el ID es la llave). server.py:186 |
| Escalada de privilegios | `/auth/upgrade-role` dejaba a CUALQUIER usuario volverse `appraiser`. | Solo `public→appraiser`; appraiser=no-op; realtor/super_admin=403. Resetea `kyc_status:pending` → ser appraiser no da privilegios hasta que admin ratifique KYC. auth.py:124 |

→ **Ambos compilan (py_compile OK). Pendiente: smoke test + commit.**

### ⏳ Pendiente de revisar/arreglar
| # | Tema | Riesgo | Nota |
|---|---|---|---|
| S1 | Admin sin `hashed_password` cae a comparar contra `ADMIN_SECRET` compartido (server.py:1462). El superadmin sembrado nunca recibe hash → autentica por ADMIN_SECRET para siempre. | Medio | Migrar admins a hash bcrypt obligatorio; quitar fallback. |
| S2 | `ADMIN_SECRET` se compara con `==` (no `hmac.compare_digest`). | Bajo | Timing attack teórico. |
| S3 | Tokens de admin NO expiran (`require_admin` solo checa `activo`). Rotan en cada login pero un token robado vive indefinido. | Medio | Agregar `expires_at` a admins como en user_sessions. |
| S4 | Rate limiting ausente en login / endpoints públicos (fuerza bruta admin/login, abuso de avalúo público). | Medio | slowapi o límite por IP. |
| S5 | Validación de inputs: revisar endpoints que hacen `request.json()` directo sin modelo Pydantic. | Bajo-Medio | Inventariar. |
| S6 | IDOR en OTROS recursos por ID (encargos, ads, kyc docs admin, inmobiliaria/equipo) — confirmar que todos validan ownership/rol. | Medio | Barrido pendiente. |

### #66.x infra pendiente
- **66.3** Separar jobs pesados del proceso web (APScheduler dentro del backend lanza subprocesos de scraper; carpeta inexistente en Railway → falla). Mover a worker/cron externo.
- **66.4** Entorno de staging (local y prod comparten la misma Atlas → pruebas tocan datos reales).
- **66.5** Observabilidad: Sentry ya está; faltan métricas básicas.

---

## 3. Comandos útiles

```powershell
$py="C:\Users\pedru\AppData\Local\Python\pythoncore-3.14-64\python.exe"
$b="C:\Users\pedru\valuation-ai\Pagina-Valuacion-con-Ai--main\backend"
# Verificar sintaxis
& $py -m py_compile "$b\server.py" "$b\routers\auth.py"
# Levantar backend (matar python antes)
Get-Process python* -ErrorAction SilentlyContinue | ForEach-Object { taskkill /F /PID $_.Id /T }
& $py -m uvicorn server:app --reload --port 8000   # desde $b
```

---

## 4. Bitácora

- **02-Jun-2026** — Creado este doc. Verificado estado real vs BACKLOG (que estaba desactualizado:
  #66.2 y #66.6 ya hechos en commit c9bdaf4). Recuperadas 2 correcciones de seguridad sin commitear
  (IDOR avalúos + escalada upgrade-role). Catalogados S1–S6 pendientes.
