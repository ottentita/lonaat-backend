import os
import requests


import time

def authenticate_mylead(retries=3, delay=2):
    email = os.getenv("MYLEAD_API_EMAIL")
    password = os.getenv("MYLEAD_API_PASSWORD")
    if not email or not password:
        return None, "Missing MyLead credentials."
    for attempt in range(retries):
        try:
            response = requests.post(
                "https://api.mylead.eu/api/external/v1/authenticate",
                json={"email": email, "password": password},
                timeout=10
            )
            if response.status_code == 200:
                return response.json().get("token"), None
            else:
                time.sleep(delay)
        except Exception as e:
            time.sleep(delay)
    return None, "Failed to authenticate after retries."

def fetch_mylead_data():
    token, err = authenticate_mylead()
    if not token:
        return {"error": err}
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get("https://api.mylead.eu/api/external/v1/conversions", headers=headers, timeout=10)
        if response.status_code == 200:
            return response.json()
        return {"error": f"Failed to fetch data: {response.status_code}"}
    except Exception as e:
        return {"error": str(e)}

def sync_campaigns():
    """Synchronize campaign data from MyLead."""
    data = fetch_mylead_data()
    # Placeholder: store or process data as needed
    return data

def get_report():
    """Return a summary report for MyLead integration."""
    data = fetch_mylead_data()
    if isinstance(data, dict) and "error" in data:
        return {"status": "error", "message": data["error"]}
    return {"status": "ok", "campaign_count": len(data) if isinstance(data, list) else 0}

def ingest_campaign(campaign):
    """Ingest a campaign record (stub for demo)."""
    # Placeholder: store campaign
    return {"status": "ingested", "campaign": campaign}

def main():
    data = fetch_mylead_data()
    print("MyLead data:", data)

if __name__ == "__main__":
    main()