"""
API routes for user profile and admin dashboard
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Transaction
from auth import is_admin_user
from functools import wraps
import os

api_bp = Blueprint('api', __name__, url_prefix='/api')


def admin_required(fn):
    """Decorator to require admin role"""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Use centralized admin check
        if not is_admin_user(current_user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        return fn(*args, **kwargs)
    
    return wrapper


@api_bp.route('/user/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """
    Get current user's profile
    
    Requires: JWT token in Authorization header
    Returns: User profile data
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user's recent transactions
        recent_transactions = Transaction.query.filter_by(user_id=user.id)\
            .order_by(Transaction.created_at.desc())\
            .limit(10)\
            .all()
        
        return jsonify({
            'user': user.to_dict(),
            'recent_transactions': [t.to_dict() for t in recent_transactions]
        }), 200
        
    except Exception as e:
        print(f"Profile fetch error: {str(e)}")
        return jsonify({'error': 'Failed to fetch profile'}), 500


@api_bp.route('/admin/dashboard', methods=['GET'])
@admin_required
def admin_dashboard():
    """
    ENHANCED Admin dashboard with full analytics
    
    Requires: JWT token with is_admin=true
    Returns: Complete platform statistics and analytics
    """
    try:
        from models import Product, ImportedProduct, Commission, AffiliateClick, AdBoost, CreditWallet, AdminAudit
        
        # User statistics
        total_users = User.query.count()
        total_admins = User.query.filter_by(is_admin=True).count()
        verified_users = User.query.filter_by(verified=True).count()
        active_users = User.query.filter_by(is_active=True).count()
        deactivated_users = User.query.filter_by(is_active=False).count()
        
        # Transaction statistics
        total_transactions = Transaction.query.count()
        total_commissions = db.session.query(db.func.sum(Transaction.amount))\
            .filter_by(type='commission', status='completed')\
            .scalar() or 0
        
        total_withdrawals = db.session.query(db.func.sum(Transaction.amount))\
            .filter_by(type='withdrawal', status='completed')\
            .scalar() or 0
        
        pending_withdrawals_count = Transaction.query.filter_by(
            type='withdrawal',
            status='pending'
        ).count()
        
        pending_withdrawals_amount = db.session.query(db.func.sum(Transaction.amount))\
            .filter_by(type='withdrawal', status='pending')\
            .scalar() or 0
        
        # Product statistics
        total_products = Product.query.count()
        total_imported_products = ImportedProduct.query.count()
        active_products = Product.query.filter_by(is_active=True).count()
        
        # Click statistics
        total_clicks = AffiliateClick.query.count()
        
        # Commission statistics
        total_commissions_db = Commission.query.count()
        pending_commissions = Commission.query.filter_by(status='pending').count()
        approved_commissions = Commission.query.filter_by(status='approved').count()
        paid_commissions = Commission.query.filter_by(status='paid').count()
        
        total_commission_amount = db.session.query(db.func.sum(Commission.amount))\
            .filter_by(status='paid')\
            .scalar() or 0
        
        # AdBoost statistics
        total_ad_boosts = AdBoost.query.count()
        active_ad_boosts = AdBoost.query.filter_by(status='active').count()
        
        # Credit wallet statistics
        total_credits_in_system = db.session.query(db.func.sum(CreditWallet.credits)).scalar() or 0
        total_credits_spent = db.session.query(db.func.sum(CreditWallet.total_spent)).scalar() or 0
        
        # Recent data
        recent_users = User.query.order_by(User.created_at.desc()).limit(20).all()
        recent_transactions = Transaction.query.order_by(Transaction.created_at.desc()).limit(30).all()
        recent_commissions = Commission.query.order_by(Commission.created_at.desc()).limit(20).all()
        recent_admin_actions = AdminAudit.query.order_by(AdminAudit.created_at.desc()).limit(50).all()
        
        # All users (for user management)
        all_users = User.query.order_by(User.created_at.desc()).all()
        
        # System status
        system_status = {
            'database': 'operational',
            'api': 'operational',
            'webhooks': 'operational'
        }
        
        return jsonify({
            'statistics': {
                'users': {
                    'total': total_users,
                    'admins': total_admins,
                    'verified': verified_users,
                    'active': active_users,
                    'deactivated': deactivated_users
                },
                'transactions': {
                    'total': total_transactions,
                    'total_commissions': round(total_commissions, 2),
                    'total_withdrawals': round(total_withdrawals, 2),
                    'pending_withdrawals_count': pending_withdrawals_count,
                    'pending_withdrawals_amount': round(pending_withdrawals_amount, 2)
                },
                'products': {
                    'total': total_products,
                    'imported': total_imported_products,
                    'active': active_products
                },
                'clicks': {
                    'total': total_clicks
                },
                'commissions': {
                    'total': total_commissions_db,
                    'pending': pending_commissions,
                    'approved': approved_commissions,
                    'paid': paid_commissions,
                    'total_amount': round(total_commission_amount, 2)
                },
                'ad_boosts': {
                    'total': total_ad_boosts,
                    'active': active_ad_boosts
                },
                'credits': {
                    'total_in_system': round(total_credits_in_system, 2),
                    'total_spent': round(total_credits_spent, 2)
                }
            },
            'recent_users': [user.to_dict(include_balance=True) for user in recent_users],
            'recent_transactions': [t.to_dict() for t in recent_transactions],
            'recent_commissions': [c.to_dict() for c in recent_commissions],
            'recent_admin_actions': [a.to_dict() for a in recent_admin_actions],
            'all_users': [user.to_dict(include_balance=True) for user in all_users],
            'system_status': system_status
        }), 200
        
    except Exception as e:
        print(f"Admin dashboard error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch dashboard data'}), 500


@api_bp.route('/admin/users/<int:user_id>/deactivate', methods=['POST'])
@admin_required
def deactivate_user(user_id):
    """
    Deactivate a user account
    
    Requires: JWT token with is_admin=true
    """
    try:
        from models import AdminAudit
        from auth import log_admin_action
        
        current_admin_id = int(get_jwt_identity())
        
        # Prevent admin from deactivating themselves
        if current_admin_id == user_id:
            return jsonify({'error': 'Cannot deactivate your own account'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if not user.is_active:
            return jsonify({'error': 'User is already deactivated'}), 400
        
        user.is_active = False
        db.session.commit()
        
        # Log admin action
        log_admin_action(
            admin_id=current_admin_id,
            action='deactivate_user',
            target_user_id=user_id,
            details={'user_email': user.email},
            ip_address=request.remote_addr
        )
        
        return jsonify({
            'message': f'User {user.email} deactivated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Deactivate user error: {str(e)}")
        return jsonify({'error': 'Failed to deactivate user'}), 500


@api_bp.route('/admin/users/<int:user_id>/reactivate', methods=['POST'])
@admin_required
def reactivate_user(user_id):
    """
    Reactivate a user account
    
    Requires: JWT token with is_admin=true
    """
    try:
        from models import AdminAudit
        from auth import log_admin_action
        
        current_admin_id = int(get_jwt_identity())
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.is_active:
            return jsonify({'error': 'User is already active'}), 400
        
        user.is_active = True
        db.session.commit()
        
        # Log admin action
        log_admin_action(
            admin_id=current_admin_id,
            action='reactivate_user',
            target_user_id=user_id,
            details={'user_email': user.email},
            ip_address=request.remote_addr
        )
        
        return jsonify({
            'message': f'User {user.email} reactivated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Reactivate user error: {str(e)}")
        return jsonify({'error': 'Failed to reactivate user'}), 500


@api_bp.route('/admin/users', methods=['GET'])
@admin_required
def get_all_users():
    """
    Get all users for admin management
    
    Requires: JWT token with is_admin=true
    """
    try:
        users = User.query.order_by(User.created_at.desc()).all()
        
        return jsonify({
            'users': [user.to_dict(include_balance=True) for user in users],
            'total': len(users)
        }), 200
        
    except Exception as e:
        print(f"Get all users error: {str(e)}")
        return jsonify({'error': 'Failed to fetch users'}), 500


# ============= ADMIN AI SYSTEM =============

@api_bp.route('/admin/ai/bulk-import', methods=['POST'])
@admin_required
def admin_ai_bulk_import():
    """
    Admin-only: Bulk import products from all networks with AI ad generation
    
    This is the Admin AI system - FREE and UNLIMITED for admins.
    
    Request body:
    {
        "networks": ["digistore24", "awin"],  // Optional, defaults to all
        "max_per_network": 20,                // Optional, default 20
        "generate_ads": true                  // Optional, generate AI ads
    }
    
    Returns:
    - Products imported from each network
    - AI-generated ad text for each product
    """
    from affiliate_manager import get_affiliate_manager
    from affiliate_scraper import generate_ad_text, generate_product_description
    from models import Product
    
    try:
        data = request.get_json() or {}
        networks = data.get('networks', ['digistore24', 'awin'])
        max_per_network = data.get('max_per_network', 20)
        generate_ads = data.get('generate_ads', True)
        
        admin_id = int(get_jwt_identity())
        affiliate_manager = get_affiliate_manager()
        
        results = {
            'networks_processed': [],
            'total_imported': 0,
            'products_with_ai': 0,
            'errors': []
        }
        
        for network in networks:
            try:
                # Fetch products from network
                products = affiliate_manager.fetch_from_network(network, max_results=max_per_network)
                
                if not products:
                    results['errors'].append(f"No products from {network}")
                    continue
                
                imported_count = 0
                for product_data in products:
                    # Create product record
                    product = Product(
                        user_id=admin_id,
                        name=product_data.get('name', 'Untitled'),
                        description=product_data.get('description', ''),
                        price=product_data.get('price', 'N/A'),
                        affiliate_link=product_data.get('link', product_data.get('affiliate_link', '')),
                        network=network,
                        category=product_data.get('category', ''),
                        image_url=product_data.get('image', product_data.get('image_url')),
                        commission_rate=product_data.get('commission', product_data.get('commission_rate'))
                    )
                    
                    # Generate AI description and ad text
                    if generate_ads:
                        try:
                            ai_description = generate_product_description(product_data.get('name', ''))
                            product.description = ai_description
                            results['products_with_ai'] += 1
                        except Exception as e:
                            print(f"AI generation failed for {product_data.get('name')}: {e}")
                    
                    db.session.add(product)
                    imported_count += 1
                
                results['networks_processed'].append({
                    'network': network,
                    'imported': imported_count
                })
                results['total_imported'] += imported_count
                
            except Exception as e:
                results['errors'].append(f"{network}: {str(e)}")
                continue
        
        db.session.commit()
        
        return jsonify({
            'message': f"Admin AI bulk import complete: {results['total_imported']} products",
            'results': results
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Admin AI bulk import error: {str(e)}")
        return jsonify({'error': 'Bulk import failed'}), 500


@api_bp.route('/admin/ai/generate-ads', methods=['POST'])
@admin_required
def admin_ai_generate_ads():
    """
    Admin-only: Generate AI ads for existing products
    
    Request body:
    {
        "product_ids": [1, 2, 3]  // Optional, if empty generates for all
    }
    """
    from affiliate_scraper import generate_ad_text
    from models import Product
    
    try:
        data = request.get_json() or {}
        product_ids = data.get('product_ids', [])
        
        admin_id = int(get_jwt_identity())
        
        if product_ids:
            products = Product.query.filter(Product.id.in_(product_ids)).all()
        else:
            products = Product.query.filter_by(user_id=admin_id).limit(50).all()
        
        results = {'generated': 0, 'failed': 0, 'products': []}
        
        for product in products:
            try:
                ad_text = generate_ad_text(product.name)
                results['generated'] += 1
                results['products'].append({
                    'id': product.id,
                    'name': product.name,
                    'ad_text': ad_text
                })
            except Exception as e:
                results['failed'] += 1
                print(f"Failed to generate ad for {product.name}: {e}")
        
        return jsonify({
            'message': f"Generated AI ads for {results['generated']} products",
            'results': results
        }), 200
        
    except Exception as e:
        print(f"Admin AI generate ads error: {str(e)}")
        return jsonify({'error': 'Ad generation failed'}), 500


@api_bp.route('/admin/fraud/stats', methods=['GET'])
@admin_required
def admin_fraud_stats():
    """
    Admin-only: Get fraud detection statistics
    """
    from fraud_detector import get_fraud_stats
    
    try:
        stats = get_fraud_stats()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/users/<int:user_id>/block', methods=['POST'])
@admin_required
def admin_block_user(user_id):
    """
    Admin-only: Temporarily block a user account
    
    Request body:
    {
        "reason": "Suspicious activity detected",
        "duration_hours": 24
    }
    """
    from fraud_detector import temporarily_block_account
    
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'Admin action')
        duration_hours = data.get('duration_hours', 24)
        
        result = temporarily_block_account(user_id, reason, duration_hours)
        
        if result.get('success'):
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/users/<int:user_id>/unblock', methods=['POST'])
@admin_required
def admin_unblock_user(user_id):
    """
    Admin-only: Unblock a user account
    """
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user.is_blocked = False
        user.blocked_until = None
        user.block_reason = None
        
        db.session.commit()
        
        return jsonify({
            'message': f'User {user.email} unblocked successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
