import os
import requests


import time

def authenticate_admitad(retries=3, delay=2):
    client_id = os.getenv("ADMITAD_CLIENT_ID")
    client_secret = os.getenv("ADMITAD_CLIENT_SECRET")
    if not client_id or not client_secret:
        return None, "Missing Admitad credentials."
    for attempt in range(retries):
        try:
            response = requests.post(
                "https://api.admitad.com/token/",
                data={"client_id": client_id, "client_secret": client_secret},
                timeout=10
            )
            if response.status_code == 200:
                return response.json().get("access_token"), None
            else:
                time.sleep(delay)
        except Exception as e:
            time.sleep(delay)
    return None, "Failed to authenticate after retries."

def fetch_admitad_data():
    token, err = authenticate_admitad()
    if not token:
        return {"error": err}
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get("https://api.admitad.com/products/", headers=headers, timeout=10)
        if response.status_code == 200:
            return response.json()
        return {"error": f"Failed to fetch data: {response.status_code}"}
    except Exception as e:
        return {"error": str(e)}

def sync_campaigns():
    """Synchronize campaign data from Admitad."""
    data = fetch_admitad_data()
    # Placeholder: store or process data as needed
    return data

def get_report():
    """Return a summary report for Admitad integration."""
    data = fetch_admitad_data()
    if isinstance(data, dict) and "error" in data:
        return {"status": "error", "message": data["error"]}
    return {"status": "ok", "campaign_count": len(data) if isinstance(data, list) else 0}

def ingest_campaign(campaign):
    """Ingest a campaign record (stub for demo)."""
    # Placeholder: store campaign
    return {"status": "ingested", "campaign": campaign}

def main():
    data = fetch_admitad_data()
    print("Admitad data:", data)

if __name__ == "__main__":
    main()