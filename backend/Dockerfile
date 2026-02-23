FROM python:3.11-slim

WORKDIR /app

# Copy only what's needed for smoke tests
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY backend /app/backend
COPY .env /app/.env

ENV FLASK_ENV=development
ENV DATABASE_URL=sqlite:///test.db
ENV FLASK_SECRET=dev_secret
ENV JWT_SECRET_KEY=dev_jwt_secret

CMD ["python", "backend/smoke_test.py"]
