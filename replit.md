# Lonaat Backend

## Overview
A FastAPI-based backend service for the Lonaat application. This backend provides RESTful API endpoints and is configured to run on port 5000.

## Technology Stack
- **Framework**: FastAPI
- **Server**: Uvicorn
- **Language**: Python 3.11+
- **Package Manager**: UV

## Project Structure
```
lonaat-backend/
├── main.py           # Main FastAPI application
├── pyproject.toml    # Project configuration
└── replit.md         # Project documentation
```

## Recent Changes
- 2025-10-29: Initial project setup with FastAPI
- 2025-10-29: Configured basic API endpoints (root, health check)

## Running the Project
The backend runs on port 5000 and is accessible via the configured workflow.

## API Endpoints
- `GET /` - Welcome message and status
- `GET /health` - Health check endpoint
