# CURRENT STATE — PropValu México
> **Última actualización:** 10 Mar 2026  
> **Instrucción para nuevo chat:** Lee este archivo exhaustivamente. Contiene el estado más reciente del aplicativo. Vamos a comenzar a trabajar en integrar SerpAPI.

---

## 📍 Estado Actual y Últimos Avances (10 Mar 2026)

Hemos logrado estabilizar y mejorar considerablemente tanto el **Reporte PDF** como el **Dashboard Web**. Los últimos features implementados exitosamente son:

### 1. Sistema de Edición Manual de Factores INDAABIN (Exclusivo Valuadores)
- **Frontend (`ComparablesPage.jsx`)**: Se introdujo el estado `isEditable` y `customFactors`. Si el usuario tiene rol `appraiser`, aparece un botón que convierte las celdas de factores de homologación de la tabla en *inputs* numéricos en vivo.
- **Backend (`server.js`)**: El endpoint `/api/valuations/:id/select-comparables` ahora recibe y procesa el objeto `custom_factors`, sobreescribiendo permanentemente los valores estadísticos generados inicialmente por la IA (Superficie, Antigüedad, Calidad, etc.).

### 2. Mejoras Estéticas e Informativas en Plantilla PDF y UI
- **Desglose de Amenidades (Recámaras/Baños/Auto)**: `aiSearch.js` ahora extrae estos atributos. Se muestran debajo de la colonia usando emojis dedicados (🛏️ 🚿 🚗) a tamaño aumentado (`text-base`).
- **Diseño de 3 Columnas de Inmueble**: El cuadro azul superior del PDF renderiza la ubicación ocupando todo el ancho superior y debajo 3 columnas simétricas con variables físicas para ahorrar espacio.
- **Advertencias Técnicas (Predial y Supuestos de Mercado)**: 
  - La advertencia topográfica del "Predial" es central, visible solo cuando aplica.
  - La leyenda "supuestos basados en apreciación histórica..." creció 2 puntos de legibilidad.
- **Claridad de Mercado**: El cuadro "Oferta Similar" del termómetro comercial ya no engaña mostrando 6 propiedades evaluadas; ahora muestra fielmente la densidad estadística del ecosistema (ej. `121+ Propiedades`).
- **Control de Paginación**: La caja de texto de "Análisis de Mercado AI" tiene un clamp estricto de máximo 5 líneas (vía CSS grid truncamiento multilínea avanzado).

### 3. Filtros Estrictos en Extracción Web (`aiSearch.js`)
- Mayor firmeza en el prompt de Gemini: *"VIGENCIA EXTREMA: NO INVENTES PROPIEDADES. Obligatorio enlaces vivos y no 404"*. 
- **Problema Detectado**: Vertex Grounding tiende a jalar páginas de búsqueda ("search") o links muertos porque no raspa activamente; es un generador de lenguaje.
- **Próximo Paso (Pendiente)**: Migrar el recolector de comparables a una API de búsqueda real estructural (SerpAPI / Google Custom Search) para inyectarle links exactos vivos 100% de antemano a Gemini.

---

## 🏗️ Arquitectura Actual (Node.js)

```
[React Frontend :3001]  →  proxy  →  [Express Backend :3000]
                                              ↓
                                    Google Maps API
                                    Gemini API
                                    {Próximamente: SerpAPI}
```

## 📋 Próxima Sesión y Tareas de Trabajo

1. Implementar la conexión de extracción limpia usando SerpAPI o Google Custom Search JSON API dentro de `aiSearch.js`.
2. Mantener la lógica donde Gemini extrae e infiere metros/años, pero forzando a que las URL provengan estricta y únicamente de Google Search.
3. Continuar probando estéticas del PDF PDF `puppeteer`/html en `server.js`.
