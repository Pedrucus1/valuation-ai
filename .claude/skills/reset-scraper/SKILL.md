---
name: reset-scraper
description: Resetea las tareas de un portal del scraper a 'pendiente' para que vuelva a correr. Uso: /reset-scraper PORTAL (ej. INMUEBLES24, VIVANUNCIOS, MITULA, PINCALI, CASAS_Y_TERRENOS, PROPIEDADES_COM, NOCNOK)
argument-hint: PORTAL
---

El usuario quiere resetear las tareas de un portal del scraper.

Portal a resetear: $ARGUMENTS

Portales válidos: INMUEBLES24, VIVANUNCIOS, MITULA, PINCALI, CASAS_Y_TERRENOS, PROPIEDADES_COM, NOCNOK

1. Si no se especificó portal o es inválido, muestra la lista de portales válidos y pide que especifique.

2. Confirma antes de ejecutar: "¿Resetear todas las tareas de [PORTAL] a pendiente?"

3. Ejecuta:
   ```
   cd C:\Users\pedru\valuation-ai\Pagina-Valuacion-con-Ai--main\scraper-inmuebles
   "C:\Users\pedru\AppData\Local\Python\pythoncore-3.14-64\python.exe" reset_portal.py [PORTAL]
   ```

4. Muestra el resultado y recuerda al usuario que debe correr el scheduler para que retome:
   ```
   "C:\Users\pedru\AppData\Local\Python\pythoncore-3.14-64\python.exe" scheduler.py --portal [PORTAL]
   ```
