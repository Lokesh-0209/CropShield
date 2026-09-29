from fastapi import FastAPI
from app.api.cases import router as cases_router
from app.api.risk import router as risk_router
from app.api.outbreak import router as outbreak_router

app = FastAPI(
    title="CropShield API",
    description="Backend API for CropShield",
    version="0.1.0",
)

# Mount API routers
app.include_router(cases_router)
app.include_router(risk_router)
app.include_router(outbreak_router)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "CropShield API",
    }

