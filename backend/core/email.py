import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import List, Optional
from dotenv import load_dotenv
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_DIR / ".env")

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", SMTP_USER)

SIGNATURE_HTML = """
<br>
<hr>
<p style="font-family: Arial, sans-serif; font-size: 12px; color: #555;">
  <strong>PropValu</strong><br>
  Innovación en Valuación Inmobiliaria<br>
  <a href="https://propvalu.com" style="color: #0066cc;">www.propvalu.com</a>
</p>
"""

def send_email(to_emails: List[str], subject: str, html_content: str, attachments: Optional[List[dict]] = None):
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASS:
        raise ValueError("SMTP variables are not configured properly.")

    # Append standard signature
    full_html = html_content + SIGNATURE_HTML

    msg = MIMEMultipart()
    msg['From'] = SMTP_FROM_EMAIL
    msg['To'] = ", ".join(to_emails)
    msg['Subject'] = subject

    msg.attach(MIMEText(full_html, 'html'))

    if attachments:
        for attachment in attachments:
            part = MIMEApplication(attachment['content'], Name=attachment['filename'])
            part['Content-Disposition'] = f'attachment; filename="{attachment["filename"]}"'
            msg.attach(part)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)

