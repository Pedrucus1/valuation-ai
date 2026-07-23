#!/usr/bin/env bash
set -uo pipefail
cd "/c/Users/pedru/valuation-ai/Pagina-Valuacion-con-Ai--main/Modulo Drive IA"
PY="C:\Users\pedru\AppData\Local\Python\pythoncore-3.14-64\python.exe"
LOG="ixtepete_calma_progreso.md"

echo "# Progreso — La Calma + Ixtepete (unificado)" > "$LOG"
echo "" >> "$LOG"
echo "| Colonia | Municipio | Tipo | Resultado |" >> "$LOG"
echo "|---|---|---|---|" >> "$LOG"

run_one() {
  local colonia="$1" muni="$2" tipo="$3"
  echo "=== $colonia ($tipo) ==="
  node buscar_comparables_browser.js --colonia "$colonia" --municipio "$muni" --tipo "$tipo" --m2 100
  local out
  out=$(cd ../scraper-inmuebles && "$PY" insertar_comparables_ondemand.py "../Modulo Drive IA/_comparables_browser_temp.json" 2>&1 | tr '\n' ' ')
  echo "| $colonia | $muni | $tipo | $out |" >> "$LOG"
  sleep $(( (RANDOM % 8) + 8 ))
}

run_one "La Calma" "Zapopan" "casa"
run_one "La Calma" "Zapopan" "departamento"
run_one "Jardines de Ixtepete" "Zapopan" "casa"
run_one "Villas del Ixtepete" "Zapopan" "casa"
run_one "Villas del Ixtepete" "Zapopan" "departamento"

# Similares de La Calma agregados manualmente (input del usuario, verificados contra sepomex_v2)
run_one "El Colli Ejidal" "Zapopan" "casa"
run_one "El Colli Urbano 1a" "Zapopan" "casa"
run_one "Arboledas 1a Secc" "Zapopan" "casa"
run_one "Loma Bonita" "Zapopan" "casa"
run_one "Las Aguilas" "Zapopan" "casa"
run_one "Pinar de la Calma" "Zapopan" "casa"

echo "" >> "$LOG"
echo "Terminado $(date)" >> "$LOG"
