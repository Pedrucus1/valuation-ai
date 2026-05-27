FROM python:3.12-slim

# Install Node.js 20
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Install Node.js dependencies for motor Remi
COPY ["Modulo Drive IA/package.json", "Modulo Drive IA/package-lock.json*", "Modulo Drive IA/"]
RUN cd "Modulo Drive IA" && npm install --omit=dev 2>/dev/null || true

# Copy all project files
COPY . .

EXPOSE 8000

CMD sh -c "cd backend && uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"
