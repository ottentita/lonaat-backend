from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/jvzoo', methods=['POST'])
def jvzoo_webhook():
    data = request.json
    # Process JVZoo webhook data
    event = {
        "event_type": "affiliate_conversion",
        "network": "jvzoo",
        "product_id": data.get("product_id"),
        "commission": data.get("commission"),
        "timestamp": data.get("timestamp"),
    }
    # Send event to event_ingestion_service
    print("Received JVZoo event:", event)
    return jsonify({"status": "success"}), 200