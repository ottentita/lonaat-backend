from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os
from typing import List

app = FastAPI(title="Lonaat Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOWNLOADS_DIR = Path("downloads")
STATIC_DIR = Path("static")

DOWNLOADS_DIR.mkdir(exist_ok=True)
STATIC_DIR.mkdir(exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def root():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Lonaat Backend API</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #1f77b4 0%, #2c3e50 100%);
                color: white;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0;
                padding: 20px;
            }
            .container {
                text-align: center;
                max-width: 600px;
            }
            h1 { font-size: 36px; margin-bottom: 16px; }
            p { font-size: 18px; opacity: 0.9; margin-bottom: 30px; }
            .links {
                display: flex;
                gap: 16px;
                justify-content: center;
                flex-wrap: wrap;
            }
            a {
                display: inline-block;
                background: rgba(255,255,255,0.1);
                color: white;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 8px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
                transition: all 0.3s ease;
            }
            a:hover {
                background: rgba(255,255,255,0.2);
                transform: translateY(-2px);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 Lonaat Backend API</h1>
            <p>AI-Powered Affiliate Marketing Dashboard</p>
            <div class="links">
                <a href="/download">📱 Download Mobile App</a>
                <a href="/api/files">📁 View Files</a>
                <a href="/docs">📚 API Documentation</a>
                <a href="/health">💚 Health Check</a>
            </div>
        </div>
    </body>
    </html>
    """

@app.get("/download", response_class=HTMLResponse)
async def download_page():
    html_file = STATIC_DIR / "download.html"
    if not html_file.exists():
        raise HTTPException(status_code=404, detail="Download page not found")
    return FileResponse(html_file)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "0.1.0"}

@app.get("/api/files")
async def list_files():
    files = []
    if DOWNLOADS_DIR.exists():
        for file_path in DOWNLOADS_DIR.iterdir():
            if file_path.is_file():
                files.append({
                    "name": file_path.name,
                    "size": file_path.stat().st_size,
                    "download_url": f"/api/download/file/{file_path.name}"
                })
    return {"files": files, "count": len(files)}

@app.get("/api/download/apk")
async def download_apk():
    apk_files = list(DOWNLOADS_DIR.glob("*.apk"))
    
    if not apk_files:
        raise HTTPException(
            status_code=404, 
            detail="No APK file found. Please build the APK first or place it in the downloads directory."
        )
    
    apk_file = apk_files[0]
    
    return FileResponse(
        path=apk_file,
        media_type="application/vnd.android.package-archive",
        filename=apk_file.name,
        headers={
            "Content-Disposition": f'attachment; filename="{apk_file.name}"'
        }
    )

@app.get("/api/download/file/{filename}")
async def download_file(filename: str):
    file_path = DOWNLOADS_DIR / filename
    
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    
    safe_path = file_path.resolve()
    safe_downloads = DOWNLOADS_DIR.resolve()
    
    if not str(safe_path).startswith(str(safe_downloads)):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

@app.post("/api/upload/apk")
async def upload_info():
    return {
        "message": "To upload APK files, place them in the 'downloads' directory",
        "path": str(DOWNLOADS_DIR.absolute())
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
