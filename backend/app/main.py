from fastapi import FastAPI

app = FastAPI(
    title="CropShield API",
    description="Backend API for CropShield",
    version="0.1.0",
)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "CropShield API",
    }
