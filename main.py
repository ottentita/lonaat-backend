from flask import Flask, render_template, request, jsonify
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, db
import os
import json
from affiliate_scraper import fetch_affiliate_products, generate_product_description, analyze_product_with_ai

app = Flask(__name__)

# Initialize Firebase using environment variable
firebase_creds = os.getenv('FIREBASE_SERVICE_ACCOUNT')

if firebase_creds:
    # Parse JSON from environment variable
    cred_dict = json.loads(firebase_creds)
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://lonaat-system-default-rtdb.firebaseio.com/'
    })
    firebase_enabled = True
    users_ref = db.reference('users')
    transactions_ref = db.reference('transactions')
else:
    # Fallback to in-memory database for development
    firebase_enabled = False
    database = {
        "users": {},
        "transactions": []
    }
    print("⚠️  Firebase credentials not found. Using in-memory database.")

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

@app.route('/get_users')
def get_users():
    if firebase_enabled:
        all_users = users_ref.get()
        return jsonify(all_users or {})
    else:
        return jsonify(database['users'])

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    user_id = data.get('user_id')
    user_data = {
        "name": data.get('name'),
        "email": data.get('email'),
        "balance": 0.0,
        "bank_account": data.get('bank_account'),
        "created_at": datetime.now().isoformat()
    }
    
    if firebase_enabled:
        users_ref.child(user_id).set(user_data)
    else:
        database['users'][user_id] = user_data
    
    return jsonify({"message": "User registered successfully"})

@app.route('/add_commission', methods=['POST'])
def add_commission():
    data = request.get_json()
    user_id = data.get('user_id')
    amount = float(data.get('amount', 0))
    
    if firebase_enabled:
        user = users_ref.child(user_id).get()
        if user:
            new_balance = user['balance'] + amount
            users_ref.child(user_id).update({'balance': new_balance})
            transactions_ref.push({
                "user_id": user_id,
                "amount": amount,
                "date": datetime.now().isoformat(),
                "status": "pending"
            })
            return jsonify({"message": "Commission added"})
        else:
            return jsonify({"error": "User not found"}), 404
    else:
        if user_id in database['users']:
            database['users'][user_id]['balance'] += amount
            database['transactions'].append({
                "user_id": user_id,
                "amount": amount,
                "date": datetime.now().isoformat(),
                "status": "pending"
            })
            return jsonify({"message": "Commission added"})
        else:
            return jsonify({"error": "User not found"}), 404

@app.route('/withdraw', methods=['POST'])
def withdraw():
    data = request.get_json()
    user_id = data.get('user_id')
    amount = float(data.get('amount', 0))
    
    if firebase_enabled:
        user = users_ref.child(user_id).get()
        if user and user['balance'] >= amount:
            new_balance = user['balance'] - amount
            users_ref.child(user_id).update({'balance': new_balance})
            transactions_ref.push({
                "user_id": user_id,
                "amount": -amount,
                "date": datetime.now().isoformat(),
                "status": "paid"
            })
            return jsonify({"message": f"₦{amount} withdrawal successful"})
        else:
            return jsonify({"error": "Insufficient funds or user not found"}), 400
    else:
        if user_id in database['users'] and database['users'][user_id]['balance'] >= amount:
            database['users'][user_id]['balance'] -= amount
            database['transactions'].append({
                "user_id": user_id,
                "amount": -amount,
                "date": datetime.now().isoformat(),
                "status": "paid"
            })
            return jsonify({"message": f"₦{amount} withdrawal approved"})
        else:
            return jsonify({"error": "Insufficient funds or user not found"}), 400

@app.route('/api/scrape_products', methods=['POST'])
def scrape_products():
    """Scrape products from an affiliate URL"""
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({"error": "URL is required"}), 400
    
    products = fetch_affiliate_products(url)
    return jsonify({"products": products, "count": len(products)})

@app.route('/api/generate_description', methods=['POST'])
def generate_description():
    """Generate AI description for a product"""
    data = request.get_json()
    product_name = data.get('product_name')
    
    if not product_name:
        return jsonify({"error": "Product name is required"}), 400
    
    try:
        description = generate_product_description(product_name)
        return jsonify({"product_name": product_name, "description": description})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Failed to generate description"}), 500

@app.route('/api/analyze_product', methods=['POST'])
def analyze_product():
    """Analyze and enhance product data with AI"""
    data = request.get_json()
    product_data = data.get('product')
    
    if not product_data:
        return jsonify({"error": "Product data is required"}), 400
    
    try:
        enhanced_product = analyze_product_with_ai(product_data)
        return jsonify(enhanced_product)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Failed to analyze product"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
