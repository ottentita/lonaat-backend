from flask import Flask, render_template, request, jsonify
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, db
import os
import json
import random
from typing import Optional, Any, Dict, List
from affiliate_scraper import fetch_affiliate_products, generate_product_description, analyze_product_with_ai, generate_ad_text

app = Flask(__name__)

# Initialize Firebase references and database with proper types
users_ref: Optional[Any] = None
transactions_ref: Optional[Any] = None
database: Optional[Dict[str, Any]] = None
firebase_enabled: bool = False

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

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/withdraw_page')
def withdraw_page():
    return render_template('withdraw.html')

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

@app.route('/track_commission', methods=['POST'])
def track_commission():
    """Track affiliate commission when a product link is used"""
    data = request.get_json()
    product_link = data.get('product_link')
    user_id = data.get('user_id')
    
    if not product_link or not user_id:
        return jsonify({"error": "product_link and user_id are required"}), 400
    
    # Simulate real-time affiliate commission tracking
    commission = round(random.uniform(0.5, 5.0), 2)
    
    if firebase_enabled:
        user = users_ref.child(user_id).get()
        if user:
            new_balance = user['balance'] + commission
            users_ref.child(user_id).update({'balance': new_balance})
            transactions_ref.push({
                "user_id": user_id,
                "product_link": product_link,
                "amount": commission,
                "date": datetime.now().isoformat(),
                "status": "earned"
            })
            return jsonify({"message": f"₦{commission} commission earned", "commission": commission})
        else:
            return jsonify({"error": "User not found"}), 404
    else:
        if user_id in database['users']:
            database['users'][user_id]['balance'] += commission
            database['transactions'].append({
                "user_id": user_id,
                "product_link": product_link,
                "amount": commission,
                "date": datetime.now().isoformat(),
                "status": "earned"
            })
            return jsonify({"message": f"₦{commission} commission earned", "commission": commission})
        else:
            return jsonify({"error": "User not found"}), 404

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

@app.route('/api/generate_ad', methods=['POST'])
def generate_ad():
    """Generate AI-powered ad text for a product"""
    data = request.get_json()
    product_name = data.get('product_name')
    product_price = data.get('product_price')
    link = data.get('link')
    
    if not all([product_name, product_price, link]):
        return jsonify({"error": "product_name, product_price, and link are required"}), 400
    
    try:
        ad_text = generate_ad_text(product_name, product_price, link)
        return jsonify({
            "product_name": product_name,
            "product_price": product_price,
            "link": link,
            "ad_text": ad_text
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Failed to generate ad text"}), 500

@app.route('/auto_generate_ads', methods=['POST'])
def auto_generate_ads():
    """Fully automated: Scrape products, generate AI ads, and save to Firebase"""
    data = request.get_json()
    affiliate_url = data.get('affiliate_url')
    
    if not affiliate_url:
        return jsonify({"error": "affiliate_url is required"}), 400
    
    try:
        # Step 1: Fetch new products from affiliate URL
        products = fetch_affiliate_products(affiliate_url)
        
        if not products:
            return jsonify({"message": "No products found at the provided URL", "count": 0})
        
        # Step 2: Generate ads and push to Firebase
        successful_ads = 0
        for p in products:
            try:
                # Generate AI-powered ad text
                ad_text = generate_ad_text(p["name"], p["price"], p["link"])
                
                # Save to Firebase or in-memory database
                product_data = {
                    "name": p["name"],
                    "price": p["price"],
                    "link": p["link"],
                    "ad_text": ad_text,
                    "created_at": datetime.now().isoformat()
                }
                
                if firebase_enabled:
                    db.reference("marketplace").push(product_data)
                else:
                    # Fallback: store in memory
                    if "marketplace" not in database:
                        database["marketplace"] = []
                    database["marketplace"].append(product_data)
                
                successful_ads += 1
            except Exception as e:
                print(f"Error processing product {p.get('name')}: {e}")
                continue
        
        return jsonify({
            "message": "AI ads created successfully",
            "total_products": len(products),
            "successful_ads": successful_ads,
            "firebase_enabled": firebase_enabled
        })
    
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Error in auto_generate_ads: {e}")
        return jsonify({"error": "Failed to generate ads automatically"}), 500

@app.after_request
def add_security_headers(response):
    """Add security headers to all responses"""
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
