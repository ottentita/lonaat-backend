"""
Configuration for Flask application
PostgreSQL database - production ready
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration for Lonaat platform"""
    
    # Flask
    SECRET_KEY = os.getenv('FLASK_SECRET', 'dev_secret_lonaat_2025_change_in_production')
    
    # Database - Docker PostgreSQL only
    DATABASE_URL = os.getenv('DATABASE_URL')
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL environment variable is required.")
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'pool_size': 10,
        'max_overflow': 20,
        'pool_timeout': 30,
        'echo': False,  # Set to True for SQL debugging
    }
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Email Configuration (SMTP - Brevo/Mailgun/SendGrid)
    EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp-relay.sendinblue.com')
    EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
    EMAIL_USER = os.getenv('EMAIL_USER')
    EMAIL_PASS = os.getenv('EMAIL_PASS')
    EMAIL_SENDER = os.getenv('EMAIL_SENDER', 'Lonaat Support <no-reply@lonaat.com>')
    EMAIL_ENABLED = bool(EMAIL_USER and EMAIL_PASS)
    
    # Application
    BASE_URL = os.getenv('BASE_URL', 'http://localhost:5000')
    ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@lonaat.com')
    
    # Admin credentials
    ADMIN_USERNAME = os.getenv('ADMIN_USERNAME')
    ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD')
    
    # Affiliate Network API Keys
    AMAZON_ACCESS_KEY = os.getenv('AMAZON_ACCESS_KEY')
    AMAZON_SECRET_KEY = os.getenv('AMAZON_SECRET_KEY')
    AMAZON_ASSOC_TAG = os.getenv('AMAZON_ASSOC_TAG')
    SHAREASALE_TOKEN = os.getenv('SHAREASALE_TOKEN')
    SHAREASALE_SECRET = os.getenv('SHAREASALE_SECRET')
    SHAREASALE_AFFILIATE_ID = os.getenv('SHAREASALE_AFFILIATE_ID')
    CJ_TOKEN = os.getenv('CJ_TOKEN')
    IMPACT_TOKEN = os.getenv('IMPACT_TOKEN')
    IMPACT_ACCOUNT_SID = os.getenv('IMPACT_ACCOUNT_SID')
    ADMITAD_TOKEN = os.getenv('ADMITAD_TOKEN')
    AFRIEX_TOKEN = os.getenv('AFRIEX_TOKEN')
    KALAWEB_API_KEY = os.getenv('KALAWEB_API_KEY')
    PAYSALE_TOKEN = os.getenv('PAYSALE_TOKEN')
    NALAREF_TOKEN = os.getenv('NALAREF_TOKEN')
    GREY_TOKEN = os.getenv('GREY_TOKEN')
    TRADETRACKER_TOKEN = os.getenv('TRADETRACKER_TOKEN')
    # Autopilot/Growth Engine Endpoint
    AUTOPILOT_ENDPOINT = os.getenv('AUTOPILOT_ENDPOINT', 'http://localhost:8000/autopilot/publish')
    
    # Security & Fraud Prevention
    MAX_WITHDRAWALS_PER_DAY = 3
    MAX_COMMISSIONS_PER_PRODUCT_PER_MIN = 5
    FRAUD_DETECTION_ENABLED = True
