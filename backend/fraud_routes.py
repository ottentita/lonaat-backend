"""
Fraud Detection Admin API Routes
/api/admin/fraud - Get fraud statistics and flagged users
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User
from auth import is_admin_user
from fraud_detector import get_fraud_stats, get_flagged_users, temporarily_block_account
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

fraud_bp = Blueprint('fraud', __name__, url_prefix='/api/admin')


@fraud_bp.route('/fraud/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """Get fraud detection statistics for admin dashboard"""
    try:
        current_user_id = int(get_jwt_identity())
        
        if not is_admin_user(current_user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        stats = get_fraud_stats()
        
        return jsonify({
            'stats': stats
        }), 200
        
    except Exception as e:
        logger.error(f"Get fraud stats error: {e}")
        return jsonify({'error': 'Failed to fetch fraud stats'}), 500


@fraud_bp.route('/fraud/flagged-users', methods=['GET'])
@jwt_required()
def get_flagged():
    """Get list of flagged users for admin review"""
    try:
        current_user_id = int(get_jwt_identity())
        
        if not is_admin_user(current_user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        flagged_users = get_flagged_users()
        stats = get_fraud_stats()
        
        return jsonify({
            'stats': stats,
            'flagged_users': flagged_users
        }), 200
        
    except Exception as e:
        logger.error(f"Get flagged users error: {e}")
        return jsonify({'error': 'Failed to fetch flagged users'}), 500


@fraud_bp.route('/fraud/block/<int:user_id>', methods=['POST'])
@jwt_required()
def block_user(user_id):
    """Block a user account"""
    try:
        current_user_id = int(get_jwt_identity())
        
        if not is_admin_user(current_user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json() or {}
        reason = data.get('reason', 'Blocked by admin')
        duration_hours = data.get('duration_hours', 24)
        
        result = temporarily_block_account(user_id, reason, duration_hours)
        
        if result.get('success'):
            return jsonify({
                'message': f'User blocked until {result.get("blocked_until")}',
                'result': result
            }), 200
        else:
            return jsonify({'error': result.get('error', 'Failed to block user')}), 400
        
    except Exception as e:
        logger.error(f"Block user error: {e}")
        return jsonify({'error': 'Failed to block user'}), 500


@fraud_bp.route('/fraud/unblock/<int:user_id>', methods=['POST'])
@jwt_required()
def unblock_user(user_id):
    """Unblock a user account"""
    try:
        current_user_id = int(get_jwt_identity())
        
        if not is_admin_user(current_user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user.is_blocked = False
        user.blocked_until = None
        user.block_reason = None
        db.session.commit()
        
        logger.info(f"User {user_id} unblocked by admin {current_user_id}")
        
        return jsonify({
            'message': 'User unblocked successfully',
            'user_id': user_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unblock user error: {e}")
        return jsonify({'error': 'Failed to unblock user'}), 500
