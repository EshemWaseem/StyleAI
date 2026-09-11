from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def health():
    return {
        "status": "FastAPI AI service is running"
    }


@app.get("/analyze")
def analyze():
    return {
        "product": "Demo Fashion Product",
        "category": "Fashion",
        "style": "Casual",
        "message": "AI analysis service is working"
    }