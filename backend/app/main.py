# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.routers import auth, customers, payments, routes, officers, assignments, dashboard, reports

logger = logging.getLogger("uvicorn.error")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Electricity Bill Collection System Backend...")
    await connect_to_mongo()
    yield
    logger.info("Shutting down backend...")
    await close_mongo_connection()

app = FastAPI(
    title="Electricity Bill Collection & Navigation System API",
    description="Backend services for electricity department field officer collections, GIS map customer tracking, and route calculation.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local Next.js frontend during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(payments.router)
app.include_router(routes.router)
app.include_router(officers.router)
app.include_router(assignments.router)
app.include_router(dashboard.router)
app.include_router(reports.router)

@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "service": "Electricity Bill Collection & Navigation System API",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
