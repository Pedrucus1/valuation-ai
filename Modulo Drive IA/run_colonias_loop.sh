#!/bin/bash
# Loop autónomo — procesa las 80 colonias débiles restantes (7-86) sin intervención por evento.
cd "/c/Users/pedru/valuation-ai/Pagina-Valuacion-con-Ai--main/Modulo Drive IA" || exit 1
PY="/c/Users/pedru/AppData/Local/Python/pythoncore-3.14-64/python.exe"
LOG="colonias_debiles_loop.log"
PROG="colonias_debiles_progreso.md"
IDX=6

echo "=== INICIO LOOP $(date) ===" >> "$LOG"

while IFS='|' read -r muni col nraw; do
  IDX=$((IDX + 1))
  muni=$(echo "$muni" | xargs)
  col=$(echo "$col" | xargs)
  nraw=$(echo "$nraw" | xargs | sed 's/^n=//')
  echo "" >> "$LOG"
  echo "=== #$IDX $muni | $col | $nraw ($(date '+%H:%M:%S')) ===" >> "$LOG"

  rm -f "_comparables_browser_temp.json"
  node buscar_comparables_browser.js --colonia "$col" --municipio "$muni" --tipo casa --m2 100 >> "$LOG" 2>&1

  resultado="0 resultados"
  if [ -s "_comparables_browser_temp.json" ]; then
    insert_out=$(cd ../scraper-inmuebles && "$PY" insertar_comparables_ondemand.py "../Modulo Drive IA/_comparables_browser_temp.json" 2>&1)
    echo "$insert_out" >> "$LOG"
    resultado="$insert_out"
  fi

  # Append a la tabla de progreso (escapando pipes del resultado)
  resultado_md=$(echo "$resultado" | tr '\n' ' ' | sed 's/|/;/g')
  echo "| $IDX | $muni | $col | $nraw | $resultado_md |" >> "$PROG"

  sleep $((8 + RANDOM % 8))
done < remaining_colonias.txt

echo "" >> "$LOG"
echo "=== LOOP_COMPLETO $(date) — 86/86 colonias procesadas ===" >> "$LOG"
echo "" >> "$PROG"
echo "**LOOP_COMPLETO** — corrida terminada $(date)." >> "$PROG"
