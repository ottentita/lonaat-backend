"""
Authentication routes and JWT token management
Production-ready with email verification and password reset
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, create_refresh_token
from models import db, User, EmailVerificationToken, PasswordResetToken, AdminAudit
from email_service import send_welcome_email, send_verification_email, send_password_reset_email
from datetime import datetime, timedelta
import re
import secrets
import os
import json

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def is_admin_user(user_id):
    """
    Check if a user is an admin.
    Admin users bypass all subscription limits and payment checks.
    Returns True if user.is_admin is True in database.
    """
    user = User.query.get(user_id)
    if not user:
        return False
    
    # Check database is_admin flag (set automatically on login for ADMIN_EMAIL)
    return user.is_admin == True


def check_user_blocked(user_id):
    """
    Check if a user account is blocked.
    Returns (is_blocked: bool, error_message: str or None)
    
    If blocked_until has passed, automatically unblocks the user.
    """
    user = User.query.get(user_id)
    if not user:
        return False, None
    
    # Check if user is blocked
    if not user.is_blocked:
        return False, None
    
    # Check if block has expired
    if user.blocked_until and user.blocked_until < datetime.utcnow():
        # Auto-unblock expired blocks
        user.is_blocked = False
        user.blocked_until = None
        user.block_reason = None
        db.session.commit()
        return False, None
    
    # User is still blocked
    block_msg = user.block_reason or "Account temporarily suspended"
    if user.blocked_until:
        block_msg += f" until {user.blocked_until.strftime('%Y-%m-%d %H:%M')} UTC"
    
    return True, block_msg


def can_add_products(user_id, count=1):
    """
    Check if user can add more products.
    Admin users have unlimited product imports (bypass all limits).
    Regular users are limited by their subscription plan's max_products.
    
    Returns: (can_add: bool, error_message: str or None, current_count: int, max_allowed: int or None)
    """
    from models import Product, Subscription, Plan
    
    user = User.query.get(user_id)
    if not user:
        return False, "User not found", 0, 0
    
    # Admin bypass: unlimited products
    if user.is_admin:
        current_count = Product.query.filter_by(user_id=user_id).count()
        return True, None, current_count, None  # None = unlimited
    
    # Get user's current product count
    current_count = Product.query.filter_by(user_id=user_id).count()
    
    # Get user's active subscription
    active_subscription = Subscription.query.filter_by(
        user_id=user_id,
        status='active'
    ).first()
    
    # Default to free plan if no subscription
    if not active_subscription:
        free_plan = Plan.query.filter_by(name='free').first()
        max_products = free_plan.max_products if free_plan else 5  # Default to 5
    else:
        plan = Plan.query.get(active_subscription.plan_id)
        max_products = plan.max_products if plan else 5
    
    # None means unlimited (business plan)
    if max_products is None:
        return True, None, current_count, None
    
    # Check if user would exceed limit
    if current_count + count > max_products:
        return False, f"Product limit reached. Your plan allows {max_products} products. You currently have {current_count}. Upgrade to add more.", current_count, max_products
    
    return True, None, current_count, max_products


def get_user_or_none(user_id):
    """Get user by ID, return None if not found"""
    return User.query.get(user_id)


def log_admin_action(admin_id, action, target_user_id=None, details=None, ip_address=None):
    """
    Log admin action to audit table
    """
    try:
        audit = AdminAudit(
            admin_id=admin_id,
            action=action,
            target_user_id=target_user_id,
            details=json.dumps(details) if details else None,
            ip_address=ip_address
        )
        db.session.add(audit)
        db.session.commit()
    except Exception as e:
        current_app.logger.error(f"Admin audit log error: {e}")
        db.session.rollback()


def is_valid_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def is_valid_password(password):
    """Validate password strength (min 8 characters)"""
    return len(password) >= 8


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register a new user
    
    Request body:
    {
        "name": "John Doe",
        "email": "john@example.com",
        "password": "securepassword",
        "referred_by": "ABC12345" (optional)
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        referred_by = data.get('referred_by', '').strip()
        
        if not name:
            return jsonify({'error': 'Name is required'}), 400
        
        if not email or not is_valid_email(email):
            return jsonify({'error': 'Valid email is required'}), 400
        
        if not password or not is_valid_password(password):
            return jsonify({'error': 'Password must be at least 8 characters'}), 400
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 409
        
        # Validate referral code if provided
        referrer = None
        if referred_by:
            referrer = User.query.filter_by(referral_code=referred_by).first()
            if not referrer:
                return jsonify({'error': 'Invalid referral code'}), 400
        
        # Create new user
        user = User(
            name=name,
            email=email,
            role='user',
            referred_by=referred_by if referrer else None
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        # Send welcome email
        send_welcome_email(user.email, user.name)
        
        # Generate tokens (identity must be string)
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        return jsonify({
            'message': 'User registered successfully',
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Registration error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login user and return JWT token
    
    Request body:
    {
        "email": "john@example.com",
        "password": "securepassword"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Find user
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Check if user is not active
        if not user.is_active:
            return jsonify({'error': 'Account has been deactivated'}), 403
        
        # Auto-set admin flag if email matches ADMIN_EMAIL
        admin_email = os.getenv('ADMIN_EMAIL', 'admin@lonaat.com')
        if email == admin_email.lower():
            if not user.is_admin:
                user.is_admin = True
                user.role = 'admin'
                db.session.commit()
                current_app.logger.info(f"Auto-set admin flag for {email}")
            
            # Log admin login
            log_admin_action(
                admin_id=user.id,
                action='admin_login',
                ip_address=request.remote_addr,
                details={'method': 'password'}
            )
        
        # Generate tokens (identity must be string)
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token using refresh token"""
    try:
        current_user_id = get_jwt_identity()
        access_token = create_access_token(identity=str(current_user_id))
        
        return jsonify({
            'access_token': access_token
        }), 200
        
    except Exception as e:
        print(f"Token refresh error: {str(e)}")
        return jsonify({'error': 'Token refresh failed'}), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user details"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Get current user error: {str(e)}")
        return jsonify({'error': 'Failed to get user details'}), 500


@auth_bp.route('/send-verification', methods=['POST'])
@jwt_required()
def send_verification():
    """Send email verification token to user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.verified:
            return jsonify({'message': 'Email already verified'}), 200
        
        # Generate verification token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        # Save token to database
        verification_token = EmailVerificationToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at
        )
        db.session.add(verification_token)
        db.session.commit()
        
        # Send verification email
        base_url = current_app.config.get('BASE_URL', 'http://localhost:5000')
        verification_url = f"{base_url}/verify-email?token={token}"
        send_verification_email(user.email, user.name, verification_url)
        
        return jsonify({
            'message': 'Verification email sent successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Send verification error: {str(e)}")
        return jsonify({'error': 'Failed to send verification email'}), 500


@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    """Verify email using token"""
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'error': 'Token is required'}), 400
        
        # Find token
        verification_token = EmailVerificationToken.query.filter_by(token=token).first()
        
        if not verification_token:
            return jsonify({'error': 'Invalid verification token'}), 400
        
        if verification_token.used:
            return jsonify({'error': 'Token already used'}), 400
        
        if verification_token.is_expired():
            return jsonify({'error': 'Token has expired'}), 400
        
        # Mark user as verified
        user = User.query.get(verification_token.user_id)
        user.verified = True
        verification_token.used = True
        
        db.session.commit()
        
        return jsonify({
            'message': 'Email verified successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Email verification error: {str(e)}")
        return jsonify({'error': 'Email verification failed'}), 500


@auth_bp.route('/request-password-reset', methods=['POST'])
def request_password_reset():
    """Request password reset token"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        # Always return success to prevent email enumeration
        if not user:
            return jsonify({
                'message': 'If an account exists with this email, a password reset link has been sent'
            }), 200
        
        # Generate reset token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        # Save token to database
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at
        )
        db.session.add(reset_token)
        db.session.commit()
        
        # Send reset email
        base_url = current_app.config.get('BASE_URL', 'http://localhost:5000')
        reset_url = f"{base_url}/reset-password?token={token}"
        send_password_reset_email(user.email, user.name, reset_url)
        
        return jsonify({
            'message': 'If an account exists with this email, a password reset link has been sent'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Password reset request error: {str(e)}")
        return jsonify({'error': 'Failed to process password reset request'}), 500


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password using token"""
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('password')
        
        if not token or not new_password:
            return jsonify({'error': 'Token and new password are required'}), 400
        
        if not is_valid_password(new_password):
            return jsonify({'error': 'Password must be at least 8 characters'}), 400
        
        # Find token
        reset_token = PasswordResetToken.query.filter_by(token=token).first()
        
        if not reset_token:
            return jsonify({'error': 'Invalid reset token'}), 400
        
        if reset_token.used:
            return jsonify({'error': 'Token already used'}), 400
        
        if reset_token.is_expired():
            return jsonify({'error': 'Token has expired'}), 400
        
        # Update password
        user = User.query.get(reset_token.user_id)
        user.set_password(new_password)
        reset_token.used = True
        
        db.session.commit()
        
        return jsonify({
            'message': 'Password reset successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Password reset error: {str(e)}")
        return jsonify({'error': 'Password reset failed'}), 500


@auth_bp.route('/admin-autologin', methods=['GET', 'POST'])
def admin_autologin():
    """
    Admin-only auto-login route
    Usage: /api/auth/admin-autologin?token=YOUR_SECRET_KEY
    
    Automatically logs in the admin user if token matches SECRET_KEY
    """
    try:
        # Get token from query params or JSON body
        if request.method == 'GET':
            token = request.args.get('token', '')
        else:
            data = request.get_json() or {}
            token = data.get('token', '')
        
        if not token:
            current_app.logger.warning(f"Admin autologin attempt without token from {request.remote_addr}")
            return jsonify({'error': 'Authentication failed'}), 403
        
        # Verify token matches SECRET_KEY (CRITICAL SECURITY CHECK)
        secret_key = os.getenv('SECRET_KEY')
        
        # Reject any invalid authentication WITHOUT revealing configuration state
        if not secret_key or token != secret_key:
            current_app.logger.warning(f"Failed admin autologin attempt from {request.remote_addr}")
            # Always return same error message to prevent information leakage
            return jsonify({'error': 'Authentication failed'}), 403
        
        # Get admin user by ADMIN_EMAIL
        admin_email = os.getenv('ADMIN_EMAIL', 'admin@lonaat.com')
        user = User.query.filter_by(email=admin_email).first()
        
        if not user:
            return jsonify({'error': 'Admin user not found'}), 404
        
        # Auto-set admin flag if not already set
        if not user.is_admin:
            user.is_admin = True
            user.role = 'admin'
            db.session.commit()
        
        # Check if user is active
        if not user.is_active:
            return jsonify({'error': 'Admin account is deactivated'}), 403
        
        # Log admin autologin
        log_admin_action(
            admin_id=user.id,
            action='admin_autologin',
            ip_address=request.remote_addr,
            details={'method': 'secret_token'}
        )
        
        # Generate tokens
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        return jsonify({
            'message': 'Admin autologin successful',
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token,
            'redirect': '/admin/dashboard'  # Frontend can use this
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Admin autologin error: {str(e)}")
        return jsonify({'error': 'Autologin failed'}), 500
