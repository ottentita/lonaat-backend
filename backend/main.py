from flask import Flask, render_template, request, jsonify, session, Response, send_file, redirect
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
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
import base64
import hashlib
from typing import Dict, List, Any, Union, cast
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
from affiliate_scraper import fetch_affiliate_products, generate_product_description, analyze_product_with_ai, generate_ad_text
from affiliate_manager import get_affiliate_manager, sync_affiliate_products
from dotenv import load_dotenv
from config import Config
from models import db as sqlalchemy_db, User, Transaction, Plan, AdBoost, CreditWallet, SocialConnection, BankAccount, WithdrawalRequest, AuditLog, CreditPackage, PaymentRequest, Commission
from models_network_connection import NetworkConnection
from auth import auth_bp
from api_routes import api_bp
from products_routes import products_bp
from wallet_routes import wallet_bp
from ads_routes import ads_bp
from affiliate_routes import affiliate_bp
from leads_routes import leads_bp
from routes.social import social_bp
from routes.networks import networks_bp
from routes.bank import bank_bp
from deployment_status import status_bp
from db_guard import set_db_initialized
from production_api import production_bp
from apscheduler.schedulers.background import BackgroundScheduler
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

# Detect environment - allow deployment without crashing, but warn about missing features
# This allows initial deployment to succeed while prompting for proper configuration
IS_PRODUCTION = bool(os.getenv('RENDER') or os.getenv('RAILWAY') or os.getenv('FLY_APP_NAME'))
logger.info(f"🔍 Environment: {'PRODUCTION' if IS_PRODUCTION else 'DEVELOPMENT'}")

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Initialize SQLAlchemy
sqlalchemy_db.init_app(app)

# Initialize Flask-Migrate
migrate = Migrate(app, sqlalchemy_db)

# Initialize JWT Manager
jwt = JWTManager(app)

# JWT Error Handlers
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    logger.warning(f"⚠️ JWT EXPIRED: {jwt_payload}")
    return jsonify({'error': 'Token has expired', 'code': 'token_expired'}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    logger.warning(f"⚠️ INVALID JWT: {error}")
    return jsonify({'error': 'Invalid token', 'code': 'invalid_token'}), 422

@jwt.unauthorized_loader
def unauthorized_callback(error):
    logger.warning(f"⚠️ NO JWT PROVIDED: {error}")
    return jsonify({'error': 'Missing authorization token', 'code': 'no_token'}), 422

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(api_bp)
app.register_blueprint(products_bp)
app.register_blueprint(wallet_bp)
app.register_blueprint(ads_bp)
app.register_blueprint(affiliate_bp)
app.register_blueprint(leads_bp)
app.register_blueprint(social_bp)
app.register_blueprint(networks_bp)
app.register_blueprint(bank_bp)
app.register_blueprint(status_bp)
app.register_blueprint(production_bp)

# Create database tables
# FAIL FAST in production if database unavailable to prevent runtime crashes
try:
    with app.app_context():
        # Test database connection first
        sqlalchemy_db.create_all()
        logger.info("✅ SQLAlchemy database initialized successfully")
        set_db_initialized(True)
        
        # Create admin user if it doesn't exist
        admin_email = app.config.get('ADMIN_EMAIL', 'admin@example.com')
        admin_user = User.query.filter_by(email=admin_email).first()
        
        if not admin_user and app.config.get('ADMIN_PASSWORD'):
            admin_user = User(
                name='Admin',
                email=admin_email,
                role='admin',
                verified=True
            )
            admin_user.set_password(app.config.get('ADMIN_PASSWORD', 'admin123'))
            sqlalchemy_db.session.add(admin_user)
            sqlalchemy_db.session.commit()
            logger.info(f"✅ Admin user created: {admin_email}")
        elif not admin_user:
            logger.warning("⚠️  Admin user NOT created - ADMIN_PASSWORD not set")
        
        # Create default subscription plans
        plans_data = [
            {'name': 'free', 'price': 0, 'max_products': 5, 'max_ad_boosts': 1},
            {'name': 'pro', 'price': 5000, 'max_products': 50, 'max_ad_boosts': 10},
            {'name': 'business', 'price': 15000, 'max_products': None, 'max_ad_boosts': None}
        ]
        
        for plan_data in plans_data:
            existing_plan = Plan.query.filter_by(name=plan_data['name']).first()
            if not existing_plan:
                plan = Plan(**plan_data)
                sqlalchemy_db.session.add(plan)
        
        try:
            sqlalchemy_db.session.commit()
            logger.info("✅ Default subscription plans initialized")
        except Exception as e:
            sqlalchemy_db.session.rollback()
            logger.warning(f"Plans initialization: {e}")
            
except Exception as e:
    logger.error("=" * 80)
    logger.error("❌ DATABASE INITIALIZATION FAILED")
    logger.error(f"❌ Error: {e}")
    logger.error(f"❌ Database URI: {app.config.get('SQLALCHEMY_DATABASE_URI')}")
    logger.error("=" * 80)
    
    if IS_PRODUCTION:
        # FAIL FAST in production - database is critical for core features
        logger.error("❌ FATAL: Cannot start in production without working database!")
        logger.error("❌ Database is required for user accounts, transactions, and bank transfers")
        logger.error("❌ ")
        logger.error("❌ To fix:")
        logger.error("❌ 1. Create PostgreSQL database in your deployment dashboard")
        logger.error("❌ 2. Copy the External Database URL (starts with postgresql://)")
        logger.error("❌ 3. Add as environment variable: DATABASE_URL=<your-url>")
        logger.error("❌ 4. Redeploy")
        logger.error("=" * 80)
        raise RuntimeError(f"Database connection failed in production: {e}")
    else:
        # Development - allow startup with warnings
        logger.warning("⚠️  Database initialization failed in development mode")
        logger.warning("⚠️  App will start but database features won't work")
        logger.warning("⚠️  Visit http://localhost:8000/api/deployment/status for guidance")
        logger.error("=" * 80)
        set_db_initialized(False)

# Flask secret key - REQUIRED for session management
flask_secret = os.getenv("FLASK_SECRET")
if not flask_secret:
    print("⚠️  WARNING: FLASK_SECRET not set. Using development secret (NOT FOR PRODUCTION)")
    flask_secret = "dev_secret_lonaat_2025_change_in_production"
app.secret_key = flask_secret

# Initialize affiliate network manager
affiliate_manager = get_affiliate_manager()

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

# --------- Encryption helpers for sensitive data ----------
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    if IS_PRODUCTION:
        # FAIL FAST in production - encryption key is MANDATORY to prevent data loss
        logger.error("=" * 80)
        logger.error("❌ FATAL: ENCRYPTION_KEY is REQUIRED for production deployment!")
        logger.error("❌ Without a persistent key, encrypted data (bank accounts) will be")
        logger.error("❌ permanently LOST on every restart/redeploy!")
        logger.error("❌ ")
        logger.error("❌ Generate a key: python -c \"import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())\"")
        logger.error("❌ Add to deployment secrets: ENCRYPTION_KEY=<your-generated-key>")
        logger.error("=" * 80)
        raise RuntimeError("ENCRYPTION_KEY is mandatory for production - prevents data loss")
    else:
        # Development only - auto-generate with warning
        logger.warning("⚠️  ENCRYPTION_KEY not set - auto-generating for development only")
        logger.warning("⚠️  Encrypted data will not persist across restarts")
        ENCRYPTION_KEY = base64.urlsafe_b64encode(os.urandom(32)).decode()

def encrypt_sensitive_data(data: dict) -> dict:
    """
    Encrypt sensitive dictionary data using AES-256-GCM.
    Returns encrypted object with ciphertext, IV, salt, and KDF parameters.
    """
    try:
        # Generate salt and IV
        salt = os.urandom(16)
        iv = os.urandom(12)
        
        # Derive encryption key using PBKDF2
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=200000,
            backend=default_backend()
        )
        key = kdf.derive(ENCRYPTION_KEY.encode())
        
        # Encrypt data
        cipher = Cipher(
            algorithms.AES(key),
            modes.GCM(iv),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()
        
        plaintext = json.dumps(data).encode()
        ciphertext = encryptor.update(plaintext) + encryptor.finalize()
        
        return {
            "ciphertext": base64.b64encode(ciphertext).decode(),
            "iv": base64.b64encode(iv).decode(),
            "salt": base64.b64encode(salt).decode(),
            "tag": base64.b64encode(encryptor.tag).decode(),
            "kdf": {
                "algorithm": "PBKDF2",
                "hash": "SHA256",
                "iterations": 200000
            }
        }
    except Exception as e:
        print(f"⚠️  Encryption failed: {type(e).__name__}")
        raise

def decrypt_sensitive_data(encrypted: dict) -> dict:
    """
    Decrypt sensitive data encrypted with encrypt_sensitive_data.
    Returns original dictionary.
    """
    try:
        # Decode components
        ciphertext = base64.b64decode(encrypted["ciphertext"])
        iv = base64.b64decode(encrypted["iv"])
        salt = base64.b64decode(encrypted["salt"])
        tag = base64.b64decode(encrypted["tag"])
        
        # Derive decryption key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=encrypted["kdf"]["iterations"],
            backend=default_backend()
        )
        key = kdf.derive(ENCRYPTION_KEY.encode())
        
        # Decrypt data
        cipher = Cipher(
            algorithms.AES(key),
            modes.GCM(iv, tag),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        
        plaintext = decryptor.update(ciphertext) + decryptor.finalize()
        return json.loads(plaintext.decode())
    except Exception as e:
        print(f"⚠️  Decryption failed: {type(e).__name__}")
        raise

def write_audit(action: str, actor: str = "system", meta: Any = None) -> None:
    if firebase_enabled and audit_ref is not None:
        try:
            entry = {
                "action": action,
                "actor": actor,
                "meta": meta or {},
                "timestamp": now_iso()
            }
            audit_ref.push(entry)  # type: ignore
        except Exception as e:
            print(f"⚠️  Audit log write failed (Firebase DB may not exist): {e}")

def require_admin():
    return session.get("admin_logged_in", False)

# --------- SPA Frontend Serving ----------
# Serve React app for all non-API routes (development mode uses Vite proxy)
# In production, this would serve from frontend/dist
# OLD TEMPLATE ROUTES ARCHIVED TO templates_legacy/

@app.route('/favicon.ico')
def favicon():
    return '', 204

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
        write_audit("admin_login", actor=str(username))
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

    transactions = transactions_ref.get() or {}  # type: ignore
    total_earned = 0.0
    total_paid = 0.0
    total_pending = 0.0
    by_day = {}

    for tid, t in transactions.items():  # type: ignore
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

    transactions = transactions_ref.get() or {}  # type: ignore
    items = []
    for tid, t in transactions.items():  # type: ignore
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

    payout_node = payouts_ref.child(payout_id).get()  # type: ignore
    if not payout_node:
        return jsonify({"error":"payout not found"}), 404

    # update status
    payouts_ref.child(payout_id).update({"status":"paid", "paid_at": now_iso(), "paid_by": admin})
    # create transaction record for historical record if not exists
    transactions_ref.push({  # type: ignore
        "user_id": user_id,
        "amount": float(payout_node.get("amount", 0)),  # type: ignore
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

    transactions = transactions_ref.get() or {}  # type: ignore
    rows = []
    for tid, t in transactions.items():  # type: ignore
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
    """Register a payout request with encrypted bank details"""
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

    # Encrypt sensitive bank details
    sensitive_data = {
        "bank_name": bank_name,
        "account_number": account_number,
        "account_name": account_name
    }
    
    try:
        encrypted_data = encrypt_sensitive_data(sensitive_data)
    except Exception as e:
        return jsonify({"error": "Encryption failed"}), 500

    # Store payout request with encrypted bank details
    payout = {
        "user_id": user_id,
        "amount": amount,
        "encrypted": encrypted_data,
        "status": "requested",
        "request_date": now_iso()
    }
    new_id = payouts_ref.push(payout).key  # type: ignore
    write_audit("register_payout", actor=str(user_id), meta={"payout_id":new_id, "amount":amount})
    return jsonify({"message":"payout requested", "payout_id": new_id})

@app.route('/get_payouts', methods=['GET'])
def get_payouts():
    """Get all payout requests with decrypted bank details (admin only)"""
    if not require_admin():
        return jsonify({"error":"unauthorized"}), 403
    
    if not firebase_enabled or payouts_ref is None:
        return jsonify({"error": "Firebase not enabled"}), 500
    
    payouts = payouts_ref.get() or {}  # type: ignore
    
    # Decrypt sensitive data for admin viewing
    decrypted_payouts = {}
    for payout_id, payout_data in payouts.items():  # type: ignore
        if "encrypted" in payout_data:
            try:
                # Decrypt bank details
                decrypted_bank = decrypt_sensitive_data(payout_data["encrypted"])
                # Return payout with decrypted details
                decrypted_payouts[payout_id] = {
                    "user_id": payout_data.get("user_id"),
                    "amount": payout_data.get("amount"),
                    "bank_name": decrypted_bank.get("bank_name"),
                    "account_number": decrypted_bank.get("account_number"),
                    "account_name": decrypted_bank.get("account_name"),
                    "status": payout_data.get("status"),
                    "request_date": payout_data.get("request_date"),
                    "paid_date": payout_data.get("paid_date")
                }
            except Exception as e:
                print(f"⚠️  Failed to decrypt payout {payout_id}: {type(e).__name__}")
                # Return payout with decryption error flag
                decrypted_payouts[payout_id] = {
                    "user_id": payout_data.get("user_id"),
                    "amount": payout_data.get("amount"),
                    "status": payout_data.get("status"),
                    "request_date": payout_data.get("request_date"),
                    "paid_date": payout_data.get("paid_date"),
                    "decryption_error": True,
                    "bank_details": "ENCRYPTED - Unable to decrypt"
                }
        else:
            # Legacy payout without encryption (backward compatibility)
            # These are old payouts created before encryption was implemented
            decrypted_payouts[payout_id] = {
                "user_id": payout_data.get("user_id"),
                "amount": payout_data.get("amount"),
                "bank_name": payout_data.get("bank_name", "N/A"),
                "account_number": payout_data.get("account_number", "N/A"),
                "account_name": payout_data.get("account_name", "N/A"),
                "status": payout_data.get("status"),
                "request_date": payout_data.get("request_date"),
                "paid_date": payout_data.get("paid_date"),
                "legacy_unencrypted": True
            }
    
    return jsonify(decrypted_payouts)

@app.route('/audit_log', methods=['GET'])
def audit_log():
    """Get audit log (admin only)"""
    if not require_admin():
        return jsonify({"error":"unauthorized"}), 403
    
    if not firebase_enabled or audit_ref is None:
        return jsonify({"error": "Firebase not enabled"}), 500
    
    return jsonify(audit_ref.get() or {})

@app.route('/get_affiliate_stats/<user_id>', methods=['GET'])
def get_affiliate_stats(user_id):
    """Get affiliate stats for Turbo Mode dashboard"""
    if firebase_enabled and users_ref is not None:
        user_data = users_ref.child(user_id).get()  # type: ignore
        if user_data:
            settings = user_data.get("affiliate_settings", {})  # type: ignore
            
            # Count active platforms (networks)
            active_platforms = len(affiliate_manager.networks)
            
            # Calculate traffic boost based on user's product count
            transactions = transactions_ref.get() or {} if transactions_ref else {}  # type: ignore
            user_transactions = [t for t in transactions.values() if t.get("user_id") == user_id]  # type: ignore
            traffic_boost = min(len(user_transactions) * 5, 100)
            
            return jsonify({
                "product_limit": "∞" if settings.get("ai_enabled", False) else "100",
                "traffic_boost": traffic_boost,
                "content_speed": "AI Turbo" if settings.get("ai_enabled", False) else "Standard",
                "active_platforms": active_platforms
            })
    
    # Default stats for new/demo users
    return jsonify({
        "product_limit": "100",
        "traffic_boost": 0,
        "content_speed": "Standard",
        "active_platforms": 5
    })

@app.route('/get_affiliate_settings/<user_id>', methods=['GET'])
def get_affiliate_settings(user_id):
    """Get affiliate settings for Turbo Mode dashboard"""
    if firebase_enabled and users_ref is not None:
        user_data = users_ref.child(user_id).get()  # type: ignore
        if user_data and "affiliate_settings" in user_data:
            return jsonify(user_data["affiliate_settings"])  # type: ignore
    
    # Default settings
    return jsonify({
        "ai_enabled": False,
        "auto_schedule": False
    })

@app.route('/update_affiliate_setting', methods=['POST'])
def update_affiliate_setting():
    """Update affiliate settings for Turbo Mode dashboard"""
    data = request.get_json() or {}
    user_id = data.get("user_id")
    settings = data.get("settings", {})
    
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    
    if firebase_enabled and users_ref is not None:
        # Get or create user
        user_data = users_ref.child(user_id).get() or {}  # type: ignore
        
        # Update settings
        user_data["affiliate_settings"] = settings  # type: ignore
        user_data["last_updated"] = now_iso()  # type: ignore
        
        users_ref.child(user_id).set(user_data)
        write_audit("update_affiliate_setting", actor=str(user_id), meta={"settings": settings})
        
        return jsonify({"message": "Settings updated successfully"})
    else:
        # Fallback for in-memory database
        if user_id not in database["users"]:
            database["users"][user_id] = {"user_id": user_id, "balance": 0}
        
        database["users"][user_id]["affiliate_settings"] = settings
        return jsonify({"message": "Settings updated successfully (in-memory)"})

@app.route('/transfer_products', methods=['POST'])
def transfer_products():
    """Transfer products from all affiliate networks to marketplace"""
    data = request.get_json() or {}
    user_id = data.get("user_id")
    
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    
    try:
        total_transferred = 0
        
        # Sync products from all networks
        for network_name in affiliate_manager.networks.keys():
            try:
                products = affiliate_manager.fetch_from_network(network_name, max_results=20)
                
                if firebase_enabled and marketplace_ref is not None:
                    for product in products:
                        # Add to marketplace with AI-generated description if enabled
                        product_data = {
                            "name": product.get("name", ""),
                            "price": product.get("price", ""),
                            "link": product.get("link", ""),
                            "network": network_name,
                            "added_by": user_id,
                            "added_date": now_iso()
                        }
                        
                        # Check if AI is enabled for this user
                        user_data = users_ref.child(user_id).get() if users_ref else {}  # type: ignore
                        settings = user_data.get("affiliate_settings", {}) if user_data else {}  # type: ignore
                        
                        if settings.get("ai_enabled", False):
                            try:
                                # Generate AI description
                                ai_description = generate_product_description(product.get("name", ""))
                                product_data["ai_description"] = ai_description
                            except Exception as e:
                                print(f"AI generation failed for product: {e}")
                        
                        marketplace_ref.push(product_data)  # type: ignore
                        total_transferred += 1
                else:
                    # In-memory fallback
                    database["marketplace"].extend(products)
                    total_transferred += len(products)
                    
            except Exception as e:
                print(f"Failed to sync {network_name}: {e}")
                continue
        
        write_audit("transfer_products", actor=str(user_id), meta={"count": total_transferred})
        
        return jsonify({
            "message": f"✅ Transferred {total_transferred} products from {len(affiliate_manager.networks)} networks",
            "count": total_transferred
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.after_request
def add_security_headers(response):
    """Add security headers to all responses"""
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    # Updated CSP to allow inline styles/scripts and CDN resources for TailwindCSS/AlpineJS
    response.headers["Content-Security-Policy"] = "default-src 'self'; connect-src 'self' https://lonaat-backend.onrender.com; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com"
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

# --------- AdBoost Expiry Scheduler ---------
def expire_old_ad_boosts():
    """Background task to expire AdBoost campaigns after 24 hours"""
    with app.app_context():
        try:
            expired_campaigns = AdBoost.query.filter(
                AdBoost.status == 'active',
                AdBoost.expires_at <= datetime.utcnow()
            ).all()
            
            for campaign in expired_campaigns:
                campaign.status = 'expired'
            
            if expired_campaigns:
                sqlalchemy_db.session.commit()
                logger.info(f"Expired {len(expired_campaigns)} AdBoost campaigns")
        except Exception as e:
            logger.error(f"Expire ad boosts error: {e}")
            sqlalchemy_db.session.rollback()

# Initialize APScheduler
scheduler = BackgroundScheduler()
scheduler.add_job(func=expire_old_ad_boosts, trigger="interval", minutes=5)  # Run every 5 minutes
scheduler.start()
logger.info("✅ APScheduler started for AdBoost expiry")

# Shutdown scheduler when app stops
import atexit
atexit.register(lambda: scheduler.shutdown())

if __name__ == '__main__':
    # Use PORT environment variable for Render deployment, fallback to 5000 for local
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
