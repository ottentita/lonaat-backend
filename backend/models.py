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
    type = db.Column(db.String(20), nullable=False)  # 'commission', 'withdrawal', 'bonus', 'credit_purchase', 'subscription'
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default='completed', nullable=False)  # 'pending', 'completed', 'failed'
    reference = db.Column(db.String(100), nullable=True, index=True)  # Flutterwave reference
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
            'reference': self.reference,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Transaction {self.type} ₦{self.amount}>'


class Product(db.Model):
    """Affiliate product model"""
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.String(50), nullable=True)
    affiliate_link = db.Column(db.String(500), nullable=False)
    network = db.Column(db.String(50), nullable=True)  # 'clickbank', 'shareasale', etc.
    category = db.Column(db.String(100), nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    commission_rate = db.Column(db.String(50), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    clicks = db.relationship('AffiliateClick', backref='product', lazy='dynamic', cascade='all, delete-orphan')
    ad_boosts = db.relationship('AdBoost', backref='product', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert product to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'price': self.price,
            'affiliate_link': self.affiliate_link,
            'network': self.network,
            'category': self.category,
            'image_url': self.image_url,
            'commission_rate': self.commission_rate,
            'is_active': self.is_active,
            'total_clicks': self.clicks.count() if self.clicks else 0,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Product {self.name}>'


class AffiliateClick(db.Model):
    """Track affiliate link clicks"""
    __tablename__ = 'affiliate_clicks'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # User who owns the product
    ip_address = db.Column(db.String(50), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    clicked_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'user_id': self.user_id,
            'ip_address': self.ip_address,
            'clicked_at': self.clicked_at.isoformat() if self.clicked_at else None
        }
    
    def __repr__(self):
        return f'<AffiliateClick Product:{self.product_id}>'


class BankAccount(db.Model):
    """User bank account for direct bank transfers"""
    __tablename__ = 'bank_accounts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    bank_name = db.Column(db.String(100), nullable=False)
    account_name = db.Column(db.String(100), nullable=False)
    account_number = db.Column(db.String(50), nullable=False)
    bank_code = db.Column(db.String(20), nullable=True)
    is_primary = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    user = db.relationship('User', backref=db.backref('bank_accounts', lazy='dynamic'))
    
    def to_dict(self, mask_account=True):
        account_num = self.account_number
        if mask_account and len(account_num) > 4:
            account_num = account_num[-4:].rjust(len(account_num), '*')
        
        return {
            'id': self.id,
            'bank_name': self.bank_name,
            'account_name': self.account_name,
            'account_number': account_num,
            'bank_code': self.bank_code,
            'is_primary': self.is_primary,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<BankAccount {self.bank_name} - {self.account_name}>'


class WithdrawalRequest(db.Model):
    """Withdrawal request for direct bank transfers"""
    __tablename__ = 'withdrawal_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    bank_account_id = db.Column(db.Integer, db.ForeignKey('bank_accounts.id'), nullable=True)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending', nullable=False)  # 'pending', 'approved', 'rejected', 'paid'
    admin_notes = db.Column(db.Text, nullable=True)
    requested_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    user = db.relationship('User', foreign_keys=[user_id], backref='withdrawal_requests')
    bank_account = db.relationship('BankAccount', backref='withdrawals')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'amount': self.amount,
            'status': self.status,
            'bank_account': self.bank_account.to_dict() if self.bank_account else None,
            'admin_notes': self.admin_notes,
            'requested_at': self.requested_at.isoformat() if self.requested_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'reviewed_by': self.reviewed_by
        }
    
    def __repr__(self):
        return f'<WithdrawalRequest XAF {self.amount} ({self.status})>'


class AuditLog(db.Model):
    """Audit log for fraud detection"""
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    entity_type = db.Column(db.String(50), nullable=False)
    entity_id = db.Column(db.Integer, nullable=True)
    details = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(50), nullable=True)
    fraud_score = db.Column(db.Integer, default=0, nullable=False)
    flagged = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    user = db.relationship('User', backref='audit_logs')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'details': self.details,
            'ip_address': self.ip_address,
            'fraud_score': self.fraud_score,
            'flagged': self.flagged,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<AuditLog {self.action} by User {self.user_id}>'


class Notification(db.Model):
    """User notification model"""
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'info', 'success', 'warning', 'error'
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    link = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    user = db.relationship('User', backref='notifications')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'is_read': self.is_read,
            'link': self.link,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Notification {self.title}>'


class AdBoost(db.Model):
    """AdBoost campaign model"""
    __tablename__ = 'ad_boosts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False, index=True)
    boost_level = db.Column(db.Integer, default=1, nullable=False)  # 1x, 2x, 4x, 8x, 16x, 32x
    credits_spent = db.Column(db.Integer, default=0, nullable=False)
    clicks_received = db.Column(db.Integer, default=0, nullable=False)
    status = db.Column(db.String(20), default='active', nullable=False)  # 'active', 'expired', 'paused'
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)  # 24 hours from start
    
    user = db.relationship('User', backref='ad_boosts')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'product_id': self.product_id,
            'boost_level': self.boost_level,
            'credits_spent': self.credits_spent,
            'clicks_received': self.clicks_received,
            'status': self.status,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }
    
    def __repr__(self):
        return f'<AdBoost {self.boost_level}x Product:{self.product_id}>'


class Plan(db.Model):
    """Subscription plan model"""
    __tablename__ = 'plans'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # 'free', 'pro', 'business'
    price = db.Column(db.Float, nullable=False)
    duration_days = db.Column(db.Integer, default=30, nullable=False)
    features = db.Column(db.Text, nullable=True)  # JSON string
    max_products = db.Column(db.Integer, nullable=True)
    max_ad_boosts = db.Column(db.Integer, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'price': self.price,
            'duration_days': self.duration_days,
            'features': self.features,
            'max_products': self.max_products,
            'max_ad_boosts': self.max_ad_boosts,
            'is_active': self.is_active
        }
    
    def __repr__(self):
        return f'<Plan {self.name}>'


class Subscription(db.Model):
    """User subscription model"""
    __tablename__ = 'subscriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('plans.id'), nullable=False)
    status = db.Column(db.String(20), default='active', nullable=False)  # 'active', 'expired', 'cancelled'
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    auto_renew = db.Column(db.Boolean, default=False, nullable=False)
    payment_reference = db.Column(db.String(100), nullable=True)
    
    user = db.relationship('User', backref='subscriptions')
    plan = db.relationship('Plan', backref='subscriptions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'plan_id': self.plan_id,
            'plan_name': self.plan.name if self.plan else None,
            'status': self.status,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'auto_renew': self.auto_renew
        }
    
    def __repr__(self):
        return f'<Subscription User:{self.user_id} Plan:{self.plan_id}>'


class CreditWallet(db.Model):
    """AdBoost credit wallet model"""
    __tablename__ = 'credit_wallets'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False, index=True)
    credits = db.Column(db.Integer, default=0, nullable=False)
    total_purchased = db.Column(db.Integer, default=0, nullable=False)
    total_spent = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    user = db.relationship('User', backref='credit_wallet', uselist=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'credits': self.credits,
            'total_purchased': self.total_purchased,
            'total_spent': self.total_spent,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<CreditWallet User:{self.user_id} Credits:{self.credits}>'


class ReferralPayout(db.Model):
    """Referral commission payout model"""
    __tablename__ = 'referral_payouts'
    
    id = db.Column(db.Integer, primary_key=True)
    referrer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    referred_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    commission_type = db.Column(db.String(50), nullable=False)  # 'signup', 'purchase', 'subscription'
    status = db.Column(db.String(20), default='pending', nullable=False)  # 'pending', 'paid'
    transaction_id = db.Column(db.Integer, db.ForeignKey('transactions.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    paid_at = db.Column(db.DateTime, nullable=True)
    
    referrer = db.relationship('User', foreign_keys=[referrer_id], backref='referrals_given')
    referred = db.relationship('User', foreign_keys=[referred_id], backref='referrals_received')
    
    def to_dict(self):
        return {
            'id': self.id,
            'referrer_id': self.referrer_id,
            'referred_id': self.referred_id,
            'amount': self.amount,
            'commission_type': self.commission_type,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None
        }
    
    def __repr__(self):
        return f'<ReferralPayout ₦{self.amount} {self.commission_type}>'


class SocialConnection(db.Model):
    """Social media platform connection model"""
    __tablename__ = 'social_connections'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    platform = db.Column(db.String(50), nullable=False, index=True)
    platform_user_id = db.Column(db.String(255), nullable=True)
    platform_username = db.Column(db.String(255), nullable=True)
    access_token = db.Column(db.Text, nullable=False)
    refresh_token = db.Column(db.Text, nullable=True)
    token_expires_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    user = db.relationship('User', backref='social_connections')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'platform': self.platform,
            'platform_username': self.platform_username,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'token_expires_at': self.token_expires_at.isoformat() if self.token_expires_at else None
        }
    
    def __repr__(self):
        return f'<SocialConnection User:{self.user_id} Platform:{self.platform}>'
