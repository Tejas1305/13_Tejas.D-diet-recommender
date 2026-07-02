import os
import psycopg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import Base, engine
from app import models
from app.api.v1.auths import router as auth_router
#from app.api.v1.apps import router as app_router

app = FastAPI()

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
#app.include_router(app_router, prefix="/api/v1")

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


