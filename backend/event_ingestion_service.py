from flask import Flask, request, jsonify

app = Flask(__name__)

def send_to_pipeline(event):
    # Simulate sending the event to the unified pipeline
    print("Event sent to pipeline:", event)

@app.route('/webhooks/jvzoo', methods=['POST'])
def jvzoo_webhook():
    data = request.json
    event = {
        "event_type": "affiliate_conversion",
        "network": "jvzoo",
        "product_id": data.get("product_id"),
        "transaction_id": data.get("transaction_id"),
        "commission": data.get("commission"),
        "timestamp": data.get("timestamp"),
    }
    send_to_pipeline(event)
    return jsonify({"status": "success"}), 200

@app.route('/webhooks/digistore', methods=['POST'])
def digistore_webhook():
    data = request.json
    event = {
        "event_type": "affiliate_conversion",
        "network": "digistore24",
        "product_id": data.get("product_id"),
        "transaction_id": data.get("transaction_id"),
        "commission": data.get("commission"),
        "timestamp": data.get("timestamp"),
    }
    send_to_pipeline(event)
    return jsonify({"status": "success"}), 200

@app.route('/webhooks/warriorplus', methods=['POST'])
def warriorplus_webhook():
    data = request.json
    event = {
        "event_type": "affiliate_conversion",
        "network": "warriorplus",
        "product_id": data.get("product_id"),
        "transaction_id": data.get("transaction_id"),
        "commission": data.get("commission"),
        "timestamp": data.get("timestamp"),
    }
    send_to_pipeline(event)
    return jsonify({"status": "success"}), 200

@app.route('/webhooks/awin', methods=['POST'])
def awin_webhook():
    data = request.json
    event = {
        "event_type": "affiliate_conversion",
        "network": "awin",
        "product_id": data.get("product_id"),
        "transaction_id": data.get("transaction_id"),
        "commission": data.get("commission"),
        "timestamp": data.get("timestamp"),
    }
    send_to_pipeline(event)
    return jsonify({"status": "success"}), 200

if __name__ == "__main__":
    app.run(debug=True)