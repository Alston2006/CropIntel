from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


API_KEY = "579b464db66ec23bdd000001e734b1b830854f41600f7e1097b5bdfe"

URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"


@app.get("/prices")
def get_prices():

    params = {
        "api-key": API_KEY,
        "format": "json",
        "limit": 50
    }

    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
    }

    response = requests.get(URL, params=params, headers=headers)

    data = response.json()

    return data["records"]