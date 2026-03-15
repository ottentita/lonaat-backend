import os
import requests

def connect_to_admitad():
    client_id = os.getenv("ADMITAD_CLIENT_ID")
    client_secret = os.getenv("ADMITAD_CLIENT_SECRET")
    if not client_id or not client_secret:
        return "Admitad: Missing credentials."
    # Example API connection logic
    response = requests.post(
        "https://api.admitad.com/token/",
        data={"client_id": client_id, "client_secret": client_secret},
    )
    return f"Admitad: {response.status_code} - {response.reason}"

def connect_to_impact():
    account_sid = os.getenv("IMPACT_ACCOUNT_SID")
    api_token = os.getenv("IMPACT_API_TOKEN")
    if not account_sid or not api_token:
        return "Impact: Missing credentials."
    # Example API connection logic
    response = requests.get(
        f"https://api.impact.com/{account_sid}/authenticate",
        headers={"Authorization": f"Bearer {api_token}"},
    )
    return f"Impact: {response.status_code} - {response.reason}"

def connect_to_mylead():
    email = os.getenv("MYLEAD_API_EMAIL")
    password = os.getenv("MYLEAD_API_PASSWORD")
    if not email or not password:
        return "MyLead: Missing credentials."
    # Example API connection logic
    response = requests.post(
        "https://api.mylead.eu/api/external/v1/authenticate",
        json={"email": email, "password": password},
    )
    return f"MyLead: {response.status_code} - {response.reason}"

def main():
    results = []
    results.append(connect_to_admitad())
    results.append(connect_to_impact())
    results.append(connect_to_mylead())

    for result in results:
        print(result)

if __name__ == "__main__":
    main()