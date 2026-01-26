from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.detection import detect_food
import shutil
import os
from datetime import datetime

app = FastAPI(title="Food Detection API")

# CORS configuration for React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Your React app URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/api/detect")
async def detect_food_image(file: UploadFile = File(...)):
    try:
        # Save uploaded file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Run food detection
        detection_results = await detect_food(file_path)
        
        # Clean up (optional - keep for reference)
        # os.remove(file_path)
        
        return JSONResponse({
            "success": True,
            "filename": filename,
            "detections": detection_results,
            "message": "Food detection completed successfully"
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/detect-url")
async def detect_food_from_url(image_url: str):
    """Alternative: Process image from URL (for your proxy images)"""
    try:
        # Download image from URL
        import requests
        from PIL import Image
        import io
        
        response = requests.get(image_url)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to download image")
        
        # Save temporarily
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_url_image.jpg"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        with open(file_path, "wb") as f:
            f.write(response.content)
        
        # Run detection
        detection_results = await detect_food(file_path)
        
        return JSONResponse({
            "success": True,
            "detections": detection_results
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Food Detection API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)