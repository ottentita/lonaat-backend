"""
Wallet and credit purchase routes
/api/wallet - Get wallet balance
/api/wallet/buy_credits - Purchase AdBoost credits
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, CreditWallet, User, Transaction
from auth import check_user_blocked
from config import Config
import logging
import secrets
from datetime import datetime, timedelta
from models import WithdrawalRequest, BankAccount, Commission
from auth import is_admin_user
from sqlalchemy import func

logger = logging.getLogger(__name__)

wallet_bp = Blueprint('wallet', __name__, url_prefix='/api/wallet')


def get_or_create_wallet(user_id: int) -> CreditWallet:
    """Get or create credit wallet for user"""
    wallet = CreditWallet.query.filter_by(user_id=user_id).first()
    
    if not wallet:
        wallet = CreditWallet(user_id=user_id)
        db.session.add(wallet)
        db.session.commit()
    
    return wallet


@wallet_bp.route('', methods=['GET'])
@jwt_required()
def get_wallet():
    """Get user's credit wallet"""
    try:
        user_id = int(get_jwt_identity())
        wallet = get_or_create_wallet(user_id)
        
        return jsonify({
            'wallet': wallet.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Get wallet error: {e}")
        return jsonify({'error': 'Failed to fetch wallet'}), 500


@wallet_bp.route('/buy_credits', methods=['POST'])
@jwt_required()
def buy_credits():
    """
    Initialize credit purchase
    
    Request body:
    {
        "credits": 100,  // Number of credits to buy
        "amount": 1000   // Amount in NGN
    }
    
    Returns payment link for Flutterwave
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if user is blocked
        is_blocked, block_message = check_user_blocked(user_id)
        if is_blocked:
            return jsonify({'error': block_message}), 403
        
        data = request.get_json()
        
        credits = data.get('credits', 0)
        amount = data.get('amount', 0)
        
        if credits <= 0 or amount <= 0:
            return jsonify({'error': 'Invalid credits or amount'}), 400
        
        # Validate credit pricing (e.g., ₦10 per credit)
        expected_amount = credits * 10
        if abs(amount - expected_amount) > 0.01:
            return jsonify({'error': f'Invalid amount. Expected ₦{expected_amount} for {credits} credits'}), 400
        
        # Note: Payment gateway integration required
        # For production, integrate with payment provider (Stripe, PayStack, etc.)
        # Current: Manual approval workflow via admin panel
        
        tx_ref = f"CREDIT_{user_id}_{secrets.token_hex(8)}"
        
        transaction = Transaction(
            user_id=user_id,
            type='credit_purchase',
            amount=amount,
            description=f'Purchase {credits} AdBoost credits',
            status='pending',
            reference=tx_ref
        )
        db.session.add(transaction)
        db.session.commit()
        
        logger.info(f"Credit purchase request created: {tx_ref} for user {user_id}")
        
        return jsonify({
            'message': 'Credit purchase request received. Please contact admin for payment instructions.',
            'tx_ref': tx_ref,
            'amount': amount,
            'credits': credits,
            'status': 'pending',
            'note': 'Payment gateway integration coming soon. Currently requires manual admin approval.'
        }), 201
        
    except Exception as e:
        logger.error(f"Buy credits error: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@wallet_bp.route('/transactions', methods=['GET'])
@jwt_required()
def get_wallet_transactions():
    """Get wallet transaction history"""
    try:
        user_id = int(get_jwt_identity())
        
        transactions = Transaction.query.filter_by(
            user_id=user_id,
            type='credit_purchase'
        ).order_by(Transaction.created_at.desc()).limit(50).all()
        
        return jsonify({
            'transactions': [t.to_dict() for t in transactions]
        }), 200
        
    except Exception as e:
        logger.error(f"Get wallet transactions error: {e}")
        return jsonify({'error': 'Failed to fetch transactions'}), 500


def _sum_pending_withdrawals(user_id: int):
    total = db.session.query(func.coalesce(func.sum(WithdrawalRequest.amount), 0)).filter(
        WithdrawalRequest.user_id == user_id,
        WithdrawalRequest.status == 'pending'
    ).scalar() or 0
    return float(total)


@wallet_bp.route('/summary', methods=['GET'])
@jwt_required()
def wallet_summary():
    """Return financial summary for current user"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Commissions summary
        commissions = Commission.query.filter_by(user_id=user_id).all()
        total_amount = sum(c.amount for c in commissions)
        pending_amount = sum(c.amount for c in commissions if c.status == 'pending')
        approved_amount = sum(c.amount for c in commissions if c.status == 'approved')
        paid_amount = sum(c.amount for c in commissions if c.status == 'paid')

        pending_withdrawals = _sum_pending_withdrawals(user_id)
        withdrawable_balance = float(user.balance) - pending_withdrawals

        return jsonify({
            'balance': float(user.balance),
            'withdrawable_balance': float(withdrawable_balance),
            'pending_withdrawals': float(pending_withdrawals),
            'commissions': {
                'total': float(total_amount),
                'pending': float(pending_amount),
                'approved': float(approved_amount),
                'paid': float(paid_amount)
            }
        }), 200

    except Exception as e:
        logger.error(f"Wallet summary error: {e}")
        return jsonify({'error': 'Failed to fetch wallet summary'}), 500


@wallet_bp.route('/withdraw', methods=['POST'])
@jwt_required()
def request_withdrawal():
    """Create a withdrawal request"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json() or {}
        amount = float(data.get('amount', 0) or 0)
        bank_account_id = data.get('bank_account_id')

        if amount <= 0:
            return jsonify({'error': 'Invalid withdrawal amount'}), 400

        # Determine available funds (balance minus pending requests)
        pending_total = _sum_pending_withdrawals(user_id)
        available = float(user.balance) - pending_total

        if amount > available:
            return jsonify({'error': 'Insufficient withdrawable balance', 'available': available}), 400

        # Optional: validate bank account
        bank_account = None
        if bank_account_id:
            bank_account = BankAccount.query.filter_by(id=bank_account_id, user_id=user_id).first()
            if not bank_account:
                return jsonify({'error': 'Bank account not found'}), 404

        # Enforce daily withdrawal limits
        since = datetime.utcnow() - timedelta(days=1)
        recent_count = WithdrawalRequest.query.filter(
            WithdrawalRequest.user_id == user_id,
            WithdrawalRequest.requested_at >= since
        ).count()
        max_per_day = int(Config.MAX_WITHDRAWALS_PER_DAY or 3)
        if recent_count >= max_per_day:
            return jsonify({'error': 'Withdrawal limit reached for the day'}), 403

        wr = WithdrawalRequest(
            user_id=user_id,
            bank_account_id=bank_account.id if bank_account else None,
            amount=amount,
            status='pending'
        )
        db.session.add(wr)

        # Optionally create a pending transaction record for auditing
        tx_ref = f"WITHDRAW_REQ_{user_id}_{secrets.token_hex(8)}"
        tx = Transaction(
            user_id=user_id,
            type='withdrawal',
            amount=amount,
            description=f'Withdrawal request {tx_ref}',
            status='pending',
            reference=tx_ref,
            extra_data={'withdrawal_id': None}
        )
        db.session.add(tx)
        db.session.commit()

        # Link transaction to withdrawal (update extra_data)
        tx.extra_data = {'withdrawal_id': wr.id}
        db.session.commit()

        return jsonify({'message': 'Withdrawal request submitted', 'withdrawal': wr.to_dict()}), 201

    except Exception as e:
        logger.error(f"Create withdrawal request error: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to create withdrawal request'}), 500


@wallet_bp.route('/withdrawals', methods=['GET'])
@jwt_required()
def get_my_withdrawals():
    try:
        user_id = int(get_jwt_identity())
        withdrawals = WithdrawalRequest.query.filter_by(user_id=user_id).order_by(WithdrawalRequest.requested_at.desc()).limit(50).all()
        return jsonify({'withdrawals': [w.to_dict() for w in withdrawals]}), 200
    except Exception as e:
        logger.error(f"Get my withdrawals error: {e}")
        return jsonify({'error': 'Failed to fetch withdrawals'}), 500


@wallet_bp.route('/admin/withdrawals', methods=['GET'])
@jwt_required()
def admin_list_withdrawals():
    try:
        current_user_id = int(get_jwt_identity())
        if not is_admin_user(current_user_id):
            return jsonify({'error': 'Admin access required'}), 403

        status = request.args.get('status')
        query = WithdrawalRequest.query
        if status:
            query = query.filter_by(status=status)

        withdrawals = query.order_by(WithdrawalRequest.requested_at.desc()).paginate(page=request.args.get('page',1,type=int), per_page=request.args.get('per_page',50,type=int), error_out=False)

        items = []
        for w in withdrawals.items:
            wd = w.to_dict()
            if w.user:
                wd['user'] = w.user.to_dict()
            items.append(wd)

        return jsonify({'withdrawals': items, 'pagination': {'page': withdrawals.page, 'per_page': withdrawals.per_page, 'total': withdrawals.total, 'pages': withdrawals.pages}}), 200
    except Exception as e:
        logger.error(f"Admin list withdrawals error: {e}")
        return jsonify({'error': 'Failed to fetch withdrawals'}), 500


@wallet_bp.route('/admin/withdrawals/<int:withdrawal_id>/approve', methods=['POST'])
@jwt_required()
def admin_approve_withdrawal(withdrawal_id):
    try:
        current_user_id = int(get_jwt_identity())
        if not is_admin_user(current_user_id):
            return jsonify({'error': 'Admin access required'}), 403

        wr = WithdrawalRequest.query.get(withdrawal_id)
        if not wr:
            return jsonify({'error': 'Withdrawal not found'}), 404

        if wr.status != 'pending':
            return jsonify({'error': f'Withdrawal already {wr.status}'}), 400

        user = User.query.get(wr.user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Ensure user has sufficient balance at approval time
        if float(user.balance) < float(wr.amount):
            return jsonify({'error': 'Insufficient user balance for approval'}), 400

        # Deduct balance (reserve funds)
        user.balance = float(user.balance) - float(wr.amount)

        wr.status = 'approved'
        wr.reviewed_at = datetime.utcnow()
        wr.reviewed_by = current_user_id

        # Create reservation transaction (negative amount)
        tx_ref = f"WITHDRAW_APPROVE_{wr.user_id}_{secrets.token_hex(8)}"
        tx = Transaction(
            user_id=wr.user_id,
            type='withdrawal',
            amount=-abs(float(wr.amount)),
            description=f'Withdrawal approved and reserved (request {wr.id})',
            status='approved',
            reference=tx_ref,
            extra_data={'withdrawal_id': wr.id}
        )
        db.session.add(tx)
        db.session.commit()

        return jsonify({'message': 'Withdrawal approved and funds reserved', 'withdrawal': wr.to_dict(), 'user_balance': float(user.balance)}), 200
    except Exception as e:
        logger.error(f"Approve withdrawal error: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to approve withdrawal'}), 500


@wallet_bp.route('/admin/withdrawals/<int:withdrawal_id>/reject', methods=['POST'])
@jwt_required()
def admin_reject_withdrawal(withdrawal_id):
    try:
        current_user_id = int(get_jwt_identity())
        if not is_admin_user(current_user_id):
            return jsonify({'error': 'Admin access required'}), 403

        wr = WithdrawalRequest.query.get(withdrawal_id)
        if not wr:
            return jsonify({'error': 'Withdrawal not found'}), 404

        data = request.get_json() or {}
        reason = data.get('reason', 'Rejected by admin')

        # If it was already approved and reserved, refund the user
        if wr.status == 'approved':
            user = User.query.get(wr.user_id)
            if user:
                user.balance = float(user.balance) + float(wr.amount)

        wr.status = 'rejected'
        wr.admin_notes = reason
        wr.reviewed_at = datetime.utcnow()
        wr.reviewed_by = current_user_id

        # Mark any related transaction as failed/reversed
        related_tx = Transaction.query.filter(Transaction.extra_data['withdrawal_id'].astext == str(wr.id)).first()
        if related_tx:
            related_tx.status = 'failed'

        db.session.commit()

        return jsonify({'message': 'Withdrawal rejected', 'withdrawal': wr.to_dict()}), 200
    except Exception as e:
        logger.error(f"Reject withdrawal error: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to reject withdrawal'}), 500


@wallet_bp.route('/admin/withdrawals/<int:withdrawal_id>/mark-paid', methods=['POST'])
@jwt_required()
def admin_mark_withdrawal_paid(withdrawal_id):
    try:
        current_user_id = int(get_jwt_identity())
        if not is_admin_user(current_user_id):
            return jsonify({'error': 'Admin access required'}), 403

        wr = WithdrawalRequest.query.get(withdrawal_id)
        if not wr:
            return jsonify({'error': 'Withdrawal not found'}), 404

        if wr.status != 'approved':
            return jsonify({'error': 'Only approved withdrawals can be marked as paid'}), 400

        wr.status = 'paid'
        wr.reviewed_at = datetime.utcnow()
        wr.reviewed_by = current_user_id

        # Update related reservation transaction to completed
        related_tx = Transaction.query.filter(Transaction.extra_data['withdrawal_id'].astext == str(wr.id)).first()
        if related_tx:
            related_tx.status = 'completed'

        db.session.commit()

        return jsonify({'message': 'Withdrawal marked as paid', 'withdrawal': wr.to_dict()}), 200
    except Exception as e:
        logger.error(f"Mark withdrawal paid error: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to mark withdrawal as paid'}), 500
