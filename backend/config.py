"""
Configuration for Flask application
Supports both SQLite (development) and PostgreSQL (production)
Production deployment ready for Render with email notifications
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration for Lonaat platform"""
    
    # Flask
    SECRET_KEY = os.getenv('FLASK_SECRET', 'dev_secret_lonaat_2025_change_in_production')
    
    # Database - PostgreSQL for production, SQLite for development fallback
    # CRITICAL: For production deployment, DATABASE_URL must be used
    # Replit development uses PGHOST=helium (internal hostname) which won't work in production
    
    # Check if we're in production deployment
    IS_PRODUCTION = bool(os.getenv('REPLIT_DEPLOYMENT'))
    
    # Get DATABASE_URL - this is the canonical connection string
    DATABASE_URL = os.getenv('DATABASE_URL')
    PGHOST = os.getenv('PGHOST')
    
    # Validate database configuration for production
    if IS_PRODUCTION:
        # In production, if DATABASE_URL contains 'helium', it's the wrong (dev) database
        if DATABASE_URL and 'helium' in DATABASE_URL:
            print("⚠️  WARNING: Development DATABASE_URL detected in production!")
            print("⚠️  Please enable Production Database in Replit Database panel")
            # Clear it so we can try to use a fallback or fail clearly
            DATABASE_URL = None
        
        # Also check if PGHOST points to internal dev hostname
        if PGHOST and 'helium' in PGHOST:
            print("⚠️  WARNING: Development PGHOST detected in production!")
            # Clear all PG* vars to prevent psycopg2 from using them
            for pg_var in ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE']:
                if pg_var in os.environ:
                    del os.environ[pg_var]
    
    # Always clear PG* vars if DATABASE_URL exists (use DATABASE_URL as single source of truth)
    if DATABASE_URL:
        for pg_var in ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE']:
            if pg_var in os.environ:
                del os.environ[pg_var]
    
    # Fix for SQLAlchemy 1.4+ which requires postgresql:// instead of postgres://
    if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    
    # Final database URI - fail with clear message if no valid database in production
    if IS_PRODUCTION and not DATABASE_URL:
        raise RuntimeError(
            "Production deployment requires a valid DATABASE_URL. "
            "Please enable Production Database in the Replit Database panel."
        )
    
    SQLALCHEMY_DATABASE_URI = DATABASE_URL or 'sqlite:///app.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
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
    
    # Security & Fraud Prevention
    MAX_WITHDRAWALS_PER_DAY = 3
    MAX_COMMISSIONS_PER_PRODUCT_PER_MIN = 5
    FRAUD_DETECTION_ENABLED = True
