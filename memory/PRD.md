# PropValu Mexico - Product Requirements Document

## Original Problem Statement
Plataforma web de estimación de valor inmobiliario para México con metodología bancaria (CNBV/SHF/INDAABIN). Incluye modo público y privado (valuadores), generación de reportes HTML/PDF con IA, búsqueda de comparables con IA (OpenAI + Gemini), historial en base de datos, gráficas de análisis y consejos de venta.

## Architecture
- **Frontend**: React 19 + TailwindCSS + Shadcn UI + Recharts
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB
- **AI Integration**: 
  - OpenAI GPT-4o via Emergent Integrations (comparables + reports)
  - Gemini 2.5 Flash via Emergent Integrations (comparables)
- **Auth**: Emergent Google OAuth
- **Maps**: OpenStreetMap (Nominatim + embed iframe + draggable pin)

## User Personas
1. **Público General**: Estima valor de su propiedad sin registro
2. **Valuador Profesional**: Selecciona comparables, ajusta negociación, reportes detallados
3. **Inmobiliarias**: Uso frecuente, análisis de portafolio

## Core Features Implemented

### v1.0 - Base (Initial)
- ✅ Landing page con colores verdes institucionales
- ✅ Formulario stepper de 3 pasos
- ✅ API CRUD de valuaciones
- ✅ Generación de comparables simulados
- ✅ Cálculo de valor con metodología CNBV
- ✅ Reportes HTML con IA
- ✅ Dashboard con historial
- ✅ Google Auth

### v2.0 - Web Scraping & Features
- ✅ Web scraping real (inmuebles24, lamudi, propiedades.com) - ahora fallback
- ✅ 7 tipos de propiedad (Casa, Depto, Terreno, Local, Oficina, Bodega, Nave)
- ✅ Mapa OpenStreetMap con búsqueda
- ✅ Subida de hasta 16 fotos
- ✅ Cálculo de renta con factor dinámico
- ✅ Cap Rate y plusvalía anual estimada
- ✅ Dashboard con gráficas (Recharts)

### v2.6 - AI-Powered Comparable Search (Feb 19, 2026)
- ✅ **Búsqueda de comparables con IA**: OpenAI GPT-4o + Gemini 2.5 Flash
- ✅ **Búsqueda en paralelo**: Ambos proveedores se consultan simultáneamente
- ✅ **URLs reales**: La IA devuelve enlaces a propiedades en inmuebles24, lamudi, etc.
- ✅ **Fallback chain**: AI → Web Scraping → Datos simulados
- ✅ **Opción de keys propias**: Permite configurar OPENAI_API_KEY para producción
- ✅ **LocationMap mejorado**: Pin arrastrable con click-to-move
- ✅ **Mapa con zoom correcto**: Coordenadas del inmueble con ~500m de radio visible
- ✅ **Termómetro con valores de rango**: Rojo=valor mínimo, Verde=valor máximo, Marcador=valor estimado
- ✅ **PDF sin espacios en blanco**: Contenido fluye sin page-breaks innecesarios
- ✅ **Checkbox para análisis IA**: Opción para incluir/excluir sección de análisis en PDF
- ✅ **Prompt mejorado para ChatGPT**: Instrucciones más específicas para comparables útiles

## API Endpoints

### Valuaciones
- `POST /api/valuations` - Crear valuación
- `GET /api/valuations` - Historial usuario
- `GET /api/valuations/{id}` - Detalle
- `POST /api/valuations/{id}/generate-comparables` - **AI Search (OpenAI + Gemini)**
  - Response incluye: `search_method: "ai"`, `ai_providers_used: ["openai", "gemini"]`
- `POST /api/valuations/{id}/select-comparables` - Selección + custom_negotiation
- `POST /api/valuations/{id}/calculate` - Metodología mejorada
- `POST /api/valuations/{id}/generate-report` - Con IA

### Autenticación
- `POST /api/auth/session` - Google OAuth callback
- `GET /api/auth/me` - Usuario actual
- `POST /api/auth/logout` - Cerrar sesión

## Data Models

### PropertyInput
```json
{
  "state": "Jalisco",
  "municipality": "Guadalajara",
  "neighborhood": "Providencia",
  "land_area": 200,
  "construction_area": 180,
  "land_regime": "URBANO",
  "property_type": "Casa",
  "latitude": 20.6736,
  "longitude": -103.3687
}
```

### AI Comparable Search Response
```json
{
  "comparables": [...],
  "count": 14,
  "search_method": "ai",
  "ai_providers_used": ["openai", "gemini"]
}
```

## AI Search Implementation

### Providers
1. **OpenAI GPT-4o**: Busca ~8 comparables en portales mexicanos
2. **Gemini 2.5 Flash**: Busca ~8 comparables adicionales

### Prompt Strategy
La IA recibe:
- Ubicación (colonia, municipio, estado)
- Tipo de propiedad
- Superficie de terreno y construcción
- Instrucciones para devolver JSON con URLs de portales reales

### Fallback Chain
1. **AI Search** (primario) - ~15-30 segundos
2. **Web Scraping** (si AI falla) - inmuebles24, lamudi, propiedades.com
3. **Simulated Data** (último recurso) - basado en precios promedio por estado

## P0 Issues (Completed)
- ✅ Búsqueda de comparables con IA implementada y funcionando

## P1 Features (Backlog)
- [ ] Corregir layout del PDF (3 páginas forzadas)
- [ ] Búsqueda automática en mapa al completar dirección
- [ ] Descarga PDF real (WeasyPrint/jsPDF)
- [ ] Página separada para fotos en el PDF
- [ ] Stripe para reportes premium

## P2 Features (Future)
- [ ] Export a Excel
- [ ] Panel admin para valores paramétricos
- [ ] App móvil

## Known Limitations
- **AI Search**: Depende de la disponibilidad de OpenAI y Gemini. Puede tomar 15-30 segundos.
- **Sin avalúo oficial**: Estimación orientativa, no válida legalmente
- **Mapa PDF**: Iframe puede no renderizar en algunos viewers

## Test Coverage
- Backend: 100% (11/11 pytest tests)
- Frontend: 100% (Playwright)
- Last test: /app/test_reports/iteration_8.json

## Tech Stack
- FastAPI 0.109.0
- React 19.0.0
- MongoDB Motor
- OpenAI GPT-4o (via emergentintegrations)
- Gemini 2.5 Flash (via emergentintegrations)
- TailwindCSS 3.4
- Shadcn/UI
- Recharts
