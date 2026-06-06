# PropValu — Análisis de Negocio Completo
**Fecha:** 5 de Junio 2026 | **Versión:** 1.0 | **Geografía inicial:** Jalisco

---

## 1. RESUMEN EJECUTIVO

PropValu es un SaaS inmobiliario que integra avalúos IA, gestión documental, análisis de mercado y herramientas operacionales para inmobiliarias en México. Arranca en Jalisco como mercado piloto con modelo de suscripción mensual ($2,000/mes por empresa) + add-ons.

**Tesis central:** Las inmobiliarias gastan $60,000-130,000 MXN/año en herramientas dispersas (portales, CRM, abogados, marketing). PropValu consolida todo en una suite integrada a $24,000/año con IA como diferenciador.

---

## 2. MERCADO — JALISCO

### Tamaño de mercado

| Segmento | Estimado Jalisco | Fuente |
|---------|-----------------|--------|
| Agencias inmobiliarias registradas | ~2,500 | AMPI + estimación |
| Brokers independientes (sin agencia) | ~5,000-8,000 | Estimación mercado |
| Asesores/agentes bajo agencia | ~15,000-25,000 | AMPI regional |
| Transacciones anuales (compra-venta) | ~50,000-80,000 | INEGI + Notarías |
| Valor promedio propiedad GDL Metro | $3.5M-5M MXN | Scraper PropValu |

### TAM / SAM / SOM

```
TAM (Total): Todas las inmobiliarias Jalisco × $2,000/mes
  2,500 × $2,000 = $5,000,000 MXN/mes = $60M/año

SAM (Serviceable): Las que pagarían por software (30%)
  750 × $2,000 = $1,500,000 MXN/mes = $18M/año

SOM (Realista Año 1): 2% de adopción = 15 clientes
  15 × $2,000 = $30,000 MXN/mes

SOM (Año 2): 5% = 40 clientes
  40 × $2,000 = $80,000 MXN/mes

SOM (Año 3): 10% = 75 clientes
  75 × $2,000 = $150,000 MXN/mes
```

**Upside adicional:** DocuProp Abogado, ads, público general, valuadores — suman 30-40% sobre la suscripción base.

---

## 3. MODELO DE NEGOCIO

### 3.1 Flujos de Ingreso

#### A. Suscripción Inmobiliaria (Core) — $2,000/mes por empresa

**Qué incluye el plan base:**
- Avalúos IA (10-20/mes según tier)
- MercadoTab — análisis de mercado por zona
- Fichas comerciales / plantillas autollenadas
- DocuProp IA básico (checklist + plantillas)
- Dashboard de equipo (asesores)
- Reseñas de clientes
- Publicidad obligatoria en avalúos (con ads = ingreso adicional)

**Tiers propuestos (revisados):**

| Tier | Avalúos/mes | Usuarios | Precio | Para quién |
|------|------------|---------|--------|-----------|
| **Starter** | 5 | 1 titular | $1,500 | Broker independiente |
| **Pro** | 15 | hasta 5 | $2,500 | Agencia pequeña |
| **Business** | 30 | hasta 15 | $4,500 | Agencia mediana |
| **Premier** | 60+ | ilimitado | $8,000 | Agencia grande / franquicia |

> Nota: $2,000 es el precio de referencia base. Tiers ajustan por volumen y asesores.

#### B. Add-ons (cobrables aparte)

| Add-on | Precio | Modelo |
|--------|--------|--------|
| **DocuProp Abogado — Revisión** | $3,500 MXN | Por transacción (abogado revisa docs en 48h) |
| **DocuProp Abogado — Acompañamiento** | $9,000-12,000 MXN | Por transacción completa hasta cierre |
| **Avalúos adicionales mid-ciclo** | $271 c/u | Por consumo extra |
| **Sincronización multi-portal** | $300/mes | Automático a I24, ML, Facebook |
| **Data Analysis Premium** | $380/mes | Reportes mercado zona + tendencias |
| **Portal PropValu (listing)** | $50-100/prop/mes | Publicar en portal propio |

#### C. Público General (B2C) — Funnel secundario

| Plan | Avalúos | Precio |
|------|---------|--------|
| Individual | 1 | $280 MXN |
| Bronce | 3 | $815 MXN |
| Plata | 5 | $1,317 MXN |
| Oro | 10 | $2,555 MXN |

**Estrategia cascada:** Inmobiliaria entrega voucher 10% descuento → CAC = $0 para ese cliente.

#### D. Motor Publicitario (Ad-Engine)

| Slot | Duración | Precio/impresión |
|------|----------|-----------------|
| Comparables | 15-60 seg | $5-$38 MXN |
| Generación IA | 15-30 seg | $10-$18 MXN |
| Pre-descarga PDF | 15 seg | $5 MXN |

#### E. DocuProp — Modelo completo

**IA (automatizado):**
- Checklist personalizado por tipo de transacción (compra, renta, hipoteca)
- Plantillas rellenables (contrato, promesa, carta oferta)
- Alertas: "Faltan 3 documentos para avanzar"
- Recordatorios automáticos al cliente
- Precio: incluido en plan base (IA básico) | $500 MXN add-on (IA premium)

**Abogado (red de socios):**
- PropValu actúa como marketplace de servicios legales
- Abogado recibe 75-80%, PropValu retiene 20-25%
- Liability legal es del abogado, no de PropValu
- Requiere contrato de afiliación con cada abogado
- Precios finales al cliente: $3,500 (revisión) / $9,000-12,000 (acompañamiento)

---

## 4. ESTRUCTURA LEGAL Y FISCAL

### 4.1 Constitución recomendada

**Opción A: SA de CV (recomendada para iniciar)**
- Costo: $8,000-15,000 MXN (notario + gastos)
- Tiempo: 4-6 semanas
- Ventaja: Simple, bien conocida, suficiente para operar
- Desventaja: Rígida para atraer inversión futura

**Opción B: SAPI de CV (si planeas inversión en 12-18 meses)**
- Costo: $15,000-25,000 MXN
- Tiempo: 6-8 semanas
- Ventaja: Permite diferentes clases de acciones, mejor para inversores
- Desventaja: Más compleja administrativamente

**Recomendación:** SA de CV ahora + convertir a SAPI si hay ronda de inversión. No constituir SAPI prematuramente si no hay inversor concreto.

### 4.2 Obligaciones fiscales mensuales

| Obligación | Frecuencia | Costo estimado |
|-----------|-----------|---------------|
| IVA (cobrar 16%, enterar diferencia) | Mensual | $0 (pass-through) |
| ISR retención empleados | Mensual | Incluido en nómina |
| ISR empresarial (30% utilidad) | Anual / Pagos provisionales mensuales | ~$3,000-5,000/mes |
| IMSS (si hay empleados) | Mensual | ~$2,000-4,000/empleado |
| Declaraciones informativas | Anual | Contador |
| CFDI timbrado por factura | Por transacción | $1.50 MXN c/u (Facturama) |

**Contador externo:** $4,000-6,000 MXN/mes para startup con 10-50 transacciones.

### 4.3 Obligaciones legales operacionales

| Área | Qué necesitas | Prioridad |
|------|--------------|----------|
| **Privacidad (LFPDPPP)** | Aviso de privacidad + políticas | P0 antes de lanzar |
| **T&C del servicio** | Términos claros de limitación de responsabilidad | P0 |
| **DocuProp contratos** | Acuerdos con abogados socios (liability, splits, NDA) | P1 |
| **Propiedad intelectual** | Registro de marca PropValu en IMPI | P1 ($3,000-5,000 MXN) |
| **Contrato SaaS clientes** | Acuerdo de servicio con inmobiliarias | P1 |
| **Política reembolsos** | Clara y visible (ya definida: no devoluciones) | P0 |

---

## 5. ESTRUCTURA DE COSTOS — P&L REAL

### 5.1 Fases de operación

#### FASE 0: Validación (Meses 1-3) — Pre-revenue

**Objetivo:** 10 inmobiliarias usando el producto (piloto gratuito o precio simbólico).

```
COSTOS MENSUALES FASE 0:
- Fundador (tú, sin sueldo o $15,000):     $15,000
- Infraestructura (Railway+Atlas+APIs):      $2,500
- Legal (constitución amortizada):           $3,000
- Marketing (networking, eventos AMPI):      $5,000
- Registro marca IMPI (amortizado):          $500
- Contador:                                  $4,000
─────────────────────────────────────────
BURN RATE FASE 0:                           $30,000/mes
RUNWAY REQUERIDO (3 meses):                 $90,000 MXN
```

#### FASE 1: Lanzamiento (Meses 4-9) — Early revenue

**Objetivo:** 15-30 clientes pagando, llegar a break-even.

```
COSTOS MENSUALES (mes 6, ~20 clientes):
- Fundador:                                 $20,000
- Desarrollador (medio tiempo):             $12,000
- Soporte/Onboarding (1 persona):           $10,000
- Marketing digital (ads + contenido):      $12,000
- Eventos/AMPI/networking:                   $5,000
- Infraestructura:                           $3,500
- Contador + SAT:                            $5,000
- IMSS (3 empleados aprox.):                 $8,000
- Misc (herramientas, legales menores):      $3,000
─────────────────────────────────────────
TOTAL COSTOS:                               $78,500/mes

INGRESOS (20 clientes × $2,000):           $40,000
NETO IVA (÷1.16):                          $34,482
─────────────────────────────────────────
DÉFICIT MES 6:                             -$44,018/mes
```

#### FASE 2: Crecimiento (Meses 10-18) — Profitable

**Objetivo:** 60-100 clientes, margen positivo sostenible.

```
COSTOS MENSUALES (mes 12, ~50 clientes):
- Fundador:                                 $25,000
- Desarrollador FT:                         $20,000
- Soporte (1 FT):                           $10,000
- Marketing (1 medio tiempo):               $10,000
- Marketing digital:                        $15,000
- Infraestructura escalada:                  $5,000
- Contador + SAT + IMSS:                    $12,000
- Misc:                                      $5,000
─────────────────────────────────────────
TOTAL COSTOS:                              $102,000/mes

INGRESOS (50 clientes × $2,000):          $100,000
+ Add-ons (~15% sobre suscripción):         $15,000
+ B2C avalúos (estimado):                  $20,000
NETO IVA TOTAL:                           $116,379
─────────────────────────────────────────
UTILIDAD ANTES ISR:                        $14,379
BREAK-EVEN REAL: ~55 clientes suscripción
```

---

## 6. PROYECCIÓN FINANCIERA 3 AÑOS

### Supuestos
- Crecimiento: 5 clientes/mes (Fase 1) → 8/mes (Fase 2) → 10/mes (Fase 3)
- Churn: 5%/mes (Año 1) → 3% (Año 2) → 2% (Año 3)
- ARPU base: $2,000/mes suscripción + 20% add-ons = $2,400 efectivo
- CAC blended: $2,000 MXN (directo/AMPI) → $1,500 (Año 2, referidos)

### P&L Anual

| Concepto | Año 1 | Año 2 | Año 3 |
|---------|-------|-------|-------|
| **Clientes (fin de año)** | 30 | 80 | 150 |
| **Ingreso suscripciones** | $432,000 | $1,440,000 | $3,240,000 |
| **Ingreso add-ons (20%)** | $86,400 | $288,000 | $648,000 |
| **Ingreso B2C + Ads** | $120,000 | $300,000 | $600,000 |
| **INGRESO BRUTO** | $638,400 | $2,028,000 | $4,488,000 |
| **IVA transferido SAT** | -$88,055 | -$279,724 | -$619,448 |
| **INGRESO NETO** | $550,345 | $1,748,276 | $3,868,552 |
| **Personal** | -$720,000 | -$1,080,000 | -$1,680,000 |
| **Marketing** | -$204,000 | -$288,000 | -$360,000 |
| **Infraestructura** | -$42,000 | -$72,000 | -$120,000 |
| **Legal + Fiscal + Misc** | -$96,000 | -$120,000 | -$144,000 |
| **UTILIDAD ANTES ISR** | **-$511,655** | **$188,276** | **$1,564,552** |
| **ISR (30%)** | $0 | -$56,483 | -$469,366 |
| **UTILIDAD NETA** | **-$511,655** | **$131,793** | **$1,095,186** |

**Inversión requerida total Año 1:** ~$600,000 MXN ($30,000 USD)
**Rentable en:** Mes 18-20 aproximadamente
**ROI Año 3:** ~183% sobre inversión inicial

---

## 7. UNIT ECONOMICS

```
CAC (Costo de Adquisición):
  - Venta directa (networking/AMPI):  $1,500 MXN
  - Digital (ads):                    $2,500 MXN
  - Referido por cliente:             $500 MXN
  - Blended estimado:                 $1,800 MXN

LTV (Lifetime Value):
  - ARPU mensual: $2,400 MXN (suscripción + add-ons)
  - Retención promedio: 22 meses (benchmark SaaS B2B similar)
  - LTV = $2,400 × 22 = $52,800 MXN

LTV/CAC = $52,800 / $1,800 = 29x ← EXCELENTE (benchmark sano >3x)

Payback period = $1,800 / $2,400 = 0.75 meses ← recuperas CAC en 23 días

Churn mensual objetivo: <3% (benchmark SaaS B2B México)
MRR break-even: ~$110,000 MXN (55 clientes)
```

---

## 8. GO-TO-MARKET — JALISCO

### 8.1 Canales por fase

#### Fase 0 (Meses 1-3): Red Personal
- **Objetivo:** 10 pilotos gratuitos o $500/mes simbólico
- **Táctica:** Contacto directo con inmobiliarias conocidas o referidas
- **Mensaje:** "Quiero que pruebes PropValu y me des feedback, sin costo"
- **Meta:** Conseguir 3 casos de éxito documentados con antes/después
- **Costo:** $0 (solo tiempo)

#### Fase 1 (Meses 4-9): Asociaciones + Digital básico
- **AMPI Guadalajara** (~1,200 miembros):
  - Solicitar presentación en asamblea mensual: $0-$5,000 MXN
  - Patrocinar evento trimestral: $8,000-$15,000 MXN
  - Ofrecer descuento exclusivo socios AMPI: $1,500/mes (primer mes gratis)
  - ROI: Acceso directo a 1,200 prospectos calificados
- **CIPS Jalisco:** Misma estrategia
- **LinkedIn + Instagram:** Contenido educativo inmobiliario (gratis)
  - Posts: "Cómo valuar una propiedad en GDL", "Errores documentación", etc.
  - Presupuesto ads: $5,000 MXN/mes
- **Google Ads:** Keywords "avalúo Guadalajara", "software inmobiliario Jalisco"
  - Presupuesto: $5,000 MXN/mes
  - CPC estimado: $15-25 MXN → ~300 clicks → conversión 2% = 6 leads

#### Fase 2 (Meses 10-18): Referidos + Inbound
- **Programa de referidos:** Inmobiliaria refiere → 1 mes gratis para ambos
- **Casos de éxito en video:** 3-5 testimonios reales → material de ventas
- **SEO:** Blog inmobiliario en PropValu → tráfico orgánico a 6-12 meses
- **Webinars mensuales:** "Mercado inmobiliario GDL" — captación de leads

### 8.2 Proceso de ventas

```
1. LEAD entra (ads, AMPI, referido, inbound)
   ↓
2. DEMO en video (20 min) → mostrar avalúo real + MercadoTab + ficha
   ↓
3. PILOTO 14 días gratis (sin tarjeta) → onboarding guiado
   ↓
4. CONVERSIÓN: al día 10 enviar resumen de valor generado
   ("Generaste 3 avalúos, ahorraste $840 vs cotizar afuera")
   ↓
5. COBRO: Stripe activo, plan seleccionado
   ↓
6. ÉXITO: Check-in mensual → prevenir churn → buscar upsell
```

### 8.3 Estrategia vs competencia en Jalisco

| Competidor | Su ventaja | Cómo gana PropValu |
|-----------|-----------|-------------------|
| **NOCNOK/Monopolio** | Red 35k agentes, nacional | Local focus + avalúo IA + DocuProp (ellos no tienen) |
| **Tokko Broker** | CRM maduro, integraciones | Avalúo IA integrado + precio menor + DocuProp |
| **YALS** | Avalúos baratos ($99-299) | Suite completa vs feature aislada |
| **Abogados independientes** | Relación personal | Precio 40% menor + integrado al proceso |
| **Inmuebles24** | Tráfico enorme | No son SaaS operacional, solo portal |

**Ventaja competitiva sostenible:** Datos propietarios (scraper 84k propiedades Jalisco) + motor IA calibrado localmente. Nadie tiene eso en Jalisco.

---

## 9. PRODUCTO — ROADMAP PRIORIZADO

### Qué está listo HOY (no construir, solo activar)
- ✅ Avalúos IA con motor calibrado
- ✅ MercadoTab (análisis de mercado)
- ✅ Fichas comerciales (4 estilos)
- ✅ Dashboard inmobiliaria completo
- ✅ Sistema de roles y autenticación
- ✅ Panel admin completo
- ✅ Ad-Engine (slots publicitarios)

### Qué falta construir (ordenado por impacto)

| Prioridad | Feature | Esfuerzo | Impacto en revenue |
|----------|---------|---------|------------------|
| **P0** | Stripe integrado (cobro real) | 2 semanas | CRÍTICO — sin esto no hay negocio |
| **P0** | Onboarding guiado (wizard 5 pasos) | 1 semana | Reduce churn Mes 1 |
| **P1** | DocuProp IA (checklist + plantillas) | 3 semanas | Add-on $500/mes |
| **P1** | Email recordatorios automáticos | 1 semana | Retención + engagement |
| **P2** | Sincronización Inmuebles24 | 4-6 semanas | Diferenciador fuerte |
| **P2** | DocuProp Abogado (marketplace) | 4 semanas | Add-on $3,500-12,000/transacción |
| **P3** | Portal PropValu (listings) | 8-12 semanas | Largo plazo |
| **P3** | Pre-calificador hipotecario | 6-8 semanas | Diferenciador vs NOCNOK |

---

## 10. EQUIPO REQUERIDO

### Fase 0-1 (Meses 1-9): Lean

| Rol | Perfil | Costo/mes | Prioridad |
|-----|--------|-----------|----------|
| **Founder/CEO** (tú) | Visión + ventas + producto | $20,000 | Ya existe |
| **Dev Full-stack** | Python + React, ya conoce el proyecto | $15,000-20,000 | P0 |
| **Soporte/CS** | Onboarding inmobiliarias, soporte básico | $9,000-12,000 | Mes 4 |

### Fase 2 (Meses 10-18): Crecimiento

| Rol | Perfil | Costo/mes |
|-----|--------|-----------|
| **Marketing Digital** | Ads, contenido, SEO | $10,000-14,000 |
| **Sales (1/2 tiempo)** | Cierre de cuentas, demos | $8,000 + comisión |
| **Dev adicional o freelance** | Nuevas features | $12,000-15,000 |

### Advisors recomendados (equity o fees mínimos)
- **Abogado inmobiliario Jalisco** — para DocuProp + legal
- **Exdirectivo AMPI** — para credibilidad y apertura de puertas
- **Contador especialista SaaS** — para modelo fiscal correcto desde el inicio

---

## 11. RIESGOS Y MITIGACIÓN

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-----------|---------|-----------|
| **Inmobiliarias no pagan $2,000** | Media | Alto | Pilotos gratuitos → validar willingness to pay antes de escalar |
| **NOCNOK entra agresivo a Jalisco** | Media | Alto | Datos propietarios locales + DocuProp (ellos no tienen) |
| **Churn alto (>8%/mes)** | Media | Alto | Onboarding guiado + check-ins mensuales + Net Promoter Score mensual |
| **Stripe no aprobado (México)** | Baja | Alto | Alternativa: Conekta o Clip (aprobación más rápida en MX) |
| **Abogados no escalan DocuProp** | Media | Medio | Red de 5-10 abogados desde el inicio, no solo 1 |
| **Motor IA impreciso → pérdida de confianza** | Baja | Alto | Disclaimer claro + mejora continua con datos reales |
| **Costo Gemini sube** | Baja | Medio | Diversificar a Claude/OpenAI, negociar plan enterprise |
| **SAT auditoría** | Baja | Alto | Contador desde día 1, CFDI correcto siempre |
| **Fundador quema** | Media | Crítico | Contratar soporte antes de saturarse |

---

## 12. MÉTRICAS CLAVE A MONITOREAR

### North Star Metric
**MRR (Monthly Recurring Revenue)** — el indicador principal de salud del negocio.

### Métricas operacionales

| Métrica | Objetivo Mes 6 | Objetivo Mes 12 | Frecuencia |
|---------|---------------|----------------|-----------|
| MRR | $30,000 | $100,000 | Semanal |
| Clientes activos | 15 | 50 | Semanal |
| Churn mensual | <6% | <4% | Mensual |
| CAC blended | <$2,500 | <$1,800 | Mensual |
| LTV estimado | >$40,000 | >$48,000 | Trimestral |
| Avalúos generados/mes | 150 | 750 | Diario |
| NPS (inmobiliarias) | >30 | >50 | Mensual |
| Tiempo onboarding (días) | <7 | <5 | Mensual |
| Add-on attach rate | 10% | 25% | Mensual |

---

## 13. PLAN DE ACCIÓN — PRIMEROS 90 DÍAS

### Mes 1: Fundamentos
- [ ] Constituir SA de CV + abrir cuenta bancaria empresarial
- [ ] Registrar marca PropValu en IMPI
- [ ] Contratar contador desde el inicio
- [ ] Integrar Stripe o Conekta (cobro real)
- [ ] Redactar T&C + Aviso de Privacidad + Contrato SaaS
- [ ] Firmar acuerdos con 3-5 abogados socios (DocuProp)
- [ ] Contactar 20 inmobiliarias para piloto gratuito

### Mes 2: Validación
- [ ] 10 inmobiliarias en piloto activo
- [ ] Onboarding guiado implementado
- [ ] Primeras 3 inmobiliarias pagando ($1,500-2,000/mes)
- [ ] Solicitar presentación en AMPI Guadalajara
- [ ] Documentar 1 caso de éxito real (antes/después)
- [ ] DocuProp IA MVP lanzado

### Mes 3: Iteración
- [ ] Entrevistas con los 10 pilotos (¿qué valoran más? ¿qué falta?)
- [ ] Ajustar precios según feedback real
- [ ] 10 clientes pagando
- [ ] Patrocinar primer evento AMPI
- [ ] Contratar soporte/onboarding (si hay flujo)
- [ ] Plan de marketing digital activo (ads + contenido)

---

## 14. PREGUNTAS ABIERTAS (DECIDIR ANTES DE LANZAR)

1. **¿SA de CV o SAPI?** — Si hay inversión en <12 meses: SAPI. Si es bootstrap puro: SA de CV.
2. **¿Precio Starter $1,500 o $2,000?** — Validar en pilotos cuál convierte mejor.
3. **¿DocuProp Abogado desde el día 1 o en Fase 2?** — Recomendación: Fase 2 (primero valida el core).
4. **¿Stripe o Conekta?** — Stripe es mejor UX pero requiere más documentación. Conekta es más rápido en MX.
5. **¿Cuánto sueldo toma el fundador en Fase 0?** — Afecta el runway disponible.
6. **¿AMPI como canal pagado (sponsorship) o gratis (presentación)?** — Ambos, en ese orden.

---

## CONCLUSIÓN

PropValu tiene product-market fit potencial real en Jalisco:
- El dolor existe (inmobiliarias gastan $60k-130k/año en herramientas dispersas)
- La solución está construida (avalúos IA + suite operacional)
- El precio ($2,000/mes) es competitivo vs el gasto actual
- La ventaja competitiva es defendible (datos locales propietarios)

**El riesgo principal no es el producto, es la ejecución comercial.** Específicamente:
1. ¿Puedes vender? (demos, cierre, onboarding)
2. ¿Puedes retener? (soporte, valor continuo)
3. ¿Tienes capital para aguantar 18 meses hasta rentabilidad?

Con $600,000 MXN de runway, equipo lean (tú + dev + soporte) y foco en Jalisco, PropValu puede ser rentable en 18 meses con 55+ clientes.

**Siguiente paso inmediato:** Conseguir 10 pilotos gratuitos y validar que usan el producto activamente antes de gastar un peso en marketing.
