import { useState, useEffect } from "react";
import { API } from "@/App";

// Valores por defecto — se sobreescriben con lo que venga del backend
export const PRICES_DEFAULT = {
  // Público
  publico_individual:     280,
  publico_bronce:         815,
  publico_plata:          1317,
  publico_oro:            2555,
  addon_valuador:         350,
  addon_visita:           600,
  // Valuadores
  valuador_independiente: 840,
  valuador_despacho:      1600,
  valuador_pro:           3100,
  valuador_corporativo:   4500,
  // Inmobiliarias
  inmobiliaria_lite5:     1400,
  inmobiliaria_lite10:    2700,
  inmobiliaria_pro20:     5200,
  inmobiliaria_premier:   7500,
  // Publicidad — precio por impresión (sin IVA)
  ad_slot1_15s: 15,
  ad_slot1_30s: 25,
  ad_slot1_60s: 38,
  ad_slot2_15s: 10,
  ad_slot2_30s: 18,
  ad_slot3_15s: 5,
};

// Caché a nivel de módulo — una sola llamada por sesión de navegador
const _cache = { data: null, promise: null };

export function usePrices() {
  const [prices, setPrices] = useState(_cache.data || PRICES_DEFAULT);
  const [loading, setLoading] = useState(!_cache.data);

  useEffect(() => {
    if (_cache.data) {
      setPrices(_cache.data);
      setLoading(false);
      return;
    }
    if (!_cache.promise) {
      _cache.promise = fetch(`${API}/precios`)
        .then((r) => r.json())
        .then((data) => {
          const mapped = { ...PRICES_DEFAULT };
          for (const [key, val] of Object.entries(data)) {
            if (typeof val === "object" && val !== null) {
              // Planes con IVA → precio_con_iva; slots publicidad → precio
              mapped[key] = val.precio_con_iva ?? val.precio ?? mapped[key];
            }
          }
          _cache.data = mapped;
          return mapped;
        })
        .catch(() => {
          _cache.promise = null; // permite reintentar si falla
          return PRICES_DEFAULT;
        });
    }
    _cache.promise.then((data) => {
      setPrices(data);
      setLoading(false);
    });
  }, []);

  return { prices, loading };
}
