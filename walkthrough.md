# Implementación de Consola de Email Marketing y Notificaciones (#34 y #15)

## Archivos Modificados / Creados

1. **`backend/core/email.py`**:
   - Se creó este archivo para implementar un cliente de correo basado en SMTP estándar.
   - Lee variables desde `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`).
   - Función `send_email(to_emails, subject, html_content, attachments)` implementada.
   - Incluye soporte para inyectar una firma estándar de PropValu de manera automática a todos los correos enviados.

2. **`backend/routers/newsletter.py`**:
   - Se modificó para agregar el endpoint `/admin/newsletter/send` que recibe el asunto, cuerpo y audiencia. Llama a la tarea en segundo plano `process_email_campaign` (Throttling de 1 segundo entre correos) y guarda logs en MongoDB (`email_logs`).
   - Se agregó el endpoint `/admin/newsletter/generate-text` que llama a Gemini AI usando la librería `google.generativeai` y `gemini-2.5-flash` para proponer asuntos y cuerpos de correos con formato HTML.

3. **`frontend/src/pages/admin/AdminNewsletter.jsx`**:
   - Se rediseñó la página para incluir la consola de "Redactar Campaña".
   - Se incluyó `react-quill-new` para soportar edición de texto enriquecido compatible con React 19.
   - Se agregó la sección "Asistente IA" para generar asuntos o cuerpos de correo de forma sencilla, permitiendo adjuntarlo directamente al editor con un clic.
   - Se incluyó la selección de audiencias de acuerdo a los roles de la base de datos (public, appraiser, realtor).

## Siguientes Pasos

Debido a los requerimientos de la terminal, por favor ejecuta manualmente el siguiente comando en la carpeta `frontend/` para instalar el editor de texto enriquecido:

```bash
cd frontend
npm install react-quill-new --legacy-peer-deps
```

*Nota: Usamos `react-quill-new` en lugar de `react-quill` ya que la librería original está desactualizada y causa problemas de dependencias en React 19. Si prefieres `react-quill`, solo instala ese paquete.*

Configuración en `.env` (Backend):
Asegúrate de tener correctamente configuradas las siguientes variables en `backend/.env`:
```env
SMTP_HOST=smtp.gmail.com # o tu proveedor SMTP
SMTP_PORT=587
SMTP_USER=tu-email@propvalu.com
SMTP_PASS=tu-contraseña-o-app-password
SMTP_FROM_EMAIL=tu-email@propvalu.com
GEMINI_API_KEY=tu-api-key-de-gemini
```
