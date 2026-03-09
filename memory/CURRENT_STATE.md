# CURRENT STATE — PropValu México
> **Última actualización:** 04 Mar 2026  
> **Instrucción para nuevo chat:** Lee este archivo y di dónde nos quedamos.

---

## 📍 Rutas del Proyecto

| Elemento | Ruta |
|---|---|
| Raíz del proyecto | `c:\Users\pedru\valuation-ai\Pagina-Valuacion-con-Ai--main\` |
| Backend (Node/Express) | `server.js` (raíz, ~1100 líneas) |
| Servicios AI | `services/aiSearch.js` |
| Frontend (React) | `frontend/` |
| Variables de entorno | `.env` (raíz) y `frontend/.env` |
| Documentación | `memory/CURRENT_STATE.md` (este archivo) y `memory/PRD.md` |

---

## 🏗️ Arquitectura Actual (Node.js — versión en uso)

```
[React Frontend :3001]  →  proxy  →  [Express Backend :3000]
                                              ↓
                                    Google Maps API (geocoding + mapa)
                                    Gemini API     (comparables IA)
                                    OpenAI API     (comparables IA)
```

> **NOTA IMPORTANTE:** Existe también un `backend/` con código Python/FastAPI + MongoDB que fue la arquitectura original. **NO está en uso actualmente.** El backend activo es `server.js` (Node/Express con almacenamiento en memoria).

---

## 🌐 Despliegue en Producción

| Elemento | Valor |
|---|---|
| Plataforma | Render.com |
| URL de producción | https://valuation-ai-1.onrender.com |
| Repositorio GitHub | https://github.com/Pedrucus1/valuation-ai |
| Rama principal | `master` |
| Deploy automático | Sí — cada `git push` a `master` dispara redespliegue |

### 🚨 REGLA ABSOLUTA — GITHUB NO SE TOCA
> **El agente NUNCA debe ejecutar `git push`, `git push --force`, ni ningún comando que modifique el repositorio remoto.**
> 
> - El usuario debe pedirlo **explícitamente** en ese momento
> - Solo proceder si el usuario escribe **"AUTORIZADO"** de forma clara
> - Render despliega automáticamente con cada push → un push erróneo rompe producción inmediatamente
> - Todo el trabajo de desarrollo se hace **solo en la PC local**
> - Los commits locales (`git add`, `git commit`) están permitidos, pero **NUNCA el push**

---

## 🔑 Variables de Entorno

### Backend (`.env` en raíz — NUNCA subir a GitHub)
```env
GOOGLE_MAPS_API_KEY=AIzaSyAMScvl0Wi9dUsjvp5K5-6ofJOx9LkNLUc
GEMINI_API_KEY=          ← necesaria para búsqueda IA con Gemini
OPENAI_API_KEY=          ← necesaria para búsqueda IA con OpenAI
```

### Frontend (`frontend/.env` — NUNCA subir a GitHub)
```env
REACT_APP_BACKEND_URL=http://localhost:3000
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyDI4ylOZOmQku-P1PUArf4PD-rn8uuw6OA
```

### En Render (variables de entorno del servidor de producción)
Configurar en: Dashboard → tu servicio → Environment
- `GOOGLE_MAPS_API_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`

> ⚠️ La key de Google Maps en el frontend (REACT_APP_*) queda visible en el navegador.
> Restringirla por dominio en Google Cloud Console para evitar uso no autorizado.

---

## 🚀 Cómo correr el proyecto localmente

### Terminal 1 — Backend
```bash
cd c:\Users\pedru\valuation-ai\Pagina-Valuacion-con-Ai--main
npm start
# Servidor en http://localhost:3000
```

### Terminal 2 — Frontend
```bash
cd c:\Users\pedru\valuation-ai\Pagina-Valuacion-con-Ai--main\frontend
npm start
# React en http://localhost:3001 (si 3000 ocupado, elige Y para otro puerto)
```

---

## 📦 Stack Técnico

| Capa | Tecnología |
|---|---|
| Backend | Node.js v24 + Express.js |
| Frontend | React 19 + CRA (via CRACO) + TailwindCSS + Shadcn/UI |
| UI Components | Radix UI + Lucide React |
| Build tool | CRACO (Create React App Config Override) |
| Despliegue | Render.com (Docker o Node directo) |
| Mapas | Google Maps API (geocoding + Static Maps en reporte) |
| IA comparables | Gemini 1.5 Flash + OpenAI GPT-4o |

---

## 🗂️ Historial de Versiones (Git)

| Commit | Fecha | Descripción |
|---|---|---|
| `073d1e6` | 24 Feb 2026 | ⭐ Versión base estable — "Primer respaldo: Sistema de Valuación con IA" |
| `740ae504` | 26 Feb 2026 | ❌ Commit no autorizado — agregó Panel INDAABIN, Dockerfile, cambió proxy a :3002 → rompió producción |

**Estado actual en GitHub:** `073d1e6` (revertido el 4 Mar 2026 con `git push --force`)

---

## ✅ Correcciones Aplicadas (04 Mar 2026)

### 1. Proxy del frontend corregido
- **Problema:** `frontend/package.json` tenía `"proxy": "http://localhost:3002"` → frontend no podía comunicarse con backend en `:3000`
- **Solución:** Corregido a `"proxy": "http://localhost:3000"`
- **Archivo:** `frontend/package.json` línea 5

### 2. Dependencia `core-js-pure` añadida
- **Problema:** `@pmmmwh/react-refresh-webpack-plugin` requería `core-js-pure/features/global-this` que no existía → `Failed to compile`
- **Solución:** Instalado `core-js-pure@3.26.1` (versión específica que incluye la ruta `/features/`)
- **Comando aplicado:** `npm install core-js-pure@3.26.1 --legacy-peer-deps`
- **Nota:** La versión `0.5.10` de `@pmmmwh/react-refresh-webpack-plugin` es la correcta para React Scripts 5.0.1 (CRA/CRACO). No requiere downgrade adicional.

### 3. Archivos `.env.example` creados
- `/.env.example` — plantilla para el backend
- `/frontend/.env.example` — plantilla para el frontend
- Sirven como documentación de qué variables se necesitan

### 4. Seguridad verificada
- Los archivos `.env` NUNCA fueron subidos a GitHub (confirmado con `git ls-files`)
- El `.gitignore` raíz incluye `*.env` y `*.env.*`
- El `frontend/.gitignore` cubre `.env.local` y variantes, pero NO `.env` directamente → puede ser riesgo futuro

---

## 🧩 Arquitectura del Reporte PDF

| Página | Contenido |
|---|---|
| 1 | Header + Datos del Inmueble + Mapa Google Static + Badges de características |
| 2 | Valor Estimado (caja verde oscuro) + Rango min/max + Plusvalía 5 años |
| 3 | Tabla de comparables seleccionados + Homologación |
| 4 | Análisis estratégico (IA o template) + Amenities cercanos |
| 5 | Consejos de venta + Aviso legal + Footer |

---

## 🔄 Metodología de Cálculo del Avalúo

```
80% Método Comparativo de Mercado (Homologación)
   + Factores INDAABIN: Negociación, Conservación, Edad (Ross-Heidecke)
   + Mediana ponderada con promedio (60/40)

20% Método Físico / Costo
   + Terreno: precio/m² × área × ratio por estado
   + Construcción: costo/m² × área × (1 - depreciación)
   + Depreciación: Edad/Vida útil + factor conservación

Ajustes finales:
   × Factor Manzana (INDAABIN)
   × Factor Vialidad (INDAABIN)
   × (1 - Descuento Régimen de Tierra: EJIDAL/COMUNAL/RUSTICO)
```

---

## 📋 Pendientes / Próximo Trabajo

- [ ] Agregar Gemini y OpenAI API keys en Render para habilitar IA en producción
- [ ] Verificar que el PDF funcione correctamente en producción (post-revert)
- [ ] Decidir si recuperar el Panel de Factores INDAABIN del commit `740ae504` (era funcional aunque llegó sin autorización)
- [ ] Restricción de Google Maps key por dominio en Google Cloud Console
- [ ] Agregar `.env` explícitamente al `frontend/.gitignore` como medida de seguridad adicional
- [ ] Evaluar migrar a Vite en lugar de CRA/CRACO (CRA está deprecated desde 2023)
