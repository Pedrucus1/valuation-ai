# PropValu — Lineamientos de Marca

> Documento de referencia para el uso correcto del logotipo, tipografía, colores e identidad visual en la plataforma web, reportes PDF y materiales de comunicación.

---

## 1. Logotipo

### Versiones del logotipo

| Versión | Uso | Fondo recomendado |
|---|---|---|
| Principal (horizontal) | Navbar, reportes, PDF, documentos | Blanco o claro |
| Negativa (blanco) | Header oscuro, paneles admin, fondos verdes | Oscuro / verde |
| Ícono / Isotipo | Favicon, app móvil, espacio reducido | Cualquiera |

### Zona de protección
El logotipo debe tener un espacio libre mínimo equivalente a la altura de la "P" de PropValu en todos sus lados.

### Tamaño mínimo
- Impreso: 25 mm de ancho
- Digital: 80 px de ancho

### Usos prohibidos
- No estirar ni deformar el logotipo
- No cambiar los colores del logotipo
- No aplicar sombras, degradados ni efectos sobre el logotipo
- No colocar el logotipo sobre fondos que reduzcan su legibilidad
- No recrear el logotipo con otra tipografía

### Archivos del logotipo
- `frontend/src/assets/logo-propvalu.svg` — versión SVG principal _(pendiente de agregar)_
- `frontend/src/assets/logo-propvalu-white.svg` — versión negativa _(pendiente)_
- `frontend/public/favicon.ico` — favicon _(pendiente)_

---

## 2. Tipografía de la marca

### Logotipo
El nombre **PropValu** usa **Outfit ExtraBold (800)** con las siguientes particularidades:
- **"Prop"** — color oscuro (`#1B4231` verde 900)
- **"Valu"** — color verde acento (`#51B687` verde 500)
- Las dos palabras se escriben sin espacio y sin guión

### Tipografías del sistema

| Rol | Familia | Peso | Uso |
|---|---|---|---|
| Títulos / Headings | **Outfit** | 700–800 | Secciones, banners, valores numéricos grandes |
| Cuerpo / UI | **Inter** | 400–600 | Párrafos, etiquetas, tablas, inputs |
| Fallback | -apple-system, BlinkMacSystemFont, sans-serif | — | Cuando no carga Google Fonts |

**Fuente Google Fonts:**
```html
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## 3. Paleta de colores

### Colores primarios

| Variable | Hex | Uso |
|---|---|---|
| `--green-900` | `#1B4231` | Verde oscuro principal — headers, texto de énfasis, gradientes |
| `--green-700` | `#2D6A4F` | Verde medio — bordes activos, scores, badges |
| `--green-500` | `#51B687` | Verde acento — highlights, barras, íconos activos |
| `--green-100` | `#f0faf4` | Verde muy claro — fondos de cards, secciones de ventajas |
| `--lime`      | `#D9ED91` | Lima — valores máximos, contrastes sobre fondo oscuro |

### Colores secundarios

| Variable | Hex | Uso |
|---|---|---|
| `--text-main` | `#0F162A` | Texto principal |
| `--text-sec`  | `#63738A` | Texto secundario, etiquetas |
| `--text-comp` | `#1A2E22` | Texto en comparables |
| `--text-blue` | `#0183C7` | Fuentes/links externos |
| `--text-mkt`  | `#1E3A89` | Azul estrategia/marketing |
| `--text-disc` | `#913F0D` | Ámbar aviso legal, disclamers |
| `--red`       | `#DC2525` | Errores, valores negativos |

### Neutros

| Variable | Hex | Uso |
|---|---|---|
| `--gray-50`  | `#f8fafc` | Fondos de tabla, metodología |
| `--gray-100` | `#f1f5f9` | Separadores suaves |
| `--gray-200` | `#e2e8f0` | Bordes de cards |
| `--gray-400` | `#94a3b8` | Texto deshabilitado, placeholders |
| `--gray-500` | `#64748b` | Etiquetas de indicadores |

---

## 4. Uso en reportes y PDF

### Header del reporte (todas las páginas)
- Logotipo: versión principal, alineado a la izquierda
- Alto del header: ~44px, separado del contenido por línea `2px solid #1B4231`
- A la derecha: Folio + Fecha en `Inter 10px`, color `--text-sec`

### Colores en PDF
El reporte usa la directiva CSS:
```css
-webkit-print-color-adjust: exact;
print-color-adjust: exact;
```
Esto garantiza que los fondos de color y gradientes se reproduzcan en la impresión.

### Banner de sección principal
```css
background: #1B4231;
color: white;
font-family: 'Outfit', sans-serif;
font-weight: 700;
letter-spacing: 2px;
text-transform: uppercase;
```

### Valor hero (página 2)
Gradiente: `linear-gradient(150deg, #162f24 0%, #1B4231 40%, #2D6A4F 100%)`

---

## 5. Uso en la plataforma web (frontend)

### Navbar / Topbar
- Logotipo: versión horizontal principal, 32–40px de alto
- Fondo: blanco con sombra suave `shadow-sm`

### Panel Admin (sidebar)
- Logotipo: versión negativa (blanco) sobre fondo `#1B4231`
- Tamaño: ~24px de alto

### Favicon
- Isotipo / ícono de la marca
- Formato: `.ico` 32×32 + `.png` 180×180 (Apple Touch Icon)

### Botones primarios
```css
background: #1B4231;   /* o #2D6A4F hover */
color: white;
border-radius: 8–12px;
font-family: 'Outfit';
font-weight: 600;
```

---

## 6. Voz de la marca

- **Tono:** profesional, confiable, accesible — sin tecnicismos innecesarios
- **Nombre de la marca:** siempre **PropValu** (sin espacio, sin guión, "V" mayúscula)
- **Dominio:** propvalu.mx
- **Tagline sugerido:** _"El valor real de tu propiedad, con inteligencia."_

---

## 7. Pendientes

- [ ] Agregar archivo SVG del logotipo a `frontend/src/assets/`
- [ ] Actualizar logo en `report_generator.py` — reemplazar emoji `🏘` por imagen real
- [ ] Agregar logo en AdminLayout sidebar
- [ ] Crear favicon `.ico` oficial
- [ ] Crear versión negativa (blanco) del logo para fondos oscuros
