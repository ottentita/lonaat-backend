"""
Database Models for Lonaat Affiliate Marketing Platform
SQLAlchemy models with support for SQLite and PostgreSQL
"""

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import secrets
import string

db = SQLAlchemy()


def generate_referral_code():
    """Generate a unique 8-character referral code"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(8))


class User(db.Model):
    """User model for authentication and profile management"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='user', nullable=False)  # 'user' or 'admin'
    balance = db.Column(db.Float, default=0.0, nullable=False)
    verified = db.Column(db.Boolean, default=False, nullable=False)
    referral_code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    referred_by = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    transactions = db.relationship('Transaction', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    def __init__(self, **kwargs):
        super(User, self).__init__(**kwargs)
        if not self.referral_code:
            self.referral_code = generate_referral_code()
    
    def set_password(self, password):
        """Hash and set user password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Verify user password"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self, include_balance=True):
        """Convert user to dictionary"""
        data = {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'verified': self.verified,
            'referral_code': self.referral_code,
            'referred_by': self.referred_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_balance:
            data['balance'] = self.balance
        return data
    
    def __repr__(self):
        return f'<User {self.email}>'


class Transaction(db.Model):
    """Transaction model for commission and withdrawal tracking"""
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    type = db.Column(db.String(20), nullable=False)  # 'commission', 'withdrawal', 'bonus'
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default='completed', nullable=False)  # 'pending', 'completed', 'failed'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def to_dict(self):
        """Convert transaction to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'amount': self.amount,
            'description': self.description,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Transaction {self.type} ₦{self.amount}>'
