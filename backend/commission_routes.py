"""
Commission tracking and viewing routes
User API: /api/commissions - View own commissions
Admin API: /api/admin/commissions - View all commissions with filters
Admin API: /api/admin/commissions/<id>/approve - Approve commission
Admin API: /api/admin/commissions/<id>/reject - Reject commission
Admin API: /api/admin/commissions/<id>/mark-paid - Mark as paid
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Commission, AdBoost
from auth import is_admin_user
from datetime import datetime, timedelta
from sqlalchemy import func
import logging

logger = logging.getLogger(__name__)

commission_bp = Blueprint('commissions', __name__, url_prefix='/api')

VALID_STATUSES = ['pending', 'approved', 'rejected', 'paid']
VALID_NETWORKS = ['digistore24', 'awin', 'partnerstack']


@commission_bp.route('/commissions', methods=['GET'])
@jwt_required()
def get_user_commissions():
    """
    Get current user's commission data
    
    Query params:
    - status: filter by status (pending, approved, paid)
    - network: filter by network (digistore24, awin)
    - start_date: filter from date (YYYY-MM-DD)
    - end_date: filter to date (YYYY-MM-DD)
    - page: page number (default 1)
    - per_page: items per page (default 20)
    
    Returns:
    - summary: total, pending, approved, paid amounts
    - commissions: list of commission records
    - pagination: page info
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Build query
        query = Commission.query.filter_by(user_id=user_id)
        
        # Apply filters
        status_filter = request.args.get('status')
        if status_filter and status_filter in VALID_STATUSES:
            query = query.filter_by(status=status_filter)
        
        network_filter = request.args.get('network')
        if network_filter and network_filter in VALID_NETWORKS:
            query = query.filter_by(network=network_filter)
        
        start_date = request.args.get('start_date')
        if start_date:
            try:
                start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(Commission.created_at >= start_datetime)
            except ValueError:
                return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
        
        end_date = request.args.get('end_date')
        if end_date:
            try:
                end_datetime = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                query = query.filter(Commission.created_at < end_datetime)
            except ValueError:
                return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
        
        # Calculate summary
        all_commissions = Commission.query.filter_by(user_id=user_id).all()
        
        summary = {
            'total_commissions': len(all_commissions),
            'total_amount': sum(c.amount for c in all_commissions),
            'pending_amount': sum(c.amount for c in all_commissions if c.status == 'pending'),
            'approved_amount': sum(c.amount for c in all_commissions if c.status == 'approved'),
            'rejected_amount': sum(c.amount for c in all_commissions if c.status == 'rejected'),
            'paid_amount': sum(c.amount for c in all_commissions if c.status == 'paid'),
            'pending_count': len([c for c in all_commissions if c.status == 'pending']),
            'approved_count': len([c for c in all_commissions if c.status == 'approved']),
            'rejected_count': len([c for c in all_commissions if c.status == 'rejected']),
            'paid_count': len([c for c in all_commissions if c.status == 'paid'])
        }
        
        # Paginate filtered results
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        pagination = query.order_by(Commission.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return jsonify({
            'summary': summary,
            'commissions': [c.to_dict() for c in pagination.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'total_pages': pagination.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get user commissions error: {e}")
        return jsonify({'error': 'Failed to fetch commissions'}), 500


@commission_bp.route('/admin/commissions', methods=['GET'])
@jwt_required()
def get_all_commissions():
    """
    Admin-only: View all commissions from all users with filters
    
    Query params:
    - user_id: filter by specific user
    - status: filter by status (pending, approved, paid)
    - network: filter by network (digistore24, awin)
    - start_date: filter from date (YYYY-MM-DD)
    - end_date: filter to date (YYYY-MM-DD)
    - page: page number (default 1)
    - per_page: items per page (default 50)
    
    Returns:
    - summary: platform-wide commission stats
    - commissions: list of all commission records
    - pagination: page info
    """
    try:
        current_user_id = int(get_jwt_identity())
        
        # Admin check
        if not is_admin_user(current_user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        # Build query
        query = Commission.query
        
        # Apply filters
        user_filter = request.args.get('user_id', type=int)
        if user_filter:
            query = query.filter_by(user_id=user_filter)
        
        status_filter = request.args.get('status')
        if status_filter and status_filter in VALID_STATUSES:
            query = query.filter_by(status=status_filter)
        
        network_filter = request.args.get('network')
        if network_filter and network_filter in VALID_NETWORKS:
            query = query.filter_by(network=network_filter)
        
        start_date = request.args.get('start_date')
        if start_date:
            try:
                start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(Commission.created_at >= start_datetime)
            except ValueError:
                return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
        
        end_date = request.args.get('end_date')
        if end_date:
            try:
                end_datetime = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                query = query.filter(Commission.created_at < end_datetime)
            except ValueError:
                return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
        
        # Calculate platform-wide summary
        all_commissions = Commission.query.all()
        
        summary = {
            'total_commissions': len(all_commissions),
            'total_amount': sum(c.amount for c in all_commissions),
            'pending_amount': sum(c.amount for c in all_commissions if c.status == 'pending'),
            'approved_amount': sum(c.amount for c in all_commissions if c.status == 'approved'),
            'rejected_amount': sum(c.amount for c in all_commissions if c.status == 'rejected'),
            'paid_amount': sum(c.amount for c in all_commissions if c.status == 'paid'),
            'pending_count': len([c for c in all_commissions if c.status == 'pending']),
            'approved_count': len([c for c in all_commissions if c.status == 'approved']),
            'rejected_count': len([c for c in all_commissions if c.status == 'rejected']),
            'paid_count': len([c for c in all_commissions if c.status == 'paid']),
            'total_users': db.session.query(func.count(func.distinct(Commission.user_id))).scalar() or 0,
            'digistore24_total': sum(c.amount for c in all_commissions if c.network == 'digistore24'),
            'awin_total': sum(c.amount for c in all_commissions if c.network == 'awin'),
            'partnerstack_total': sum(c.amount for c in all_commissions if c.network == 'partnerstack')
        }
        
        # Paginate filtered results
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        pagination = query.order_by(Commission.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # Include user info in response
        commissions_with_users = []
        for commission in pagination.items:
            commission_dict = commission.to_dict()
            if commission.user:
                commission_dict['user_name'] = commission.user.name
                commission_dict['user_email'] = commission.user.email
            commissions_with_users.append(commission_dict)
        
        return jsonify({
            'summary': summary,
            'commissions': commissions_with_users,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'total_pages': pagination.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get all commissions error: {e}")
        return jsonify({'error': 'Failed to fetch commissions'}), 500


@commission_bp.route('/admin/commissions/<int:commission_id>/approve', methods=['POST'])
@jwt_required()
def approve_commission(commission_id):
    """Admin-only: Approve a pending commission"""
    try:
        current_user_id = int(get_jwt_identity())
        
        if not is_admin_user(current_user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        commission = Commission.query.get(commission_id)
        if not commission:
            return jsonify({'error': 'Commission not found'}), 404
        
        if commission.status != 'pending':
            return jsonify({'error': f'Commission is already {commission.status}'}), 400
        
        commission.status = 'approved'
        commission.approved_at = datetime.utcnow()
        commission.approved_by = current_user_id
        db.session.commit()
        
        logger.info(f"Commission {commission_id} approved by admin {current_user_id}")
        
        return jsonify({
            'message': 'Commission approved successfully',
            'commission': commission.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Approve commission error: {e}")
        return jsonify({'error': 'Failed to approve commission'}), 500


@commission_bp.route('/admin/commissions/<int:commission_id>/reject', methods=['POST'])
@jwt_required()
def reject_commission(commission_id):
    """Admin-only: Reject a pending commission"""
    try:
        current_user_id = int(get_jwt_identity())
        
        if not is_admin_user(current_user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        commission = Commission.query.get(commission_id)
        if not commission:
            return jsonify({'error': 'Commission not found'}), 404
        
        if commission.status not in ['pending', 'approved']:
            return jsonify({'error': f'Cannot reject a {commission.status} commission'}), 400
        
        data = request.get_json() or {}
        reason = data.get('reason', 'Rejected by admin')
        
        commission.status = 'rejected'
        commission.rejection_reason = reason
        db.session.commit()
        
        logger.info(f"Commission {commission_id} rejected by admin {current_user_id}: {reason}")
        
        return jsonify({
            'message': 'Commission rejected',
            'commission': commission.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Reject commission error: {e}")
        return jsonify({'error': 'Failed to reject commission'}), 500


@commission_bp.route('/admin/commissions/<int:commission_id>/mark-paid', methods=['POST'])
@jwt_required()
def mark_commission_paid(commission_id):
    """Admin-only: Mark an approved commission as paid and add to user balance"""
    try:
        current_user_id = int(get_jwt_identity())
        
        if not is_admin_user(current_user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        commission = Commission.query.get(commission_id)
        if not commission:
            return jsonify({'error': 'Commission not found'}), 404
        
        if commission.status == 'paid':
            return jsonify({'error': 'Commission is already paid'}), 400
        
        if commission.status == 'rejected':
            return jsonify({'error': 'Cannot pay a rejected commission'}), 400
        
        # Update commission status
        commission.status = 'paid'
        commission.paid_at = datetime.utcnow()
        
        # Add amount to user balance
        user = User.query.get(commission.user_id)
        if user:
            user.balance += commission.amount
        
        db.session.commit()
        
        logger.info(f"Commission {commission_id} marked as paid by admin {current_user_id}")
        
        return jsonify({
            'message': 'Commission marked as paid',
            'commission': commission.to_dict(),
            'user_balance': user.balance if user else None
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Mark commission paid error: {e}")
        return jsonify({'error': 'Failed to mark commission as paid'}), 500


def check_duplicate_commission(network, external_ref):
    """Check if a commission with this external reference already exists"""
    if not external_ref:
        return False
    
    existing = Commission.query.filter_by(
        network=network,
        external_ref=external_ref
    ).first()
    
    return existing is not None


def create_commission_with_duplicate_check(user_id, network, amount, external_ref=None, 
                                           product_id=None, campaign_id=None, webhook_data=None):
    """
    Create a commission record with duplicate prevention
    
    Returns:
        tuple: (commission, created) - commission object and whether it was newly created
    """
    # Check for duplicate
    if external_ref:
        existing = Commission.query.filter_by(
            network=network,
            external_ref=external_ref
        ).first()
        
        if existing:
            logger.warning(f"Duplicate commission detected: {network} - {external_ref}")
            return existing, False
    
    # Create new commission
    commission = Commission(
        user_id=user_id,
        network=network,
        amount=amount,
        status='pending',
        external_ref=external_ref,
        product_id=product_id,
        campaign_id=campaign_id,
        webhook_data=webhook_data
    )
    
    db.session.add(commission)
    db.session.commit()
    
    logger.info(f"New commission created: {network} - ₦{amount} for user {user_id}")
    return commission, True
