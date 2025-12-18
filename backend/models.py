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
    is_admin = db.Column(db.Boolean, default=False, nullable=False)  # True for admin with unlimited access
    balance = db.Column(db.Float, default=0.0, nullable=False)
    verified = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)  # For deactivating users
    is_blocked = db.Column(db.Boolean, default=False, nullable=False)  # Temporarily blocked for fraud
    blocked_until = db.Column(db.DateTime, nullable=True)  # When block expires
    block_reason = db.Column(db.String(255), nullable=True)  # Reason for blocking
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
            'is_admin': self.is_admin,
            'is_active': self.is_active,
            'is_blocked': self.is_blocked,
            'blocked_until': self.blocked_until.isoformat() if self.blocked_until else None,
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
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=True, index=True)
    imported_product_id = db.Column(db.Integer, db.ForeignKey('imported_products.id'), nullable=True, index=True)
    boost_type = db.Column(db.String(50), default='manual', nullable=False)
    boost_level = db.Column(db.Integer, default=1, nullable=False)  # 1x, 2x, 4x, 8x, 16x, 32x
    credits_spent = db.Column(db.Integer, default=0, nullable=False)
    clicks_received = db.Column(db.Integer, default=0, nullable=False)
    status = db.Column(db.String(20), default='active', nullable=False)  # 'active', 'expired', 'paused'
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)  # 24 hours from start
    
    user = db.relationship('User', backref='ad_boosts')
    imported_product = db.relationship('ImportedProduct', backref='ad_boosts')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'product_id': self.product_id,
            'imported_product_id': self.imported_product_id,
            'boost_type': self.boost_type,
            'boost_level': self.boost_level,
            'credits_spent': self.credits_spent,
            'clicks_received': self.clicks_received,
            'status': self.status,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }
    
    def __repr__(self):
        return f'<AdBoost {self.boost_level}x Product:{self.product_id or self.imported_product_id}>'


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
    priority_boost = db.Column(db.Boolean, default=False, nullable=False)  # Priority ad placement
    commission_multiplier = db.Column(db.Float, default=1.0, nullable=False)  # 1.0 = 100%, 1.5 = 150% commission
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
            'priority_boost': self.priority_boost,
            'commission_multiplier': self.commission_multiplier,
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


class EmailVerificationToken(db.Model):
    """Email verification token model for user registration"""
    __tablename__ = 'email_verification_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    used = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    user = db.relationship('User', backref='email_verification_tokens')
    
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
    
    def __repr__(self):
        return f'<EmailVerificationToken User:{self.user_id}>'


class PasswordResetToken(db.Model):
    """Password reset token model for password recovery"""
    __tablename__ = 'password_reset_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    used = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    user = db.relationship('User', backref='password_reset_tokens')
    
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
    
    def __repr__(self):
        return f'<PasswordResetToken User:{self.user_id}>'


class ImportedProduct(db.Model):
    """Imported affiliate product from external networks (Digistore24, Awin)"""
    __tablename__ = 'imported_products'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    network = db.Column(db.String(50), nullable=False, index=True)  # 'digistore24' or 'awin'
    external_product_id = db.Column(db.String(255), nullable=False)
    product_name = db.Column(db.String(255), nullable=False)
    product_url = db.Column(db.String(500), nullable=False)
    product_image_url = db.Column(db.String(500), nullable=True)
    commission_info = db.Column(db.String(255), nullable=True)
    price = db.Column(db.String(50), nullable=True)
    category = db.Column(db.String(100), nullable=True)
    earn_mode = db.Column(db.String(20), default='auto', nullable=False)  # 'auto' or 'manual'
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    user = db.relationship('User', backref='imported_products')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'network': self.network,
            'external_product_id': self.external_product_id,
            'product_name': self.product_name,
            'product_url': self.product_url,
            'product_image_url': self.product_image_url,
            'commission_info': self.commission_info,
            'price': self.price,
            'category': self.category,
            'earn_mode': self.earn_mode,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<ImportedProduct {self.product_name} from {self.network}>'


class Commission(db.Model):
    """Affiliate commission tracking from webhooks"""
    __tablename__ = 'commissions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    network = db.Column(db.String(50), nullable=False, index=True)  # 'digistore24', 'awin', 'partnerstack'
    product_id = db.Column(db.Integer, nullable=True)  # Reference to Product or ImportedProduct
    campaign_id = db.Column(db.Integer, db.ForeignKey('ad_boosts.id'), nullable=True)  # Link to campaign
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending', nullable=False)  # 'pending', 'approved', 'rejected', 'paid'
    external_ref = db.Column(db.String(255), nullable=True, index=True)  # External transaction ID
    webhook_data = db.Column(db.Text, nullable=True)  # JSON data from webhook
    rejection_reason = db.Column(db.String(255), nullable=True)  # Reason if rejected
    approved_at = db.Column(db.DateTime, nullable=True)
    approved_by = db.Column(db.Integer, nullable=True)  # Admin who approved
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    paid_at = db.Column(db.DateTime, nullable=True)
    
    user = db.relationship('User', backref='commissions')
    campaign = db.relationship('AdBoost', backref='commissions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'network': self.network,
            'product_id': self.product_id,
            'campaign_id': self.campaign_id,
            'amount': self.amount,
            'status': self.status,
            'external_ref': self.external_ref,
            'rejection_reason': self.rejection_reason,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'approved_by': self.approved_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None
        }
    
    def __repr__(self):
        return f'<Commission ₦{self.amount} from {self.network} ({self.status})>'


class AdminAudit(db.Model):
    """Audit log for admin actions"""
    __tablename__ = 'admin_audit'
    
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    action = db.Column(db.String(100), nullable=False, index=True)  # 'login', 'autologin', 'deactivate_user', etc.
    target_user_id = db.Column(db.Integer, nullable=True)  # For user-specific actions
    details = db.Column(db.Text, nullable=True)  # JSON details
    ip_address = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    admin = db.relationship('User', backref='admin_actions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'admin_id': self.admin_id,
            'action': self.action,
            'target_user_id': self.target_user_id,
            'details': self.details,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<AdminAudit {self.action} by {self.admin_id}>'


class CreditPackage(db.Model):
    """Predefined credit packages for purchase"""
    __tablename__ = 'credit_packages'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # '10 Credits', '50 Credits', etc.
    credits = db.Column(db.Integer, nullable=False)  # Number of credits
    price = db.Column(db.Float, nullable=False)  # Price in XAF
    bonus_credits = db.Column(db.Integer, default=0, nullable=False)  # Bonus credits (e.g., buy 50 get 5 free)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    display_order = db.Column(db.Integer, default=0, nullable=False)  # For sorting packages
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'credits': self.credits,
            'price': self.price,
            'bonus_credits': self.bonus_credits,
            'total_credits': self.credits + self.bonus_credits,
            'price_per_credit': round(self.price / (self.credits + self.bonus_credits), 2),
            'is_active': self.is_active
        }
    
    def __repr__(self):
        return f'<CreditPackage {self.name} - {self.credits} credits for {self.price} XAF>'


class PaymentRequest(db.Model):
    """Payment request for credit purchase or subscription"""
    __tablename__ = 'payment_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    purpose = db.Column(db.String(50), nullable=False, index=True)  # 'credit_purchase' or 'subscription'
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='XAF', nullable=False)
    payment_method = db.Column(db.String(50), default='bank_transfer', nullable=False)  # 'bank_transfer' or 'stripe'
    
    # For credit purchases
    package_id = db.Column(db.Integer, db.ForeignKey('credit_packages.id'), nullable=True)
    credits_to_add = db.Column(db.Integer, nullable=True)
    
    # For subscriptions
    plan_id = db.Column(db.Integer, db.ForeignKey('plans.id'), nullable=True)
    subscription_id = db.Column(db.Integer, db.ForeignKey('subscriptions.id'), nullable=True)
    
    # Payment proof
    receipt_url = db.Column(db.String(500), nullable=True)  # Path to uploaded receipt
    receipt_filename = db.Column(db.String(255), nullable=True)
    
    # Status and approval
    status = db.Column(db.String(20), default='pending', nullable=False, index=True)  # 'pending', 'approved', 'denied'
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Admin who reviewed
    review_note = db.Column(db.Text, nullable=True)  # Admin's note
    reviewed_at = db.Column(db.DateTime, nullable=True)
    
    # Stripe payment intent (if applicable)
    stripe_payment_intent_id = db.Column(db.String(255), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='payment_requests')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])
    package = db.relationship('CreditPackage', backref='payment_requests')
    plan = db.relationship('Plan', backref='payment_requests')
    subscription = db.relationship('Subscription', backref='payment_requests')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'user_email': self.user.email if self.user else None,
            'purpose': self.purpose,
            'amount': self.amount,
            'currency': self.currency,
            'payment_method': self.payment_method,
            'package_id': self.package_id,
            'package_name': self.package.name if self.package else None,
            'credits_to_add': self.credits_to_add,
            'plan_id': self.plan_id,
            'plan_name': self.plan.name if self.plan else None,
            'subscription_id': self.subscription_id,
            'receipt_url': self.receipt_url,
            'receipt_filename': self.receipt_filename,
            'status': self.status,
            'reviewed_by': self.reviewed_by,
            'reviewer_name': self.reviewer.name if self.reviewer else None,
            'review_note': self.review_note,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<PaymentRequest {self.purpose} - {self.amount} {self.currency} ({self.status})>'


# ============= REAL ESTATE MODULE =============

class Property(db.Model):
    """Property listing model for real estate module"""
    __tablename__ = 'properties'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Property details
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    property_type = db.Column(db.String(50), nullable=False, index=True)  # 'land', 'house', 'rental', 'guest_house', 'car_rental'
    
    # Location (Cameroon only for now)
    country = db.Column(db.String(50), default='Cameroon', nullable=False)
    city = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(255), nullable=True)
    
    # Pricing
    price = db.Column(db.Float, nullable=True)  # Sale price or rental price
    currency = db.Column(db.String(10), default='XAF', nullable=False)
    price_type = db.Column(db.String(50), nullable=True)  # 'fixed', 'negotiable', 'per_day', 'per_month'
    
    # Property specs
    bedrooms = db.Column(db.Integer, nullable=True)
    bathrooms = db.Column(db.Integer, nullable=True)
    size_sqm = db.Column(db.Float, nullable=True)  # Size in square meters
    amenities = db.Column(db.Text, nullable=True)  # JSON string of amenities
    
    # Status and approval
    status = db.Column(db.String(20), default='pending', nullable=False, index=True)  # 'pending', 'approved', 'rejected', 'archived'
    is_featured = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Admin review
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    review_note = db.Column(db.Text, nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='properties')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])
    images = db.relationship('PropertyImage', backref='property', lazy='dynamic', cascade='all, delete-orphan')
    rental_details = db.relationship('RentalDetails', backref='property', uselist=False, cascade='all, delete-orphan')
    bookings = db.relationship('PropertyBooking', backref='property', lazy='dynamic', cascade='all, delete-orphan')
    ads = db.relationship('PropertyAd', backref='property', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self, include_images=True):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'owner_name': self.user.name if self.user else None,
            'title': self.title,
            'description': self.description,
            'property_type': self.property_type,
            'country': self.country,
            'city': self.city,
            'address': self.address,
            'price': self.price,
            'currency': self.currency,
            'price_type': self.price_type,
            'bedrooms': self.bedrooms,
            'bathrooms': self.bathrooms,
            'size_sqm': self.size_sqm,
            'amenities': self.amenities,
            'status': self.status,
            'is_featured': self.is_featured,
            'is_active': self.is_active,
            'review_note': self.review_note,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if include_images:
            data['images'] = [img.to_dict() for img in self.images.all()]
        if self.rental_details:
            data['rental_details'] = self.rental_details.to_dict()
        return data
    
    def __repr__(self):
        return f'<Property {self.title} ({self.property_type})>'


class PropertyImage(db.Model):
    """Property images model"""
    __tablename__ = 'property_images'
    
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.id'), nullable=False, index=True)
    image_url = db.Column(db.String(500), nullable=False)
    caption = db.Column(db.String(255), nullable=True)
    is_primary = db.Column(db.Boolean, default=False, nullable=False)
    display_order = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'image_url': self.image_url,
            'caption': self.caption,
            'is_primary': self.is_primary,
            'display_order': self.display_order,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<PropertyImage Property:{self.property_id}>'


class RentalDetails(db.Model):
    """Rental-specific details for rental properties"""
    __tablename__ = 'rental_details'
    
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.id'), unique=True, nullable=False, index=True)
    
    # Rental rates
    daily_rate = db.Column(db.Float, nullable=True)
    weekly_rate = db.Column(db.Float, nullable=True)
    monthly_rate = db.Column(db.Float, nullable=True)
    
    # Rental rules
    min_stay_days = db.Column(db.Integer, default=1, nullable=False)
    max_stay_days = db.Column(db.Integer, nullable=True)
    max_guests = db.Column(db.Integer, nullable=True)
    
    # For car rentals
    vehicle_make = db.Column(db.String(100), nullable=True)
    vehicle_model = db.Column(db.String(100), nullable=True)
    vehicle_year = db.Column(db.Integer, nullable=True)
    vehicle_type = db.Column(db.String(50), nullable=True)  # 'sedan', 'suv', 'truck', etc.
    
    # Policies
    deposit_required = db.Column(db.Float, nullable=True)
    cancellation_policy = db.Column(db.String(50), default='flexible', nullable=False)  # 'flexible', 'moderate', 'strict'
    
    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'daily_rate': self.daily_rate,
            'weekly_rate': self.weekly_rate,
            'monthly_rate': self.monthly_rate,
            'min_stay_days': self.min_stay_days,
            'max_stay_days': self.max_stay_days,
            'max_guests': self.max_guests,
            'vehicle_make': self.vehicle_make,
            'vehicle_model': self.vehicle_model,
            'vehicle_year': self.vehicle_year,
            'vehicle_type': self.vehicle_type,
            'deposit_required': self.deposit_required,
            'cancellation_policy': self.cancellation_policy
        }
    
    def __repr__(self):
        return f'<RentalDetails Property:{self.property_id}>'


class PropertyBooking(db.Model):
    """Property booking model for rentals"""
    __tablename__ = 'property_bookings'
    
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)  # Tenant
    
    # Booking dates
    check_in = db.Column(db.DateTime, nullable=False)
    check_out = db.Column(db.DateTime, nullable=False)
    
    # Guests
    guests = db.Column(db.Integer, default=1, nullable=False)
    
    # Pricing
    total_price = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='XAF', nullable=False)
    deposit_paid = db.Column(db.Float, default=0, nullable=False)
    
    # Status
    status = db.Column(db.String(20), default='pending', nullable=False, index=True)  # 'pending', 'confirmed', 'cancelled', 'completed'
    
    # Notes
    guest_notes = db.Column(db.Text, nullable=True)
    owner_notes = db.Column(db.Text, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    confirmed_at = db.Column(db.DateTime, nullable=True)
    cancelled_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    user = db.relationship('User', backref='property_bookings')
    
    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'property_title': self.property.title if self.property else None,
            'user_id': self.user_id,
            'tenant_name': self.user.name if self.user else None,
            'check_in': self.check_in.isoformat() if self.check_in else None,
            'check_out': self.check_out.isoformat() if self.check_out else None,
            'guests': self.guests,
            'total_price': self.total_price,
            'currency': self.currency,
            'deposit_paid': self.deposit_paid,
            'status': self.status,
            'guest_notes': self.guest_notes,
            'owner_notes': self.owner_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'confirmed_at': self.confirmed_at.isoformat() if self.confirmed_at else None,
            'cancelled_at': self.cancelled_at.isoformat() if self.cancelled_at else None
        }
    
    def __repr__(self):
        return f'<PropertyBooking Property:{self.property_id} ({self.status})>'


class PropertyAd(db.Model):
    """Property ad boost model for real estate listings"""
    __tablename__ = 'property_ads'
    
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Boost details
    boost_level = db.Column(db.Integer, default=1, nullable=False)  # 1x, 2x, 4x, etc.
    credits_spent = db.Column(db.Integer, default=0, nullable=False)
    
    # Performance
    views = db.Column(db.Integer, default=0, nullable=False)
    clicks = db.Column(db.Integer, default=0, nullable=False)
    inquiries = db.Column(db.Integer, default=0, nullable=False)
    
    # Status and timing
    status = db.Column(db.String(20), default='active', nullable=False, index=True)  # 'active', 'expired', 'paused'
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    
    # Relationships
    user = db.relationship('User', backref='property_ads')
    
    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'property_title': self.property.title if self.property else None,
            'user_id': self.user_id,
            'boost_level': self.boost_level,
            'credits_spent': self.credits_spent,
            'views': self.views,
            'clicks': self.clicks,
            'inquiries': self.inquiries,
            'status': self.status,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }
    
    def __repr__(self):
        return f'<PropertyAd Property:{self.property_id} {self.boost_level}x>'


# ============= AI SYSTEM TABLES =============

class AIJob(db.Model):
    """AI job tracking model"""
    __tablename__ = 'ai_jobs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    job_type = db.Column(db.String(50), nullable=False, index=True)  # 'product_boost', 'property_boost', 'ad_generation', 'commission_check'
    entity_type = db.Column(db.String(50), nullable=True)  # 'product', 'property'
    entity_id = db.Column(db.Integer, nullable=True)
    
    # Job status
    status = db.Column(db.String(20), default='pending', nullable=False, index=True)  # 'pending', 'running', 'completed', 'failed'
    result = db.Column(db.Text, nullable=True)  # JSON result
    error_message = db.Column(db.Text, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    user = db.relationship('User', backref='ai_jobs')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'job_type': self.job_type,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'status': self.status,
            'result': self.result,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
    
    def __repr__(self):
        return f'<AIJob {self.job_type} ({self.status})>'


class AISecurityFlag(db.Model):
    """AI security flag for fraud detection"""
    __tablename__ = 'ai_security_flags'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    flag_type = db.Column(db.String(50), nullable=False, index=True)  # 'click_fraud', 'duplicate_account', 'abnormal_traffic', 'suspicious_withdrawal'
    severity = db.Column(db.String(20), default='medium', nullable=False)  # 'low', 'medium', 'high', 'critical'
    description = db.Column(db.Text, nullable=True)
    evidence = db.Column(db.Text, nullable=True)  # JSON evidence data
    
    # Status
    status = db.Column(db.String(20), default='pending', nullable=False, index=True)  # 'pending', 'reviewed', 'resolved', 'action_taken'
    resolution = db.Column(db.Text, nullable=True)
    
    # Admin review
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='security_flags')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'flag_type': self.flag_type,
            'severity': self.severity,
            'description': self.description,
            'evidence': self.evidence,
            'status': self.status,
            'resolution': self.resolution,
            'reviewed_by': self.reviewed_by,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<AISecurityFlag {self.flag_type} ({self.severity})>'
