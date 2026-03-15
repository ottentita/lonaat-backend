import requests

def test_jvzoo_webhook():
    payload = {
        "product_id": "12345",
        "transaction_id": "txn_001",
        "commission": "50.00",
        "timestamp": "2026-03-11T10:00:00Z"
    }
    response = requests.post("http://localhost:5000/webhooks/jvzoo", json=payload)
    assert response.status_code == 200
    print("JVZoo webhook test passed.")

def test_digistore_webhook():
    payload = {
        "product_id": "67890",
        "transaction_id": "txn_002",
        "commission": "75.00",
        "timestamp": "2026-03-11T10:05:00Z"
    }
    response = requests.post("http://localhost:5000/webhooks/digistore", json=payload)
    assert response.status_code == 200
    print("Digistore24 webhook test passed.")

def test_warriorplus_webhook():
    payload = {
        "product_id": "54321",
        "transaction_id": "txn_003",
        "commission": "100.00",
        "timestamp": "2026-03-11T10:10:00Z"
    }
    response = requests.post("http://localhost:5000/webhooks/warriorplus", json=payload)
    assert response.status_code == 200
    print("WarriorPlus webhook test passed.")

def test_awin_webhook():
    payload = {
        "product_id": "98765",
        "transaction_id": "txn_004",
        "commission": "125.00",
        "timestamp": "2026-03-11T10:15:00Z"
    }
    response = requests.post("http://localhost:5000/webhooks/awin", json=payload)
    assert response.status_code == 200
    print("Awin webhook test passed.")

if __name__ == "__main__":
    test_jvzoo_webhook()
    test_digistore_webhook()
    test_warriorplus_webhook()
    test_awin_webhook()