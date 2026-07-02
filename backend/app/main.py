from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health_check():
    """Confirms weather the api is running"""
    return {"status": "healthy"}