import os
import requests


import time

def authenticate_impact(retries=3, delay=2):
    account_sid = os.getenv("IMPACT_ACCOUNT_SID")
    api_token = os.getenv("IMPACT_API_TOKEN")
    if not account_sid or not api_token:
        return None, "Missing Impact credentials."
    for attempt in range(retries):
        try:
            response = requests.get(
                f"https://api.impact.com/{account_sid}/authenticate",
                headers={"Authorization": f"Bearer {api_token}"},
                timeout=10
            )
            if response.status_code == 200:
                return True, "Authenticated successfully."
            else:
                time.sleep(delay)
        except Exception as e:
            time.sleep(delay)
    return False, "Failed to authenticate after retries."

def fetch_impact_data():
    ok, msg = authenticate_impact()
    if not ok:
        return {"error": msg}
    try:
        response = requests.get("https://api.impact.com/conversions", timeout=10)
        if response.status_code == 200:
            return response.json()
        return {"error": f"Failed to fetch data: {response.status_code}"}
    except Exception as e:
        return {"error": str(e)}

def sync_campaigns():
    """Synchronize campaign data from Impact."""
    data = fetch_impact_data()
    # Placeholder: store or process data as needed
    return data

def get_report():
    """Return a summary report for Impact integration."""
    data = fetch_impact_data()
    if isinstance(data, dict) and "error" in data:
        return {"status": "error", "message": data["error"]}
    return {"status": "ok", "campaign_count": len(data) if isinstance(data, list) else 0}

def ingest_campaign(campaign):
    """Ingest a campaign record (stub for demo)."""
    # Placeholder: store campaign
    return {"status": "ingested", "campaign": campaign}

def main():
    data = fetch_impact_data()
    print("Impact data:", data)

if __name__ == "__main__":
    main()