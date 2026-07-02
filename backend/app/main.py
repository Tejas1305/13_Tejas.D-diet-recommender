import os
import psycopg
from fastapi import FastAPI

app = FastAPI()


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

