"""
API routes for user profile and admin dashboard
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Transaction
from functools import wraps

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
        
        if user.role != 'admin':
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
    Get admin dashboard statistics
    
    Requires: JWT token with admin role
    Returns: Platform statistics
    """
    try:
        # Get statistics
        total_users = User.query.count()
        total_admins = User.query.filter_by(role='admin').count()
        verified_users = User.query.filter_by(verified=True).count()
        
        total_transactions = Transaction.query.count()
        total_commissions = db.session.query(db.func.sum(Transaction.amount))\
            .filter_by(type='commission', status='completed')\
            .scalar() or 0
        
        total_withdrawals = db.session.query(db.func.sum(Transaction.amount))\
            .filter_by(type='withdrawal', status='completed')\
            .scalar() or 0
        
        pending_withdrawals = Transaction.query.filter_by(
            type='withdrawal',
            status='pending'
        ).count()
        
        # Get recent users
        recent_users = User.query.order_by(User.created_at.desc()).limit(10).all()
        
        # Get recent transactions
        recent_transactions = Transaction.query.order_by(Transaction.created_at.desc()).limit(20).all()
        
        return jsonify({
            'statistics': {
                'total_users': total_users,
                'total_admins': total_admins,
                'verified_users': verified_users,
                'total_transactions': total_transactions,
                'total_commissions': round(total_commissions, 2),
                'total_withdrawals': round(total_withdrawals, 2),
                'pending_withdrawals': pending_withdrawals
            },
            'recent_users': [user.to_dict(include_balance=False) for user in recent_users],
            'recent_transactions': [t.to_dict() for t in recent_transactions]
        }), 200
        
    except Exception as e:
        print(f"Admin dashboard error: {str(e)}")
        return jsonify({'error': 'Failed to fetch dashboard data'}), 500
