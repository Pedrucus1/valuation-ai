#!/usr/bin/env python3
import os
import sys
import subprocess

port = os.environ.get("PORT", "8000")
print(f"[start.py] PORT={port}", flush=True)
print("[start.py] launching uvicorn", flush=True)

result = subprocess.call([
    sys.executable, "-m", "uvicorn", "server:app",
    "--host", "0.0.0.0",
    "--port", port,
    "--app-dir", "/app/backend"
])
sys.exit(result)
