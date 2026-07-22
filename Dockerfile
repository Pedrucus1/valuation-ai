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

# Install only what motor Remi needs: openai + google-generative-ai + dotenv
RUN npm install openai @google/generative-ai dotenv

# Copy all project files
COPY . .

EXPOSE 8000

CMD sh -c "cd backend && uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"
