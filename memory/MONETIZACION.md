# PropValu México — Modelo de Negocio y Monetización
> **Última actualización:** 17 Mar 2026
> Consolidación de decisiones tomadas en sesiones de chat. Actualizar aquí cada vez que se cambie algo de precios, roles o estrategia.

---

## Perfiles de Usuario (Roles)

### 1. Público General (`role: 'public'` / sin login)
- Acceso libre, sin registro
- Flujo abierto: ingresa datos → obtiene estimación → descarga PDF
- **Monetización**: pago por reporte (no implementado aún, acceso directo por ahora)
- **Add-on disponible**: Revisión por Valuador Certificado (+$350 MXN)
- **UX importante**: Mostrar advertencia informativa antes del formulario (qué datos necesita, confiabilidad del predial, etc.)

### 2. Valuador Profesional (`role: 'appraiser'`)
- Accede vía Google OAuth desde `/para-valuadores`
- El rol se asigna automáticamente al hacer login desde esa página (via `localStorage.setItem('propvalu_intended_role', 'appraiser')`)
- **Diferenciadores técnicos**:
  - Edición manual de factores de homologación INDAABIN (superficie, antigüedad, calidad, tipo de frente)
  - Selección manual de comparables
  - Reporte con folio oficial (Est-AAMMDD-NN), fecha y firma digital
  - Dashboard con "Panel de Valuador" (badge Crown verde)

### 3. Inmobiliaria (`role: 'realtor'`)
- Accede vía Google OAuth desde `/para-inmobiliarias`
- El rol se asigna automáticamente al hacer login desde esa página (via `localStorage.setItem('propvalu_intended_role', 'realtor')`)
- **Diferenciadores**:
  - Gestión de portafolio de propiedades
  - Acceso multi-usuario (plan empresarial)
  - Dashboard con "Panel de Inmobiliaria" (badge Briefcase azul)
  - **No tiene acceso a edición de factores INDAABIN** (eso es exclusivo del valuador)

---

## Precios y Planes

### Valuador Profesional

| Plan | Precio | Incluye |
|---|---|---|
| Por reporte | $99 MXN | 1 reporte PDF, comparables IA, análisis de mercado |
| Suscripción mensual | $499 MXN/mes | Reportes ilimitados, historial, dashboard, factores INDAABIN, soporte prioritario |

### Inmobiliaria — Paquetes de Créditos (NO es ilimitado, son paquetes)

| Plan | Precio | Reportes | Precio unitario | Vigencia |
|---|---|---|---|---|
| Pack Básico | $599 MXN | 5 reportes | $120/reporte | 3 meses |
| Pack Profesional | $1,999 MXN | 20 reportes | $100/reporte | 6 meses |
| Empresarial | $1,299 MXN/mes | Ilimitados | — | Mensual renovable |

> **Nota clave**: La inmobiliaria NO tiene acceso ilimitado en los planes básico/profesional — compra créditos. Solo el plan Empresarial es ilimitado.

### Add-on Universal (disponible para todos los perfiles)

| Add-on | Precio | Descripción |
|---|---|---|
| Revisión por Valuador Certificado | +$350 MXN | Valuador CNBV/INDAABIN revisa el reporte, valida comparables, ajusta factores y firma. Entrega en menos de 48h. Mayor validez ante instituciones financieras. |

---

## Estrategia de Acceso y Autenticación

- **Público General**: Sin login, acceso directo a `/valuar`
- **Valuador / Inmobiliaria**: Login con Google OAuth via `auth.emergentagent.com`
- **Flujo de rol**:
  1. Usuario llega a `/para-valuadores` o `/para-inmobiliarias`
  2. Hace clic en "Acceder" → se guarda rol en `localStorage` (`propvalu_intended_role`)
  3. OAuth redirect → `AuthCallback.jsx` lee el localStorage y llama `POST /api/auth/set-role`
  4. Usuario llega al dashboard con el rol correcto ya asignado
- **Botón "Acceso Clientes"** en nav de LandingPage: para usuarios recurrentes que ya tienen cuenta y quieren saltar la landing

---

## Rutas de Conversión (Funnels)

```
Landing (/)
  ├── "Valuar Ahora" → /valuar (Público General, sin login)
  ├── "Conocer Beneficios" → /para-valuadores → Login → /dashboard (appraiser)
  └── "Conocer Beneficios" → /para-inmobiliarias → Login → /dashboard (realtor)
```

---

## Estado de Implementación de Pagos

- **Pagos**: NO implementados aún. Acceso directo sin cobro.
- **Pendiente**: Integrar Stripe para cobro por reporte y suscripciones.
- **En PRD backlog (P1)**: `[ ] Stripe para reportes premium`

---

## Decisiones de Diseño de Negocio

1. **Sin "Gratuita"**: Se eliminó la etiqueta "Gratuita" del landing. El servicio tiene valor y se cobra.
2. **Inmobiliaria por paquetes**: No es ilimitada en planes básico/pro — compra créditos. Evita abuso y permite pricing escalonado.
3. **Revisión humana como add-on**: El servicio de revisión por valuador certifica el reporte IA, generando un híbrido IA + experto humano que tiene mayor valor percibido y legal.
4. **Valuador vs Inmobiliaria**: El valuador tiene acceso a herramientas técnicas (INDAABIN, CUS). La inmobiliaria tiene acceso a volumen y portafolio, pero no edita factores técnicos.
5. **Advertencia en formulario público**: Se muestra un banner informativo (dismissable) explicando qué datos se necesitan y la confiabilidad del predial vs escrituras.
