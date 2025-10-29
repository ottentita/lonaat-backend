# Lonaat Backend

## Overview
A FastAPI-based backend service for the Lonaat application. This backend provides RESTful API endpoints, serves the mobile app download page, and handles file downloads for the LONAAT mobile app.

## Technology Stack
- **Framework**: FastAPI
- **Server**: Uvicorn
- **Language**: Python 3.11+
- **Package Manager**: UV

## Project Structure
```
lonaat-backend/
├── main.py              # Main FastAPI application
├── pyproject.toml       # Project configuration
├── static/              # Static files (HTML, CSS, JS)
│   └── download.html    # Mobile app download page
├── downloads/           # APK files and downloadable assets
│   └── README.md        # Instructions for adding files
└── replit.md            # Project documentation
```

## Recent Changes
- 2025-10-29: Initial project setup with FastAPI
- 2025-10-29: Configured basic API endpoints (root, health check)
- 2025-10-29: Added mobile app download page and file serving system
- 2025-10-29: Implemented APK download endpoints and static file serving

## Running the Project
The backend runs on port 5000 and is accessible via the configured workflow.

## API Endpoints

### Pages
- `GET /` - Landing page with links to all features
- `GET /download` - Mobile app download page

### API Routes
- `GET /health` - Health check endpoint
- `GET /api/files` - List all available downloadable files
- `GET /api/download/apk` - Download the APK file (first .apk found in downloads/)
- `GET /api/download/file/{filename}` - Download a specific file by name
- `POST /api/upload/apk` - Get information about uploading APK files

### Documentation
- `GET /docs` - FastAPI automatic interactive API documentation (Swagger UI)
- `GET /redoc` - Alternative API documentation (ReDoc)

## Features

### Mobile App Download Page
A beautiful, responsive HTML page that allows users to download the LONAAT mobile app APK. Includes:
- Installation instructions
- Feature highlights
- Build information
- QR code section (ready for integration)
- Mobile-responsive design

### File Serving System
Secure file serving with:
- Path traversal protection
- Support for any file type
- Automatic file listing
- Direct download links

### Static File Support
Serves static files (HTML, CSS, JS, images) from the `static/` directory.

## Usage

### Adding APK Files
1. Place your `.apk` file in the `downloads/` directory
2. The file will automatically be available at `/api/download/apk`
3. Users can access the download page at `/download`

### Accessing the Download Page
- Direct URL: `http://your-domain/download`
- From home: Click "Download Mobile App" button
