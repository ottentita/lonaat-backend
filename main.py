from flask import Flask, render_template, request, jsonify, session, Response, send_file, redirect
from flask_cors import CORS
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, db
from firebase_admin.db import Reference
import os
import json
import random
import threading
import time
import csv
import io
from typing import Dict, List, Any, Union, cast
from affiliate_scraper import fetch_affiliate_products, generate_product_description, analyze_product_with_ai, generate_ad_text
from affiliate_integration import AffiliateNetworkManager, sync_affiliate_products
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Flask secret key - REQUIRED for session management
flask_secret = os.getenv("FLASK_SECRET")
if not flask_secret:
    print("⚠️  WARNING: FLASK_SECRET not set. Using development secret (NOT FOR PRODUCTION)")
    flask_secret = "dev_secret_lonaat_2025_change_in_production"
app.secret_key = flask_secret

# Initialize affiliate network manager
affiliate_manager = AffiliateNetworkManager()

# Initialize Firebase references and database with proper types
users_ref: Union[Reference, None] = None
transactions_ref: Union[Reference, None] = None
marketplace_ref: Union[Reference, None] = None
payouts_ref: Union[Reference, None] = None
audit_ref: Union[Reference, None] = None
database: Dict[str, Any] = {
    "users": {},
    "transactions": [],
    "marketplace": []
}
firebase_enabled: bool = False

# Admin credentials - REQUIRED from environment variables for security
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

if not ADMIN_USERNAME or not ADMIN_PASSWORD:
    print("⚠️  WARNING: ADMIN_USERNAME and/or ADMIN_PASSWORD not set!")
    print("⚠️  Admin login will be DISABLED. Set these environment variables to enable admin features.")
    print("⚠️  Example: ADMIN_USERNAME=myadmin ADMIN_PASSWORD=strong_secure_password")
    ADMIN_USERNAME = None
    ADMIN_PASSWORD = None

# Initialize Firebase using environment variable
firebase_creds = os.getenv('FIREBASE_SERVICE_ACCOUNT')

if firebase_creds:
    try:
        # Clean and parse JSON from environment variable
        firebase_creds = firebase_creds.strip()
        
        # If the credential is wrapped in extra quotes, remove them
        if firebase_creds.startswith('"') and firebase_creds.endswith('"'):
            firebase_creds = firebase_creds[1:-1]
        
        # Find the first '{' and last '}' to extract the actual JSON
        start_idx = firebase_creds.find('{')
        end_idx = firebase_creds.rfind('}')
        
        if start_idx != -1 and end_idx != -1:
            firebase_creds = firebase_creds[start_idx:end_idx+1]
        else:
            # If no braces found, the JSON might be missing them - add them
            if not firebase_creds.startswith('{'):
                firebase_creds = '{' + firebase_creds
            if not firebase_creds.endswith('}'):
                firebase_creds = firebase_creds + '}'
        
        # Parse JSON from environment variable
        cred_dict = json.loads(firebase_creds)
        project_id = cred_dict.get('project_id', 'unknown')
        database_url = f'https://{project_id}-default-rtdb.firebaseio.com/'
        
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred, {
            'databaseURL': database_url
        })
        firebase_enabled = True
        users_ref = db.reference('users')
        transactions_ref = db.reference('transactions')
        marketplace_ref = db.reference('marketplace')
        payouts_ref = db.reference('payouts')
        audit_ref = db.reference('audit_log')
        print(f"✅ Firebase initialized successfully! Database URL: {database_url}")
    except json.JSONDecodeError as e:
        firebase_enabled = False
        print(f"⚠️  Firebase credentials invalid (JSON parse error): {e}")
        print("⚠️  Using in-memory database. Please check your FIREBASE_SERVICE_ACCOUNT secret.")
    except Exception as e:
        firebase_enabled = False
        print(f"⚠️  Firebase initialization failed: {e}")
        print("⚠️  Using in-memory database.")
else:
    # Fallback to in-memory database for development
    firebase_enabled = False
    print("⚠️  Firebase credentials not found. Using in-memory database.")

# --------- Helper functions for commission tracking ----------
def now_iso():
    return datetime.utcnow().isoformat()

def write_audit(action, actor="system", meta=None):
    if firebase_enabled and audit_ref is not None:
        try:
            entry = {
                "action": action,
                "actor": actor,
                "meta": meta or {},
                "timestamp": now_iso()
            }
            audit_ref.push(entry)
        except Exception as e:
            print(f"⚠️  Audit log write failed (Firebase DB may not exist): {e}")

def require_admin():
    return session.get("admin_logged_in", False)

# --------- Routes ----------
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

@app.route('/affiliate')
def affiliate():
    return render_template('affiliate.html')

@app.route('/admin_login_page')
def admin_login_page():
    return render_template('admin_login.html')

@app.route('/my_commissions')
def my_commissions():
    return render_template('my_commissions.html')

@app.route('/get_users')
def get_users():
    if firebase_enabled and users_ref is not None:
        all_users = users_ref.get()
        return jsonify(all_users or {})
    else:
        return jsonify(database['users'])

@app.route('/api/admin_data')
def admin_data():
    """Get all data for admin dashboard"""
    if firebase_enabled and users_ref is not None and transactions_ref is not None and marketplace_ref is not None:
        users = users_ref.get() or {}
        transactions = transactions_ref.get() or {}
        marketplace = marketplace_ref.get() or {}
        return jsonify({
            "firebase_enabled": True,
            "users": users,
            "transactions": transactions,
            "marketplace": marketplace,
            "total_users": len(users),
            "total_transactions": len(transactions) if isinstance(transactions, dict) else 0,
            "total_products": len(marketplace) if isinstance(marketplace, dict) else 0
        })
    else:
        return jsonify({
            "firebase_enabled": False,
            "users": database.get('users', {}),
            "transactions": database.get('transactions', []),
            "marketplace": database.get('marketplace', []),
            "total_users": len(database.get('users', {})),
            "total_transactions": len(database.get('transactions', [])),
            "total_products": len(database.get('marketplace', []))
        })

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
    
    if firebase_enabled and users_ref is not None:
        users_ref.child(user_id).set(user_data)
    else:
        database['users'][user_id] = user_data
    
    return jsonify({"message": "User registered successfully"})

@app.route('/add_commission', methods=['POST'])
def add_commission():
    data = request.get_json()
    user_id = data.get('user_id')
    amount = float(data.get('amount', 0))
    
    if firebase_enabled and users_ref is not None and transactions_ref is not None:
        user = users_ref.child(user_id).get()
        if user:
            user_dict = cast(Dict[str, Any], user)
            new_balance = user_dict['balance'] + amount
            users_ref.child(user_id).update({'balance': new_balance})
            transactions_ref.push({  # type: ignore
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
    
    if firebase_enabled and users_ref is not None and transactions_ref is not None:
        user = users_ref.child(user_id).get()
        if user:
            user_dict = cast(Dict[str, Any], user)
            if user_dict['balance'] >= amount:
                new_balance = user_dict['balance'] - amount
                users_ref.child(user_id).update({'balance': new_balance})
                transactions_ref.push({  # type: ignore
                    "user_id": user_id,
                    "amount": -amount,
                    "date": datetime.now().isoformat(),
                    "status": "paid"
                })
                return jsonify({"message": f"₦{amount} withdrawal successful"})
            else:
                return jsonify({"error": "Insufficient funds"}), 400
        else:
            return jsonify({"error": "User not found"}), 400
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
    
    if firebase_enabled and users_ref is not None and transactions_ref is not None:
        user = users_ref.child(user_id).get()
        if user:
            user_dict = cast(Dict[str, Any], user)
            new_balance = user_dict['balance'] + commission
            users_ref.child(user_id).update({'balance': new_balance})
            transactions_ref.push({  # type: ignore
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
                
                if firebase_enabled and marketplace_ref is not None:
                    marketplace_ref.push(product_data)  # type: ignore
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

@app.route('/api/networks/list', methods=['GET'])
def list_networks():
    """Get list of supported affiliate networks"""
    return jsonify({
        "networks": [
            {
                "id": "amazon",
                "name": "Amazon Associates",
                "description": "1-10% commission, millions of products",
                "configured": bool(os.getenv('AMAZON_ACCESS_KEY'))
            },
            {
                "id": "shareasale",
                "name": "ShareASale",
                "description": "Varies by merchant, 1M+ merchants",
                "configured": bool(os.getenv('SHAREASALE_TOKEN'))
            },
            {
                "id": "clickbank",
                "name": "ClickBank",
                "description": "30-75% commission, digital products",
                "configured": bool(os.getenv('CLICKBANK_AFFILIATE_ID'))
            },
            {
                "id": "partnerstack",
                "name": "PartnerStack",
                "description": "Up to 30% recurring, SaaS products",
                "configured": bool(os.getenv('PARTNERSTACK_API_KEY'))
            },
            {
                "id": "digistore24",
                "name": "Digistore24",
                "description": "40-60% commission, digital products (No API key needed!)",
                "configured": True  # Always available, no API key required
            }
        ]
    })

@app.route('/api/networks/<network_name>/products', methods=['GET'])
def get_network_products(network_name):
    """Fetch products from a specific affiliate network"""
    max_results = request.args.get('max_results', 10, type=int)
    
    try:
        products = affiliate_manager.fetch_from_network(network_name, max_results=max_results)
        
        return jsonify({
            "network": network_name,
            "products": products,
            "count": len(products)
        })
    except Exception as e:
        return jsonify({"error": f"Failed to fetch from {network_name}: {str(e)}"}), 500

@app.route('/api/networks/all/products', methods=['GET'])
def get_all_network_products():
    """Fetch products from all configured networks"""
    max_per_network = request.args.get('max_per_network', 5, type=int)
    
    try:
        all_products = affiliate_manager.fetch_from_all(max_per_network=max_per_network)
        
        total_products = sum(len(products) for products in all_products.values())
        
        return jsonify({
            "networks": all_products,
            "total_products": total_products,
            "network_count": len(all_products)
        })
    except Exception as e:
        return jsonify({"error": f"Failed to fetch from networks: {str(e)}"}), 500

@app.route('/api/networks/setup', methods=['GET'])
def get_network_setup():
    """Get setup instructions for all networks"""
    instructions = affiliate_manager.get_setup_instructions()
    return jsonify({"setup_instructions": instructions})

@app.route('/test_firebase', methods=['GET'])
def test_firebase():
    """Test Firebase connection"""
    if not firebase_enabled or marketplace_ref is None:
        return jsonify({"error": "Firebase not enabled"}), 500
    
    try:
        # Try to write test data
        test_data = {"test": True, "timestamp": datetime.now().isoformat()}
        result = marketplace_ref.push(test_data)  # type: ignore
        
        # Read it back
        read_data = marketplace_ref.child(result.key).get()  # type: ignore
        
        # Clean up
        marketplace_ref.child(result.key).delete()  # type: ignore
        
        return jsonify({
            "success": True,
            "message": "Firebase connection working!",
            "test_key": result.key
        })
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        return jsonify({
            "error": str(e), 
            "type": type(e).__name__,
            "details": "The Firebase Realtime Database may not exist. Please create it in the Firebase Console.",
            "instructions": "Go to Firebase Console → Realtime Database → Create Database"
        }), 500

@app.route('/sync_affiliates', methods=['POST'])
def sync_affiliates():
    """Sync affiliate products from ClickBank and Digistore24 to Firebase"""
    data = request.get_json()
    clickbank_key = data.get("clickbank_key")
    count = sync_affiliate_products(clickbank_key)
    return jsonify({
        "message": "Affiliate products synced successfully!",
        "products_synced": count
    })

# --------- Commission Tracking & Payout Endpoints ----------
@app.route('/admin_login', methods=['POST'])
def admin_login():
    # Check if admin credentials are configured
    if not ADMIN_USERNAME or not ADMIN_PASSWORD:
        return jsonify({
            "success": False,
            "error": "Admin login is disabled. Please set ADMIN_USERNAME and ADMIN_PASSWORD environment variables."
        }), 503
    
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        session['admin_logged_in'] = True
        write_audit("admin_login", actor=username)
        return jsonify({"success": True})
    return jsonify({"success": False}), 401

@app.route('/admin_logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    return redirect('/admin_login_page')

@app.route('/get_commission_stats', methods=['GET'])
def get_commission_stats():
    """Returns KPI summary for commission tracking"""
    if not require_admin():
        return jsonify({"error": "unauthorized"}), 403

    if not firebase_enabled or transactions_ref is None:
        return jsonify({"error": "Firebase not enabled"}), 500

    transactions = transactions_ref.get() or {}
    total_earned = 0.0
    total_paid = 0.0
    total_pending = 0.0
    by_day = {}

    for tid, t in transactions.items():
        amount = float(t.get("amount", 0) or 0)
        status = t.get("status", "earned")
        date = t.get("date")
        if status in ("earned", "pending"):
            total_pending += amount if status == "pending" else 0
        if status == "earned":
            total_earned += amount
        if status in ("paid","paid_manually","payout_paid"):
            total_paid += amount

        # by day aggregation
        try:
            d = date.split("T")[0]
        except Exception:
            d = "unknown"
        by_day.setdefault(d, 0.0)
        by_day[d] += amount

    # clicks: try to read clicks node if exists
    try:
        clicks_node = db.reference("clicks").get() or []
        total_clicks = len(clicks_node) if isinstance(clicks_node, list) else sum(1 for _ in clicks_node)
    except:
        total_clicks = 0

    res = {
        "total_earned": round(total_earned, 2),
        "total_paid": round(total_paid, 2),
        "total_pending": round(total_pending, 2),
        "total_clicks": total_clicks,
        "by_day": by_day
    }
    return jsonify(res)

@app.route('/get_commissions', methods=['GET'])
def get_commissions():
    """Returns transactions with optional filters"""
    if not require_admin():
        return jsonify({"error": "unauthorized"}), 403

    if not firebase_enabled or transactions_ref is None:
        return jsonify({"error": "Firebase not enabled"}), 500

    q_status = request.args.get("status")
    q_aff = request.args.get("affiliate")
    q_product = request.args.get("product_id")
    q_from = request.args.get("from")
    q_to = request.args.get("to")
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 50))

    transactions = transactions_ref.get() or {}
    items = []
    for tid, t in transactions.items():
        t_copy = dict(t)
        t_copy["_id"] = tid
        # basic filtering
        if q_status and t_copy.get("status") != q_status:
            continue
        if q_aff and t_copy.get("user_id") != q_aff:
            continue
        if q_product and t_copy.get("product_id") != q_product:
            continue
        if q_from:
            try:
                if t_copy.get("date", "") < q_from:
                    continue
            except: pass
        if q_to:
            try:
                if t_copy.get("date", "") > q_to:
                    continue
            except: pass
        items.append(t_copy)

    # sort by date desc
    items.sort(key=lambda x: x.get("date",""), reverse=True)
    total = len(items)
    start = (page-1)*per_page
    end = start + per_page
    paged = items[start:end]

    return jsonify({"total": total, "page": page, "per_page": per_page, "items": paged})

@app.route('/get_user_commissions/<user_id>', methods=['GET'])
def get_user_commissions(user_id):
    """Return that user's transactions and balance"""
    if firebase_enabled and users_ref is not None and transactions_ref is not None:
        user_node = users_ref.child(user_id).get()
        txns = transactions_ref.order_by_child("user_id").equal_to(user_id).get() or {}
        return jsonify({"user": user_node, "transactions": txns})
    else:
        return jsonify({"user": None, "transactions": {}})

@app.route('/mark_commission_paid', methods=['POST'])
def mark_commission_paid():
    """Mark a specific commission transaction as paid"""
    if not require_admin():
        return jsonify({"error": "unauthorized"}), 403

    if not firebase_enabled or transactions_ref is None:
        return jsonify({"error": "Firebase not enabled"}), 500

    data = request.get_json() or {}
    tid = data.get("transaction_id")
    admin = data.get("admin", "admin")
    tx = transactions_ref.child(tid).get()
    if not tx:
        return jsonify({"error":"transaction not found"}), 404

    transactions_ref.child(tid).update({"status":"paid", "paid_at": now_iso(), "paid_by": admin})
    write_audit("mark_commission_paid", actor=admin, meta={"transaction_id": tid})
    return jsonify({"message":"marked paid"})

@app.route('/mark_payout_paid', methods=['POST'])
def mark_payout_paid():
    """Mark a payout request as paid"""
    if not require_admin():
        return jsonify({"error":"unauthorized"}), 403
    
    if not firebase_enabled or payouts_ref is None or transactions_ref is None:
        return jsonify({"error": "Firebase not enabled"}), 500

    data = request.get_json() or {}
    user_id = data.get("user_id")
    payout_id = data.get("payout_id")
    admin = data.get("admin","admin")

    payout_node = payouts_ref.child(payout_id).get()
    if not payout_node:
        return jsonify({"error":"payout not found"}), 404

    # update status
    payouts_ref.child(payout_id).update({"status":"paid", "paid_at": now_iso(), "paid_by": admin})
    # create transaction record for historical record if not exists
    transactions_ref.push({
        "user_id": user_id,
        "amount": float(payout_node.get("amount", 0)),
        "status": "payout_paid",
        "type": "payout",
        "date": now_iso()
    })
    write_audit("mark_payout_paid", actor=admin, meta={"payout_id": payout_id, "user_id": user_id})
    return jsonify({"message":"payout marked paid"})

@app.route('/export_commissions', methods=['GET'])
def export_commissions():
    """Export commissions to CSV"""
    if not require_admin():
        return jsonify({"error":"unauthorized"}), 403

    if not firebase_enabled or transactions_ref is None:
        return jsonify({"error": "Firebase not enabled"}), 500

    transactions = transactions_ref.get() or {}
    rows = []
    for tid, t in transactions.items():
        rows.append({
            "transaction_id": tid,
            "user_id": t.get("user_id", ""),
            "product_id": t.get("product_id", ""),
            "amount": t.get("amount", 0),
            "status": t.get("status", ""),
            "date": t.get("date", "")
        })

    # generate CSV in memory
    si = io.StringIO()
    cw = csv.DictWriter(si, fieldnames=["transaction_id","user_id","product_id","amount","status","date"])
    cw.writeheader()
    cw.writerows(rows)
    output = si.getvalue().encode('utf-8')
    filename = f"commissions_export_{int(time.time())}.csv"
    return Response(
        output,
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename={filename}"}
    )

@app.route('/sse/commissions')
def sse_commissions():
    """SSE endpoint for real-time commission updates"""
    def event_stream():
        while True:
            time.sleep(2)
            # Simple heartbeat - in production, use pub/sub for real updates
            yield f"data: {json.dumps({'message':'heartbeat','time': now_iso()})}\n\n"
    return Response(event_stream(), mimetype="text/event-stream")

@app.route('/register_payout', methods=['POST'])
def register_payout():
    """Register a payout request"""
    if not firebase_enabled or payouts_ref is None:
        return jsonify({"error": "Firebase not enabled"}), 500

    data = request.get_json() or {}
    user_id = data.get("user_id")
    amount = float(data.get("amount",0))
    bank_name = data.get("bank_name")
    account_number = data.get("account_number")
    account_name = data.get("account_name")

    if not user_id:
        return jsonify({"error":"user_id required"}), 400

    # create payout request
    payout = {
        "user_id": user_id,
        "amount": amount,
        "bank_name": bank_name,
        "account_number": account_number,
        "account_name": account_name,
        "status": "requested",
        "request_date": now_iso()
    }
    new_id = payouts_ref.push(payout).key
    write_audit("register_payout", actor=user_id, meta={"payout_id":new_id, "amount":amount})
    return jsonify({"message":"payout requested", "payout_id": new_id})

@app.route('/get_payouts', methods=['GET'])
def get_payouts():
    """Get all payout requests (admin only)"""
    if not require_admin():
        return jsonify({"error":"unauthorized"}), 403
    
    if not firebase_enabled or payouts_ref is None:
        return jsonify({"error": "Firebase not enabled"}), 500
    
    return jsonify(payouts_ref.get() or {})

@app.route('/audit_log', methods=['GET'])
def audit_log():
    """Get audit log (admin only)"""
    if not require_admin():
        return jsonify({"error":"unauthorized"}), 403
    
    if not firebase_enabled or audit_ref is None:
        return jsonify({"error": "Firebase not enabled"}), 500
    
    return jsonify(audit_ref.get() or {})

@app.after_request
def add_security_headers(response):
    """Add security headers to all responses"""
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    # Updated CSP to allow inline styles and scripts for admin dashboard
    response.headers["Content-Security-Policy"] = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

def daily_sync():
    while True:
        try:
            sync_affiliate_products("YOUR_CLICKBANK_API_KEY")
        except Exception as e:
            print("Daily sync failed:", e)
        time.sleep(86400)  # every 24 hours

threading.Thread(target=daily_sync, daemon=True).start()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
