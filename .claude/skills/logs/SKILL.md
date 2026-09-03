---
name: logs
description: Muestra el estado y los logs recientes del scraper/enricher (Mongo, no Sheets). Equivalente a tail -f del proceso activo.
---

Muestra el estado actual del scraper/enricher.

1. Muestra las últimas 40 líneas de `C:\Users\pedru\valuation-ai\Pagina-Valuacion-con-Ai--main\scraper-inmuebles\scraper_mensual.log`
   (corrida mensual del scheduler) y de `scraper_last_run.txt` (último mes ya corrido).

2. Cuenta cuántos procesos Python están corriendo:
   ```
   tasklist | findstr python
   ```

3. Revisa los logs del enricher más recientes en
   `C:\Users\pedru\valuation-ai\Pagina-Valuacion-con-Ai--main\scraper-inmuebles\logs\` (ordenar por fecha de modificación,
   mostrar los `*_err.log` primero si tienen contenido).

4. Presenta un resumen:
   - N procesos Python corriendo (scraper/enricher activos)
   - Última corrida mensual (fecha, del log)
   - Errores recientes del enricher (si los hay)
   - Todo escribe directo a MongoDB `mercado_props` — no hay buffer ni Sheets que revisar.

Para seguimiento en tiempo real, sugiere al usuario correr en su terminal:
```
powershell -Command "Get-Content 'C:\Users\pedru\valuation-ai\Pagina-Valuacion-con-Ai--main\scraper-inmuebles\scraper_mensual.log' -Wait -Tail 20"
```
