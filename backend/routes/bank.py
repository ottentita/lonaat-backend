"""
Bank Account Management Routes
Handles user bank account CRUD and withdrawal requests
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, BankAccount, WithdrawalRequest, AuditLog
from email_service import send_withdrawal_requested_email, send_withdrawal_approved_email
from fraud_detector import check_withdrawal_fraud, log_audit
from datetime import datetime

bank_bp = Blueprint('bank', __name__, url_prefix='/api/bank')


@bank_bp.route('/add', methods=['POST'])
@jwt_required()
def add_bank_account():
    """Add or update user bank account"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    required_fields = ['bank_name', 'account_name', 'account_number']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if data.get('is_primary', True):
        BankAccount.query.filter_by(user_id=user_id, is_primary=True).update({'is_primary': False})
    
    bank_account = BankAccount(
        user_id=user_id,
        bank_name=data['bank_name'],
        account_name=data['account_name'],
        account_number=data['account_number'],
        bank_code=data.get('bank_code'),
        is_primary=data.get('is_primary', True)
    )
    
    db.session.add(bank_account)
    db.session.commit()
    
    log_audit(
        user_id=user_id,
        action='bank_account_added',
        entity_type='bank_account',
        entity_id=bank_account.id,
        details=f"Added bank account: {data['bank_name']}",
        ip_address=request.remote_addr
    )
    
    return jsonify({
        'message': 'Bank account added successfully',
        'bank_account': bank_account.to_dict()
    }), 201


@bank_bp.route('/', methods=['GET'])
@jwt_required()
def get_bank_accounts():
    """Get all user bank accounts"""
    user_id = get_jwt_identity()
    
    accounts = BankAccount.query.filter_by(user_id=user_id).all()
    
    return jsonify({
        'bank_accounts': [acc.to_dict() for acc in accounts]
    }), 200


@bank_bp.route('/<int:account_id>', methods=['DELETE'])
@jwt_required()
def delete_bank_account(account_id):
    """Delete a bank account"""
    user_id = get_jwt_identity()
    
    account = BankAccount.query.filter_by(id=account_id, user_id=user_id).first()
    if not account:
        return jsonify({'error': 'Bank account not found'}), 404
    
    pending_withdrawals = WithdrawalRequest.query.filter_by(
        bank_account_id=account_id,
        status='pending'
    ).count()
    
    if pending_withdrawals > 0:
        return jsonify({'error': 'Cannot delete bank account with pending withdrawals'}), 400
    
    db.session.delete(account)
    db.session.commit()
    
    return jsonify({'message': 'Bank account deleted successfully'}), 200


@bank_bp.route('/withdraw', methods=['POST'])
@jwt_required()
def request_withdrawal():
    """Request withdrawal to bank account"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if 'amount' not in data:
        return jsonify({'error': 'Amount is required'}), 400
    
    amount = float(data['amount'])
    if amount <= 0:
        return jsonify({'error': 'Amount must be positive'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if user.balance < amount:
        return jsonify({'error': 'Insufficient balance'}), 400
    
    bank_account_id = data.get('bank_account_id')
    if not bank_account_id:
        bank_account = BankAccount.query.filter_by(user_id=user_id, is_primary=True).first()
        if not bank_account:
            return jsonify({'error': 'No bank account found. Please add one first.'}), 400
        bank_account_id = bank_account.id
    else:
        bank_account = BankAccount.query.filter_by(id=bank_account_id, user_id=user_id).first()
        if not bank_account:
            return jsonify({'error': 'Bank account not found'}), 404
    
    fraud_result = check_withdrawal_fraud(user_id, amount)
    if fraud_result['flagged']:
        return jsonify({'error': fraud_result['reason']}), 403
    
    withdrawal = WithdrawalRequest(
        user_id=user_id,
        bank_account_id=bank_account_id,
        amount=amount,
        status='pending'
    )
    
    user.balance -= amount
    
    db.session.add(withdrawal)
    db.session.commit()
    
    log_audit(
        user_id=user_id,
        action='withdrawal_requested',
        entity_type='withdrawal',
        entity_id=withdrawal.id,
        details=f"Requested withdrawal of XAF {amount}",
        ip_address=request.remote_addr,
        fraud_score=fraud_result['fraud_score']
    )
    
    send_withdrawal_requested_email(user.email, user.name, amount)
    
    return jsonify({
        'message': 'Withdrawal request submitted successfully',
        'withdrawal': withdrawal.to_dict()
    }), 201


@bank_bp.route('/withdrawals', methods=['GET'])
@jwt_required()
def get_user_withdrawals():
    """Get user's withdrawal history"""
    user_id = get_jwt_identity()
    
    withdrawals = WithdrawalRequest.query.filter_by(user_id=user_id).order_by(
        WithdrawalRequest.requested_at.desc()
    ).all()
    
    return jsonify({
        'withdrawals': [w.to_dict() for w in withdrawals]
    }), 200


@bank_bp.route('/admin/withdrawals', methods=['GET'])
@jwt_required()
def get_all_withdrawals():
    """Admin: Get all withdrawal requests"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    status = request.args.get('status', 'pending')
    
    query = WithdrawalRequest.query
    if status != 'all':
        query = query.filter_by(status=status)
    
    withdrawals = query.order_by(WithdrawalRequest.requested_at.desc()).all()
    
    result = []
    for withdrawal in withdrawals:
        w_dict = withdrawal.to_dict()
        w_dict['user'] = {
            'id': withdrawal.user.id,
            'name': withdrawal.user.name,
            'email': withdrawal.user.email
        }
        result.append(w_dict)
    
    return jsonify({'withdrawals': result}), 200


@bank_bp.route('/admin/withdrawals/<int:withdrawal_id>/approve', methods=['POST'])
@jwt_required()
def approve_withdrawal(withdrawal_id):
    """Admin: Approve and mark withdrawal as paid"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    withdrawal = WithdrawalRequest.query.get(withdrawal_id)
    if not withdrawal:
        return jsonify({'error': 'Withdrawal not found'}), 404
    
    if withdrawal.status != 'pending':
        return jsonify({'error': f'Withdrawal already {withdrawal.status}'}), 400
    
    data = request.get_json() or {}
    
    withdrawal.status = 'paid'
    withdrawal.reviewed_at = datetime.utcnow()
    withdrawal.reviewed_by = user_id
    withdrawal.admin_notes = data.get('admin_notes', 'Approved and paid')
    
    db.session.commit()
    
    log_audit(
        user_id=user_id,
        action='withdrawal_approved',
        entity_type='withdrawal',
        entity_id=withdrawal_id,
        details=f"Approved withdrawal #{withdrawal_id} for XAF {withdrawal.amount}",
        ip_address=request.remote_addr
    )
    
    send_withdrawal_approved_email(
        withdrawal.user.email,
        withdrawal.user.name,
        withdrawal.amount,
        withdrawal.bank_account.bank_name,
        withdrawal.bank_account.account_number
    )
    
    return jsonify({
        'message': 'Withdrawal approved and marked as paid',
        'withdrawal': withdrawal.to_dict()
    }), 200


@bank_bp.route('/admin/withdrawals/<int:withdrawal_id>/reject', methods=['POST'])
@jwt_required()
def reject_withdrawal(withdrawal_id):
    """Admin: Reject withdrawal and refund balance"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    withdrawal = WithdrawalRequest.query.get(withdrawal_id)
    if not withdrawal:
        return jsonify({'error': 'Withdrawal not found'}), 404
    
    if withdrawal.status != 'pending':
        return jsonify({'error': f'Withdrawal already {withdrawal.status}'}), 400
    
    data = request.get_json() or {}
    reason = data.get('reason', 'No reason provided')
    
    withdrawal.status = 'rejected'
    withdrawal.reviewed_at = datetime.utcnow()
    withdrawal.reviewed_by = user_id
    withdrawal.admin_notes = reason
    
    withdrawal.user.balance += withdrawal.amount
    
    db.session.commit()
    
    log_audit(
        user_id=user_id,
        action='withdrawal_rejected',
        entity_type='withdrawal',
        entity_id=withdrawal_id,
        details=f"Rejected withdrawal #{withdrawal_id}: {reason}",
        ip_address=request.remote_addr
    )
    
    return jsonify({
        'message': 'Withdrawal rejected and balance refunded',
        'withdrawal': withdrawal.to_dict()
    }), 200
