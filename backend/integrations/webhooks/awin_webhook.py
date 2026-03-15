from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/awin', methods=['POST'])
def awin_webhook():
    data = request.json
    # Process Awin webhook data
    event = {
        "event_type": "affiliate_conversion",
        "network": "awin",
        "product_id": data.get("product_id"),
        "commission": data.get("commission"),
        "timestamp": data.get("timestamp"),
    }
    # Send event to event_ingestion_service
    print("Received Awin event:", event)
    return jsonify({"status": "success"}), 200