import os
import psycopg
import json
from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from app.db import Base, engine
from app import models
from app.api.v1.auths import router as auth_router
from app.api.v1.apps import router as app_router
from app.recommender import Recommender

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for FastAPI application."""
    # Perform any startup tasks here
    print("loading the dataset ")
    
    # loading the dataset and initializing the recommendation model
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_path = os.path.join(base_dir, "../seed/archive/full_format_recipes.json")
    
    with open(dataset_path, "r") as f:
        records = json.load(f)
    
    app.state.recommender = Recommender.from_records(records)
    
    print("recommendation model ready")
    
    yield  # This allows the application to run
    
    #shutdown logic
    print("shutting down the application")
    app.state.recommendation_model = None  
    
# pass the lifespan context manager to the FastAPI application
app = FastAPI(lifespan=lifespan)

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(app_router, prefix="/api/v1")

@app.get("/health")
def health():
    """Report whether the API is up and whether it can reach the database."""
    try:
        with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
            conn.execute("SELECT 1")
        db_status = "up"
    except Exception as error:
        db_status = f"error: {error}"
    return {"api":"ok", "db": db_status}


