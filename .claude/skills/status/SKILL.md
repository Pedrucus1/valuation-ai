---
name: status
description: Muestra el estado del proyecto PropValu — procesos corriendo, puerto 8000 y 3001, últimos commits, y si hay cambios sin commitear.
---

Muestra un resumen del estado actual del proyecto PropValu.

Ejecuta los siguientes checks en orden y presenta el resultado en formato compacto:

1. **Backend** — verifica si hay un proceso en el puerto 8000:
   ```
   netstat -ano | grep ":8000"
   ```
   Si hay proceso: ✅ Backend corriendo (PID X)
   Si no: ❌ Backend detenido

2. **Frontend** — verifica puerto 3001:
   ```
   netstat -ano | grep ":3001"
   ```
   Si hay proceso: ✅ Frontend corriendo
   Si no: ❌ Frontend detenido

3. **Git** — muestra cambios pendientes y último commit:
   ```
   git status --short
   git log --oneline -3
   ```

4. **Procesos Python** — cuenta cuántos hay corriendo:
   ```
   tasklist | grep python
   ```

Presenta todo en menos de 15 líneas. Si algo no está corriendo, muestra el comando para levantarlo.

**Para levantar backend:**
```
cd backend && "C:\Users\pedru\AppData\Local\Python\pythoncore-3.14-64\python.exe" -m uvicorn server:app --reload --port 8000
```

**Para levantar frontend:**
```
cd frontend && npm start
```
