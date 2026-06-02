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

### ✅ Resuelto 02-Jun (commit 21bca3e) — endurecimiento auth
| # | Tema | Fix verificado |
|---|---|---|
| S1 | Admin sin hash autenticaba por `ADMIN_SECRET` compartido para siempre. | Superadmin sembrado se guarda con bcrypt; admin legacy migra perezosamente (1 vez con ADMIN_SECRET) y queda hasheado. Fin del secreto compartido permanente. |
| S2 | `ADMIN_SECRET` comparado con `==`. | `hmac.compare_digest` (`_matches_admin_secret`). |
| S3 | Tokens admin/anunciante no expiraban. | `token_expires_at` (admin, TTL 7d) + `session_expires_at` (anunciante, TTL 30d). `require_admin`/`require_advertiser` rechazan vencidos/sin-expiry con 401. **Probado:** token expirado→401, restaurado→200. |

> Nota de despliegue: al subir esto, las sesiones admin/anunciante activas pedirán re-login una vez (tokens viejos sin expiry se tratan como vencidos). Esperado.

### ⏳ Pendiente de revisar/arreglar
| # | Tema | Riesgo | Nota |
|---|---|---|---|
| S4 | Rate limiting ausente en login / endpoints públicos (fuerza bruta admin/login, abuso de avalúo público). | Medio | slowapi o límite por IP. |
| S5 | Validación de inputs: revisar endpoints que hacen `request.json()` directo sin modelo Pydantic. | Bajo-Medio | Inventariar. |
| S6 | IDOR en otros recursos por ID | ✅ Bajo | **Barrido hecho 02-Jun:** encargos (admin→require_admin, `/mis-encargos` filtra user_id), inmobiliaria/equipo (auth+role realtor+filtra empresa propia), ads (anunciante scopa TODO por `advertiser_id`; admin→require_admin), kyc (ownership por doc_id+user_id). **Sin IDOR.** El único era valuations (cerrado). |

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
  (IDOR avalúos + escalada upgrade-role, commit 4e15e10). Catalogados S1–S6.
- **02-Jun-2026 (cont.)** — Barrido IDOR S6 completo (sin más casos). Endurecida auth admin/anunciante
  S1+S2+S3 (commit 21bca3e): hash bcrypt obligatorio + migración perezosa, timing-safe, expiry de
  tokens. Probado end-to-end contra backend local (6/6 casos). **Quedan S4 (rate limiting) y S5
  (validación de inputs).**
