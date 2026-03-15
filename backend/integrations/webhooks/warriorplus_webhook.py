from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/warriorplus', methods=['POST'])
def warriorplus_webhook():
    data = request.json
    # Process WarriorPlus webhook data
    event = {
        "event_type": "affiliate_conversion",
        "network": "warriorplus",
        "product_id": data.get("product_id"),
        "commission": data.get("commission"),
        "timestamp": data.get("timestamp"),
    }
    # Send event to event_ingestion_service
    print("Received WarriorPlus event:", event)
    return jsonify({"status": "success"}), 200