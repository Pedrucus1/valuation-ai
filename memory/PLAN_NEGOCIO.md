# PropValu — Plan de Negocio 2026
## Modelo SaaS Multi-Producto para Inmobiliarias

**Fecha:** 5 de Junio 2026  
**Versión:** 1.0 (Estrategia Revisada)  
**Autor:** Sesión de Estrategia Pedru

---

## EJECUTIVO

PropValu está pivotando de un modelo centrado en **avalúos para público general** (inviable: CAC $300, LTV $2,000 en 3 años, <1% conversión a inmobiliario) hacia un **ecosistema operacional SaaS para inmobiliarias** donde los avalúos IA son una herramienta integrada, no el producto principal.

**Core insight:** El inmobiliario tiene pain real (fragmentación operacional, múltiples herramientas, costo alto en servicios) y capacidad de pago. El público general tiene baja disposición a pagar y no repite.

---

## PARTE 1: ANÁLISIS DEL ESTADO ACTUAL

### Precios Vigentes (PropValu 2026)

#### Público General (One-time, sin cuenta)
| Plan | Avalúos | Precio (sin IVA) |
|------|---------|-----------------|
| Individual | 1 | $280 MXN |
| Bronce | 3 | $815 MXN (-3%) |
| Plata | 5 | $1,317 MXN ⭐ Más popular |
| Oro | 10 | $2,555 MXN |

**Add-ons:** Revisión Certificada (+$350), Verificación in-situ (+$600)

#### Valuadores (Planes Mensuales)
| Plan | Avalúos/mes | Peritos | Data Analysis |
|------|------------|---------|---|
| Independiente | 5 | 1 | ❌ |
| Despacho | 10 | 3 | ❌ |
| **Pro** | 20 | 5 | ✅ |
| **Corporativo** | 40+ | 10 | ✅ |

#### Inmobiliarias (Planes Mensuales)
| Plan | Avalúos/mes | Usuarios | Data Analysis |
|------|------------|---------|---|
| Lite 5 | 5 | 1 | ❌ |
| Lite 10 | 10 | 1 | ❌ |
| Pro 20 | 20 | 5 | ❌ (solo newsletter) |
| **Premier** | 30–50+ | 50 | ✅ |

#### Publicidad (CPM por Impresión)
| Duración | Comparables | Gen. IA | Pre-descarga |
|----------|-----------|--------|---|
| 15 seg | $15 | $10 | $5 |
| 30 seg | $25 | $18 | — |
| 60 seg | $38 | — | — |

---

### Economía Actual: ¿Por qué no funciona el público?

**Caso: Cliente Público Plan Plata ($1,317 MXN)**

```
Ingreso Bruto:                 $1,317 MXN
- IVA (16%, retiene SAT):      -$211 MXN
- Pasarela (Stripe 4%):        -$44 MXN
────────────────────────────
Ingreso Neto a PropValu:       $1,062 MXN

- CAC (Marketing):             -$300 MXN
- Infraestructura (Gemini API, servers): -$75 MXN
- Admin/Overhead (prorrateo):  -$200 MXN
────────────────────────────
**Margen Operativo:             ~$487 MXN (36% margen)**
```

**Pero:** Público repite 1-2 veces en 3 años
- LTV = $1,317 × 1.5 compras = $1,975 MXN en 3 años
- Ratio LTV/CAC = 1,975 / 300 = **6.6x (EN 3 AÑOS)**
- Problema: 3 años para recuperar CAC es insostenible sin capital

**Conclusión:** Público es pérdida inicial; no es un negocio, es un funnel.

---

## PARTE 2: ANÁLISIS DE MERCADO

### 2A. Plataformas de Avalúos Online — Competencia Directa

> Datos verificados Jun 2026

| | **YALS** | **Monopolio** | **Romina** | **AvaClick** |
|---|---|---|---|---|
| **Empresa** | Intelimétrica | DD360 | SOLESTAV (MTY, 25+ años) | AvaClick Digital |
| **Precio entrada** | Gratis (60 créditos + 1 premium) | Gratis | Gratis (1er estimado) | Gratis (1 reporte) |
| **Reporte individual** | $99-$299 MXN | No vende individual | $139 MXN | $199 MXN + IVA |
| **Paquete/créditos** | $499/mes (2 reportes premium) | **$600 MXN = 5 reportes ($120/rep), sin vencimiento** | No publicado | $499/mes (5 rep.) · $799/mes (10 rep.) |
| **Precio por reporte** | $99-$299 | **$120 MXN** | ~$139 MXN | $80-199 MXN |
| **Vencimiento créditos** | Mensual | **Sin fecha límite** | — | No acumulan |
| **Cobertura** | Nacional (15M props) | CDMX / MTY / GDL únicamente | CDMX / MTY / GDL (6,000 colonias) | 400 ciudades, 32 estados |
| **Metodología perito** | ❌ AVM | ❌ AVM | ✅ 95% coincidencia perito | ❌ AVM |
| **Valor de terreno** | ❌ | ❌ | ✅ único en México | ❌ |
| **PDF descargable** | ✅ | ❓ | ✅ | ✅ |
| **Comparables incluidos** | Desde $149 | ✅ gratis | ✅ | ✅ todos los planes |
| **Análisis de mercado** | ✅ agente LUCiA (WhatsApp) | ✅ gratis (cap rate, plusvalía) | Limitado | Plan Pro+ |
| **Para inmobiliarias** | Enterprise (cotizar) | Pre-lanzamiento (ValuAI) | ✅ asesores | ✅ Lite/Pro/Enterprise |
| **API** | ❌ | ❌ | ✅ | ✅ |
| **Suite operacional** | ❌ | ❌ | ❌ | ❌ |
| **Portal de propiedades** | ❌ | ✅ (GDL/MTY/CDMX) | ❌ | ❌ |

**Nota Monopolio:** Es la misma empresa que NOCNOK (CRM con 35,000 agentes). Su portal `inmuebles.nocnok.com` y `monopolio.com.mx` son fuentes potenciales de scraping para comparables de PropValu.

### 2B. CRM y Suites para Inmobiliarias — Competencia Indirecta

| | **NOCNOK** | **Tokko Broker** | **EasyBroker** | **Wasi** |
|---|---|---|---|---|
| **Precio** | ~$1,000/mes | $480-$3,500/mes | $490-$1,490/mes | $600+/mes |
| **Usuarios** | 35,000 agentes | 4,000 inmob. | Alto en MX | 32,000 global |
| **Multi-portal** | ✅ | ✅ (20+ portales) | ✅ | ✅ (28 portales) |
| **Avalúo IA** | ❌ | ❌ | ❌ | ❌ |
| **DocuProp** | ❌ | ❌ | ❌ | ❌ |
| **Pre-calificador hipotecario** | ✅ | ❌ | ❌ | ❌ |

### 2C. Gasto anual de una inmobiliaria típica (10-20 props activas)

```
Inmuebles24:          $2,200-$3,800/mes × 12 = $26,400-$45,600/año
+ Publicidad FB:      $1,000-$5,000/mes × 12 = $12,000-$60,000/año
+ CRM externo (Wasi): $179 USD/mes ≈ $2,148 MXN × 12 = $25,776/año
─────────────────────────────────────────────────────
TOTAL ANUAL ACTUAL: $64,176 - $131,376 MXN (~$3,200-$6,600 USD)
SIN herramientas de avalúo, documentación ni asesoría legal
```

### 2D. Gap Analysis — Oportunidad PropValu

| Necesidad | Quién lo hace hoy | Costo actual | Gap |
|-----------|------------------|-------------|-----|
| **Avalúo IA con metodología perito** | Romina (parcial, 3 metros) | $139+ MXN/rep | ✅ PropValu cubre Jalisco con INDAABIN |
| **Suite operacional completa** | Nadie integrado | Fragmentado $64k-131k/año | ✅ **Ocean Azul** |
| **DocuProp + asesoría legal** | Abogados externos | $2,000-15,000/transacción | ✅ **Ocean Azul** |
| **Datos de mercado locales propios** | Ninguno en Jalisco | N/A | ✅ Scraper 84k props Jalisco |
| **Sincronización multi-portal** | Wasi, Tokko | Dentro de CRM separado | ⚠️ Pendiente implementar |
| **Pre-calificador hipotecario** | NOCNOK | Dentro de su CRM | ⚠️ Largo plazo |

### ¿Cuánto paga una inmobiliaria típica HOY?

Inmobiliaria pequeña-mediana (10-20 propiedades activas):

```
Inmuebles24:          $2,200-$3,800/mes × 12 = $26,400-$45,600/año
+ Publicidad FB:      $1,000-$5,000/mes × 12 = $12,000-$60,000/año
+ CRM externo (Wasi): $179 USD/mes ≈ $2,148 MXN/mes × 12 = $25,776/año
─────────────────────────────────────────────────────
TOTAL ANUAL ACTUAL: $64,176 - $131,376 MXN (~$3,200-$6,600 USD)

SIN HERRAMIENTAS DE DOCUMENTACIÓN O ASESORÍA
```

---

## PARTE 3: NUEVO MODELO DE NEGOCIO — PROPVALU SaaS

### Visión: Ecosistema Operacional Integrado

PropValu es el **software operacional del inmobiliario**: avalúos + documentación + sincronización + análisis.

### A. Estructura de Planes para Inmobiliarias

#### Plan LITE ($100/mes) — Datos Abiertos Incentivado
- 3-10 avalúos/mes
- 1 usuario
- **Condición:** Inmobiliaria comparte BD de propiedades con PropValu (datos abiertos)
- **Beneficio:** Acceso a análisis de mercado (tab Mercado en dashboard)
- **ROI para inmobiliaria:** Pagan menos, reciben insights del mercado
- **ROI para PropValu:** Ganas datos de propiedades (network effect, comps más precisos)

#### Plan PRO ($250/mes) — Datos Cerrados + Herramientas
- 10-20 avalúos/mes
- Hasta 5 usuarios
- DocuProp integrado (checklist documentos + alertas)
- Sincronización a Inmuebles24, Mercado Libre, Facebook (automática)
- Dashboard análisis de comps por zona
- NO incluye portal propio (data analysis basic)

#### Plan PREMIER ($500/mes) — Suite Completa
- 30-50 avalúos/mes
- Hasta 50 usuarios
- DocuProp Premium (asesoría legal + seguimiento)
- Sincronización multi-portal + auto-publicación
- **Portal propio**: publicar propiedades directamente en PropValu (con comisión)
- Dashboard analytics completo (tab Mercado habilitado)
- Lead scoring (IA detecta oportunidades)

---

### B. Monetización del Público General (Funnel hacia Inmobiliaria)

**Mecanismo de descuento en cascada:**

```
1. Público compra avalúo a $300 MXN (precio base)
   ↓
2. Inmobiliaria da voucher 10% descuento al cliente
   Cliente paga $270, inmobiliaria "regala" $30
   ↓
3. Inmobiliaria se ahorra en su plan:
   - Lite: $200/mes (datos cerrados)
   - Lite+: $100/mes (datos abiertos) ← Incentivo a compartir
   ↓
4. Resultado para PropValu:
   - Pierdes $30/descuento
   - Ganas: CAC = $0 (cliente llega referido)
   - Cliente entra en ecosistema → DocuProp, portal, etc.
   ↓
5. Resultado para Inmobiliaria:
   - Regala $30 descuento, recupera $100-200/mes en plan
   - Cliente se siente agradecido → conversión mejor
```

---

### C. DocuProp — Servicio Repetidor (Híbrido IA + Abogado)

**Modelo:** Opcional, cliente elige IA o Abogado

#### DocuProp IA ($150/transacción)
- Checklist automático de documentos (compra-venta, hipoteca, etc.)
- Plantillas rellenables (escritura pública, contrato, etc.)
- Alertas: "faltan 3 documentos para cerrar"
- Generado por Claude/IA, revisable por cliente

#### DocuProp Abogado ($400/transacción)
- Revisión legal completa de documentos
- Asesoría en negociación, plazos, riesgos
- Seguimiento hasta cierre de transacción
- Contacto directo con abogado (asincrónico)

**Mercado:** Cada propiedad se vende 1-2 veces en 5-10 años  
→ Cliente público repite si usa DocuProp (vende, renta, compra de nuevo)

---

### D. Portal de Propiedades (Complemento + Comisión)

**No compite con Inmuebles24 hoy. Es complemento.**

#### Para Inmobiliaria (Plan Premier):
- Publicar propiedades en portal PropValu
- Sincronización automática a Inmuebles24, Mercado Libre, Facebook
- Analytics: vistas, contactos, tiempo en portal

#### Para Público:
- Buscar propiedades en portal PropValu (integrado con búsqueda de avalúos)
- Contactar directo con inmobiliaria

#### Monetización:
- Opción 1: **Comisión por venta** (2-5% del valor)
- Opción 2: **Listing fee** ($50-100/propiedad/mes)
- Opción 3: **Hybrid** (pequeño fee + comisión menor)

---

### E. Publicidad (Mantener + Mejorar)

Sigue igual, pero expandido a:
- Ads en comparables (slot 1)
- Ads en generación IA (slot 2)
- Ads pre-descarga PDF (slot 3)
- **Nuevo:** Ads en portal de propiedades

---

## PARTE 4: PROYECCIÓN DE INGRESOS

### Escenario Base: 100 Inmobiliarias + 10k Público/año

```
INGRESOS MENSUALES:

1. SUSCRIPCIONES INMOBILIARIAS
   - 40 Lite ($100/mes)      = $4,000
   - 40 Pro ($250/mes)       = $10,000
   - 20 Premier ($500/mes)   = $10,000
   ─────────────────────────
   Subtotal:                  $24,000/mes

2. PÚBLICA GENERAL (Avalúos)
   - 2,000 clientes/mes × $280 promedio = $560,000
   - Menos: IVA (16%), pasarela (4%), CAC ($300) = ~$350,000 neto
   ─────────────────────────
   Subtotal (neto):           $350,000/mes

3. DOCUPROP
   - 500 transacciones/mes × $150 (IA) = $75,000
   - 100 transacciones/mes × $400 (Abogado) = $40,000
   ─────────────────────────
   Subtotal:                  $115,000/mes

4. PORTAL DE PROPIEDADES
   - 50 ventas/mes × 3% comisión × $400k promedio = $600,000
   ─────────────────────────
   Subtotal:                  $600,000/mes

5. PUBLICIDAD
   - 100k impresiones/mes × $0.02 CPM promedio = $2,000/mes
   ─────────────────────────
   Subtotal:                  $2,000/mes

━━━━━━━━━━━━━━━━━━━━━━━━━━━
INGRESO TOTAL/MES:           $1,091,000 MXN
INGRESO ANUAL:               $13,092,000 MXN (~$655k USD)
```

**Notas:**
- Escenario conservador (100 inmobiliarias es 0.1% del mercado)
- Público sigue siendo 50% de ingresos (pero CAC = $0, margen positivo)
- DocuProp es repetidor (vuelve cada 2-3 años por transacción)
- Portal comisión es upside (requiere traction)

---

## PARTE 5: ROADMAP DE IMPLEMENTACIÓN

### Q3 2026 (Julio-Septiembre) — MVP Inmobiliaria

- [ ] Ajustar precios de planes Lite, Pro, Premier
- [ ] Implementar descuento cascada para público referido por inmobiliaria
- [ ] Integración básica con Inmuebles24 API (sincronización de propiedades)
- [ ] DocuProp MVP: checklist documentos + plantillas IA (Claude)
- [ ] Dashboard inmobiliaria mejorado (tab Mercado ya existe)

### Q4 2026 (Octubre-Diciembre) — Expansión Contenido

- [ ] DocuProp Abogado: integrar red de abogados
- [ ] Sincronización Mercado Libre + Facebook Marketplace
- [ ] Portal PropValu (MVP): búsqueda de propiedades + contacto
- [ ] Analytics: leads generados, conversiones, comisiones

### Q1 2027 (Enero-Marzo) — Escalabilidad

- [ ] Modelo de comisión por venta (testing con 10 inmobiliarias piloto)
- [ ] API pública: inmobiliarias custom integran en sus sitios
- [ ] Machine learning: predicción de precio + oportunidades
- [ ] Publicidad mejorada: targeting by property type/zone

---

## PARTE 6: COMPETITIVIDAD vs MERCADO

| Aspecto | Inmuebles24 | Wasi (CRM) | Properati | **PropValu** |
|--------|-----------|-----------|-----------|---|
| **Valuación IA** | Feature menor | ❌ | ❌ | ✅ **Diferenciador** |
| **CRM** | Básico (Panoramix) | ✅ Premium | ❌ | ✅ **Integrado** |
| **Documentación legal** | ❌ | ❌ | ❌ | ✅ **Ocean Azul** |
| **Sincro multi-portal** | ❌ | ✅ Parcial | ❌ | ✅ **Automático** |
| **Leads pagados** | ✅ SmartLead | ❌ | ✅ Core | ⚠️ **No aún** |
| **Precio (SaaS)** | $2,200-$3,800/mes | $179 USD/mes | Variable | $100-500/mes |

**Ventaja PropValu:** Bundle de operacionalidad completa a precio bajo + avalúos IA.

---

## PARTE 7: RIESGOS Y MITIGACIÓN

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-----------|--------|-----------|
| Competencia baja precios (Inmuebles24) | Alta | Alto | Diferencial en DocuProp + datos abiertos |
| Abogados no escalan (DocuProp Abogado) | Media | Medio | Modelo híbrido IA + abogado asincrónico |
| Portal no genera comisiones (no traction) | Media | Bajo | Mantener como complemento, no core |
| CAC público sigue siendo alto | Baja | Bajo | Modelo cascada reduce CAC a $0 |
| Inmobiliarias reacias a abrir datos | Media | Medio | Incentivo: descuento 50% en Lite+ |

---

## CONCLUSIÓN

PropValu pivota de "avalúos IA para público" a "ecosistema operacional SaaS para inmobiliarias". Los avalúos siguen siendo un diferenciador, pero no el producto principal.

**Core viability:**
- Inmobiliaria paga $100-500/mes (recurrente, margen alto)
- Público genera ingresos secundarios (DocuProp, portal, ads)
- CAC baja a $0 (referido por inmobiliaria)

**Timeline:** 6 meses MVP, 12 meses para escala con 500+ inmobiliarias.

---

**Próximos pasos:**
1. Validar con 5-10 inmobiliarias piloto
2. Ajustar pricing según feedback
3. Desarrollar integración Inmuebles24
4. Lanzar DocuProp MVP (IA)

---

## NOTAS DE EDICIÓN FUTURA

> Actualizar aquí cada sesión con nuevas ideas, análisis o cambios de estrategia.

**Decisiones pendientes:**
- [ ] Confirmar precio de DocuProp (¿$150 o flexible?)
- [ ] Modelo de comisión portal (% vs fee fijo)
- [ ] Abogados: ¿red tercerizada o empleados?
- [ ] Timing: ¿MVP en Q3 o Q4?
