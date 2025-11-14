"""
Payment and subscription management routes
Handles credit purchases, subscriptions, and admin payment approval
"""

from flask import Blueprint, request, jsonify, send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, CreditPackage, PaymentRequest, Plan, Subscription, CreditWallet, Transaction
from auth import is_admin_user, log_admin_action
from services.file_upload import save_receipt
from datetime import datetime, timedelta
import logging
import os

logger = logging.getLogger(__name__)

payments_bp = Blueprint('payments', __name__, url_prefix='/api')


# ============= CREDIT PACKAGES =============

@payments_bp.route('/wallet/packages', methods=['GET'])
@jwt_required()
def get_credit_packages():
    """Get all active credit packages"""
    try:
        packages = CreditPackage.query.filter_by(is_active=True)\
            .order_by(CreditPackage.display_order).all()
        
        # Get bank account details for display
        bank_details = {
            'bank_name': os.getenv('ADMIN_BANK_NAME', 'Mobile Money'),
            'account_name': os.getenv('ADMIN_ACCOUNT_NAME', 'Lonaat Platform'),
            'account_number': os.getenv('ADMIN_ACCOUNT_NUMBER', 'Contact admin for details'),
            'instructions': 'Transfer the exact amount and upload your payment receipt for approval.'
        }
        
        return jsonify({
            'packages': [p.to_dict() for p in packages],
            'bank_details': bank_details
        }), 200
        
    except Exception as e:
        logger.error(f"Get credit packages error: {e}")
        return jsonify({'error': 'Failed to fetch packages'}), 500


@payments_bp.route('/wallet/purchase', methods=['POST'])
@jwt_required()
def initiate_credit_purchase():
    """
    Initiate credit purchase
    Creates a payment request and optionally uploads receipt
    
    Supports both JSON and multipart/form-data:
    JSON Request:
        - package_id: int (required)
        - payment_method: str ('bank_transfer' or 'stripe')
    
    Multipart Form Request:
        - package_id: int (required)
        - payment_method: str ('bank_transfer' or 'stripe')
        - receipt: file (optional, can be uploaded later)
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Support both JSON and form data
        if request.is_json:
            data = request.get_json()
            package_id = data.get('package_id')
            payment_method = data.get('payment_method', 'bank_transfer')
            has_receipt = False
        else:
            package_id = request.form.get('package_id', type=int)
            payment_method = request.form.get('payment_method', 'bank_transfer')
            has_receipt = 'receipt' in request.files
        
        if not package_id:
            return jsonify({'error': 'package_id is required'}), 400
        
        package = CreditPackage.query.get(package_id)
        if not package or not package.is_active:
            return jsonify({'error': 'Invalid package'}), 404
        
        # Create payment request
        payment_request = PaymentRequest(
            user_id=user_id,
            purpose='credit_purchase',
            amount=package.price,
            currency='XAF',
            payment_method=payment_method,
            package_id=package_id,
            credits_to_add=package.credits + package.bonus_credits,
            status='pending'
        )
        
        # Handle receipt upload if provided (multipart only)
        if has_receipt:
            receipt_file = request.files['receipt']
            success, result = save_receipt(receipt_file, user_id, 'credit_purchase')
            
            if not success:
                return jsonify({'error': result}), 400
            
            if isinstance(result, dict):
                payment_request.receipt_url = result.get('path')
                payment_request.receipt_filename = result.get('filename')
        
        db.session.add(payment_request)
        db.session.commit()
        
        logger.info(f"Credit purchase initiated: Payment {payment_request.id} for user {user_id}")
        
        return jsonify({
            'message': 'Payment request created successfully',
            'payment_request': payment_request.to_dict(),
            'next_steps': 'Upload payment receipt if not already done' if not payment_request.receipt_url else 'Wait for admin approval'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Credit purchase error: {e}")
        return jsonify({'error': 'Failed to create payment request'}), 500


@payments_bp.route('/payments/<int:payment_id>/upload-receipt', methods=['POST'])
@jwt_required()
def upload_payment_receipt(payment_id):
    """
    Upload receipt for existing payment request
    
    Request:
        - receipt: file (required)
    """
    try:
        user_id = int(get_jwt_identity())
        
        # Get payment request
        payment_request = PaymentRequest.query.get(payment_id)
        if not payment_request:
            return jsonify({'error': 'Payment request not found'}), 404
        
        # Verify ownership
        if payment_request.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Check if already has receipt
        if payment_request.receipt_url:
            return jsonify({'error': 'Receipt already uploaded'}), 400
        
        # Check if payment is still pending
        if payment_request.status != 'pending':
            return jsonify({'error': f'Cannot upload receipt for {payment_request.status} payment'}), 400
        
        # Upload receipt
        if 'receipt' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        receipt_file = request.files['receipt']
        success, result = save_receipt(receipt_file, user_id, payment_request.purpose)
        
        if not success:
            return jsonify({'error': result}), 400
        
        if isinstance(result, dict):
            payment_request.receipt_url = result.get('path')
            payment_request.receipt_filename = result.get('filename')
        db.session.commit()
        
        logger.info(f"Receipt uploaded for payment {payment_id}")
        
        return jsonify({
            'message': 'Receipt uploaded successfully',
            'payment_request': payment_request.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Receipt upload error: {e}")
        return jsonify({'error': 'Failed to upload receipt'}), 500


# ============= SUBSCRIPTION PLANS =============

@payments_bp.route('/plans', methods=['GET'])
def get_subscription_plans():
    """Get all active subscription plans (public endpoint)"""
    try:
        plans = Plan.query.filter_by(is_active=True).all()
        
        return jsonify({
            'plans': [p.to_dict() for p in plans]
        }), 200
        
    except Exception as e:
        logger.error(f"Get plans error: {e}")
        return jsonify({'error': 'Failed to fetch plans'}), 500


@payments_bp.route('/subscriptions/subscribe', methods=['POST'])
@jwt_required()
def subscribe_to_plan():
    """
    Subscribe to a plan
    Creates pending subscription and payment request
    
    Supports both JSON and multipart/form-data:
    JSON Request:
        - plan_id: int (required)
        - payment_method: str ('bank_transfer' or 'stripe')
    
    Multipart Form Request:
        - plan_id: int (required)
        - payment_method: str ('bank_transfer' or 'stripe')
        - receipt: file (optional)
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Support both JSON and form data
        if request.is_json:
            data = request.get_json()
            plan_id = data.get('plan_id')
            payment_method = data.get('payment_method', 'bank_transfer')
            has_receipt = False
        else:
            plan_id = request.form.get('plan_id', type=int)
            payment_method = request.form.get('payment_method', 'bank_transfer')
            has_receipt = 'receipt' in request.files
        
        if not plan_id:
            return jsonify({'error': 'plan_id is required'}), 400
        
        plan = Plan.query.get(plan_id)
        if not plan or not plan.is_active:
            return jsonify({'error': 'Invalid plan'}), 404
        
        # Check if user already has active subscription
        existing_sub = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()
        
        if existing_sub:
            return jsonify({'error': 'You already have an active subscription. Cancel it first or wait for it to expire.'}), 400
        
        # Create pending subscription
        expires_at = datetime.utcnow() + timedelta(days=plan.duration_days)
        subscription = Subscription(
            user_id=user_id,
            plan_id=plan_id,
            status='pending',  # Will be activated after payment approval
            started_at=datetime.utcnow(),
            expires_at=expires_at,
            auto_renew=False
        )
        db.session.add(subscription)
        db.session.flush()  # Get subscription ID
        
        # Create payment request
        payment_request = PaymentRequest(
            user_id=user_id,
            purpose='subscription',
            amount=plan.price,
            currency='XAF',
            payment_method=payment_method,
            plan_id=plan_id,
            subscription_id=subscription.id,
            status='pending'
        )
        
        # Handle receipt upload if provided (multipart only)
        if has_receipt:
            receipt_file = request.files['receipt']
            success, result = save_receipt(receipt_file, user_id, 'subscription')
            
            if not success:
                db.session.rollback()
                return jsonify({'error': result}), 400
            
            if isinstance(result, dict):
                payment_request.receipt_url = result.get('path')
                payment_request.receipt_filename = result.get('filename')
        
        db.session.add(payment_request)
        db.session.commit()
        
        logger.info(f"Subscription initiated: Payment {payment_request.id} for user {user_id}, plan {plan.name}")
        
        return jsonify({
            'message': 'Subscription request created successfully',
            'subscription': subscription.to_dict(),
            'payment_request': payment_request.to_dict(),
            'next_steps': 'Upload payment receipt if not already done' if not payment_request.receipt_url else 'Wait for admin approval'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Subscribe error: {e}")
        return jsonify({'error': 'Failed to create subscription'}), 500


@payments_bp.route('/subscriptions/me', methods=['GET'])
@jwt_required()
def get_my_subscription():
    """Get current user's active subscription"""
    try:
        user_id = int(get_jwt_identity())
        
        subscription = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()
        
        if not subscription:
            return jsonify({'subscription': None}), 200
        
        return jsonify({
            'subscription': subscription.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Get subscription error: {e}")
        return jsonify({'error': 'Failed to fetch subscription'}), 500


# ============= ADMIN PAYMENT APPROVAL =============

@payments_bp.route('/admin/payments', methods=['GET'])
@jwt_required()
def get_all_payments():
    """
    Admin-only: Get all payment requests with filters
    
    Query params:
    - status: pending, approved, denied
    - purpose: credit_purchase, subscription
    - user_id: filter by user
    - page, per_page
    """
    try:
        current_user_id = int(get_jwt_identity())
        
        if not is_admin_user(current_user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        # Build query
        query = PaymentRequest.query
        
        status_filter = request.args.get('status')
        if status_filter and status_filter in ['pending', 'approved', 'denied']:
            query = query.filter_by(status=status_filter)
        
        purpose_filter = request.args.get('purpose')
        if purpose_filter and purpose_filter in ['credit_purchase', 'subscription']:
            query = query.filter_by(purpose=purpose_filter)
        
        user_filter = request.args.get('user_id', type=int)
        if user_filter:
            query = query.filter_by(user_id=user_filter)
        
        # Paginate
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        pagination = query.order_by(PaymentRequest.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return jsonify({
            'payments': [p.to_dict() for p in pagination.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'total_pages': pagination.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get payments error: {e}")
        return jsonify({'error': 'Failed to fetch payments'}), 500


@payments_bp.route('/admin/payments/<int:payment_id>/approve', methods=['POST'])
@jwt_required()
def approve_payment(payment_id):
    """
    Admin-only: Approve payment request
    Atomically updates wallet credits or activates subscription
    
    Request:
        - note: str (optional admin note)
    """
    try:
        admin_id = int(get_jwt_identity())
        
        if not is_admin_user(admin_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json() or {}
        admin_note = data.get('note', '')
        
        # Lock payment request row to prevent double approval
        payment_request = db.session.query(PaymentRequest).with_for_update().get(payment_id)
        
        if not payment_request:
            return jsonify({'error': 'Payment request not found'}), 404
        
        if payment_request.status != 'pending':
            return jsonify({'error': f'Payment already {payment_request.status}'}), 400
        
        # Update payment status
        payment_request.status = 'approved'
        payment_request.reviewed_by = admin_id
        payment_request.review_note = admin_note
        payment_request.reviewed_at = datetime.utcnow()
        
        # Process based on purpose
        if payment_request.purpose == 'credit_purchase':
            # Add credits to wallet
            wallet = CreditWallet.query.filter_by(user_id=payment_request.user_id).first()
            if not wallet:
                wallet = CreditWallet(user_id=payment_request.user_id)
                db.session.add(wallet)
            
            credits_to_add = payment_request.credits_to_add or 0
            wallet.credits += credits_to_add
            wallet.total_purchased += credits_to_add
            
            # Create transaction record
            transaction = Transaction(
                user_id=payment_request.user_id,
                type='credit_purchase',
                amount=payment_request.amount,
                description=f'Credit purchase approved: {credits_to_add} credits added',
                status='completed',
                reference=f'PAY-{payment_request.id}'
            )
            db.session.add(transaction)
            
            result_message = f'{credits_to_add} credits added to user wallet'
            
        elif payment_request.purpose == 'subscription':
            # Activate subscription
            subscription = Subscription.query.get(payment_request.subscription_id)
            if subscription:
                subscription.status = 'active'
                subscription.payment_reference = f'PAY-{payment_request.id}'
                
                # Create transaction record
                transaction = Transaction(
                    user_id=payment_request.user_id,
                    type='subscription',
                    amount=payment_request.amount,
                    description=f'Subscription activated: {subscription.plan.name if subscription.plan else "Unknown"} plan',
                    status='completed',
                    reference=f'PAY-{payment_request.id}'
                )
                db.session.add(transaction)
                
                result_message = f'Subscription activated: {subscription.plan.name if subscription.plan else "Unknown"}'
            else:
                result_message = 'Subscription not found'
        
        else:
            result_message = 'Payment approved'
        
        # Log admin action
        log_admin_action(
            admin_id=admin_id,
            action='approve_payment',
            target_user_id=payment_request.user_id,
            details={'payment_id': payment_id, 'purpose': payment_request.purpose, 'amount': payment_request.amount},
            ip_address=request.remote_addr
        )
        
        db.session.commit()
        
        logger.info(f"Payment {payment_id} approved by admin {admin_id}: {result_message}")
        
        return jsonify({
            'message': 'Payment approved successfully',
            'result': result_message,
            'payment_request': payment_request.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Approve payment error: {e}")
        return jsonify({'error': 'Failed to approve payment'}), 500


@payments_bp.route('/admin/payments/<int:payment_id>/deny', methods=['POST'])
@jwt_required()
def deny_payment(payment_id):
    """
    Admin-only: Deny payment request
    
    Request:
        - note: str (required reason for denial)
    """
    try:
        admin_id = int(get_jwt_identity())
        
        if not is_admin_user(admin_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json() or {}
        admin_note = data.get('note')
        
        if not admin_note:
            return jsonify({'error': 'Denial reason (note) is required'}), 400
        
        # Lock payment request row
        payment_request = db.session.query(PaymentRequest).with_for_update().get(payment_id)
        
        if not payment_request:
            return jsonify({'error': 'Payment request not found'}), 404
        
        if payment_request.status != 'pending':
            return jsonify({'error': f'Payment already {payment_request.status}'}), 400
        
        # Update payment status
        payment_request.status = 'denied'
        payment_request.reviewed_by = admin_id
        payment_request.review_note = admin_note
        payment_request.reviewed_at = datetime.utcnow()
        
        # If subscription, cancel it
        if payment_request.purpose == 'subscription' and payment_request.subscription_id:
            subscription = Subscription.query.get(payment_request.subscription_id)
            if subscription and subscription.status == 'pending':
                subscription.status = 'cancelled'
        
        # Log admin action
        log_admin_action(
            admin_id=admin_id,
            action='deny_payment',
            target_user_id=payment_request.user_id,
            details={'payment_id': payment_id, 'reason': admin_note},
            ip_address=request.remote_addr
        )
        
        db.session.commit()
        
        logger.info(f"Payment {payment_id} denied by admin {admin_id}")
        
        return jsonify({
            'message': 'Payment denied',
            'payment_request': payment_request.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Deny payment error: {e}")
        return jsonify({'error': 'Failed to deny payment'}), 500


# ============= RECEIPT SERVING =============

@payments_bp.route('/receipts/<filename>', methods=['GET'])
@jwt_required()
def serve_receipt(filename):
    """
    Serve uploaded receipt file
    Only accessible by admin or the user who uploaded it
    """
    try:
        current_user_id = int(get_jwt_identity())
        
        # Find payment request with this receipt
        payment_request = PaymentRequest.query.filter(
            PaymentRequest.receipt_filename == filename
        ).first()
        
        if not payment_request:
            return jsonify({'error': 'Receipt not found'}), 404
        
        # Check authorization: admin or owner
        if not is_admin_user(current_user_id) and payment_request.user_id != current_user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Serve file from uploads/receipts directory
        uploads_dir = os.path.join(current_app.root_path, 'uploads', 'receipts')
        
        return send_from_directory(uploads_dir, filename)
        
    except Exception as e:
        logger.error(f"Serve receipt error: {e}")
        return jsonify({'error': 'Failed to serve receipt'}), 500
