"""Tabla de precios por defecto (público, valuadores, inmobiliarias, publicidad).
Compartida entre el router de config admin y los cálculos de ads/analytics."""

PRECIOS_DEFAULT = {
    # ── Público ─────────────────────────────────────────────────────
    "publico_individual":       {"precio": 241.38,  "precio_con_iva": 280,   "iva": True,  "moneda": "MXN", "grupo": "Público",       "label": "Individual (1 reporte)"},
    "publico_bronce":           {"precio": 702.59,  "precio_con_iva": 815,   "iva": True,  "moneda": "MXN", "grupo": "Público",       "label": "Bronce (3 reportes)"},
    "publico_plata":            {"precio": 1135.34, "precio_con_iva": 1317,  "iva": True,  "moneda": "MXN", "grupo": "Público",       "label": "Plata (5 reportes)"},
    "publico_oro":              {"precio": 2202.59, "precio_con_iva": 2555,  "iva": True,  "moneda": "MXN", "grupo": "Público",       "label": "Oro (10 reportes)"},
    "addon_valuador":           {"precio": 301.72,  "precio_con_iva": 350,   "iva": True,  "moneda": "MXN", "grupo": "Público",       "label": "Add-on: Revisión Valuador Certificado"},
    "addon_visita":             {"precio": 517.24,  "precio_con_iva": 600,   "iva": True,  "moneda": "MXN", "grupo": "Público",       "label": "Add-on: Verificación m² en sitio"},
    # ── Valuadores ──────────────────────────────────────────────────
    "valuador_independiente":   {"precio": 724.14,  "precio_con_iva": 840,   "iva": True,  "moneda": "MXN", "grupo": "Valuadores",    "label": "Plan Independiente — Valuador (5 avalúos/mes)"},
    "valuador_despacho":        {"precio": 1379.31, "precio_con_iva": 1600,  "iva": True,  "moneda": "MXN", "grupo": "Valuadores",    "label": "Plan Despacho — Valuador (10 avalúos/mes, hasta 3 peritos)"},
    "valuador_pro":             {"precio": 2672.41, "precio_con_iva": 3100,  "iva": True,  "moneda": "MXN", "grupo": "Valuadores",    "label": "Plan Pro — Valuador (20 avalúos/mes, hasta 5 peritos)"},
    "valuador_corporativo":     {"precio": 3879.31, "precio_con_iva": 4500,  "iva": True,  "moneda": "MXN", "grupo": "Valuadores",    "label": "Plan Corporativo — Valuador (40+ avalúos/mes, hasta 10 peritos)"},
    # ── Inmobiliarias ───────────────────────────────────────────────
    "inmobiliaria_lite5":       {"precio": 1206.90, "precio_con_iva": 1400,  "iva": True,  "moneda": "MXN", "grupo": "Inmobiliarias", "label": "Plan Lite 5 — Inmobiliaria (5 avalúos/mes)"},
    "inmobiliaria_lite10":      {"precio": 2327.59, "precio_con_iva": 2700,  "iva": True,  "moneda": "MXN", "grupo": "Inmobiliarias", "label": "Plan Lite 10 — Inmobiliaria (10 avalúos/mes)"},
    "inmobiliaria_pro20":       {"precio": 4482.76, "precio_con_iva": 5200,  "iva": True,  "moneda": "MXN", "grupo": "Inmobiliarias", "label": "Plan Pro 20 — Inmobiliaria (20 avalúos/mes, hasta 5 usuarios)"},
    "inmobiliaria_premier":     {"precio": 6465.52, "precio_con_iva": 7500,  "iva": True,  "moneda": "MXN", "grupo": "Inmobiliarias", "label": "Plan Premier — Inmobiliaria (30–50+ avalúos/mes, hasta 50 usuarios)"},
    # ── Publicidad — precio por impresión (sin IVA) ─────────────────
    "ad_slot1_15s":             {"precio": 15, "precio_con_iva": 15, "iva": False, "moneda": "MXN", "grupo": "Publicidad", "label": "Slot 1 · 15 seg/impresión (Comparables)"},
    "ad_slot1_30s":             {"precio": 25, "precio_con_iva": 25, "iva": False, "moneda": "MXN", "grupo": "Publicidad", "label": "Slot 1 · 30 seg/impresión (Comparables)"},
    "ad_slot1_60s":             {"precio": 38, "precio_con_iva": 38, "iva": False, "moneda": "MXN", "grupo": "Publicidad", "label": "Slot 1 · 60 seg/impresión (Comparables)"},
    "ad_slot2_15s":             {"precio": 10, "precio_con_iva": 10, "iva": False, "moneda": "MXN", "grupo": "Publicidad", "label": "Slot 2 · 15 seg/impresión (Generación IA)"},
    "ad_slot2_30s":             {"precio": 18, "precio_con_iva": 18, "iva": False, "moneda": "MXN", "grupo": "Publicidad", "label": "Slot 2 · 30 seg/impresión (Generación IA)"},
    "ad_slot3_15s":             {"precio": 5,  "precio_con_iva": 5,  "iva": False, "moneda": "MXN", "grupo": "Publicidad", "label": "Slot 3 · 15 seg/impresión (Antes de descarga)"},
}
