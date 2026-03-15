FROM python:3.11-slim

# Prevent Python from buffering stdout/stderr (so logs are visible)
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system deps for common Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend sources
COPY . /app

# Default command runs the long-running worker
CMD ["python", "workers/phase9_worker.py"]
FROM python:3.11-slim

WORKDIR /app

# Copy only what's needed for smoke tests
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY backend /app/backend
COPY .env /app/.env

ENV FLASK_ENV=development
ENV FLASK_SECRET=dev_secret
ENV JWT_SECRET_KEY=dev_jwt_secret

CMD ["python", "backend/smoke_test.py"]
