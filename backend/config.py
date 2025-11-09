"""
Configuration for Flask application
Supports both SQLite (development) and PostgreSQL (production)
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration"""
    
    # Flask
    SECRET_KEY = os.getenv('FLASK_SECRET', 'dev_secret_lonaat_2025_change_in_production')
    
    # Database
    # Use DATABASE_URL (PostgreSQL) if available, otherwise SQLite
    DATABASE_URL = os.getenv('DATABASE_URL')
    if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
        # Fix for SQLAlchemy 1.4+ which requires postgresql:// instead of postgres://
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    
    SQLALCHEMY_DATABASE_URI = DATABASE_URL or 'sqlite:///app.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Flutterwave
    FLUTTERWAVE_SECRET = os.getenv('FLUTTERWAVE_SECRET')
    FLUTTERWAVE_PUBLIC = os.getenv('FLUTTERWAVE_PUBLIC')
    
    # Application
    BASE_URL = os.getenv('BASE_URL', 'http://localhost:5000')
    ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@example.com')
    
    # Legacy admin credentials
    ADMIN_USERNAME = os.getenv('ADMIN_USERNAME')
    ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD')
