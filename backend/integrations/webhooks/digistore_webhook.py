from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/digistore', methods=['POST'])
def digistore_webhook():
    data = request.json
    # Process Digistore24 webhook data
    event = {
        "event_type": "affiliate_conversion",
        "network": "digistore24",
        "product_id": data.get("product_id"),
        "commission": data.get("commission"),
        "timestamp": data.get("timestamp"),
    }
    # Send event to event_ingestion_service
    print("Received Digistore24 event:", event)
    return jsonify({"status": "success"}), 200