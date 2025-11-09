"""
Wallet and credit purchase routes
/api/wallet - Get wallet balance
/api/wallet/buy_credits - Purchase AdBoost credits
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, CreditWallet, User, Transaction
from flutterwave_service import flutterwave_service
from config import Config
import logging
import secrets

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
        
        data = request.get_json()
        
        credits = data.get('credits', 0)
        amount = data.get('amount', 0)
        
        if credits <= 0 or amount <= 0:
            return jsonify({'error': 'Invalid credits or amount'}), 400
        
        # Validate credit pricing (e.g., ₦10 per credit)
        expected_amount = credits * 10
        if abs(amount - expected_amount) > 0.01:
            return jsonify({'error': f'Invalid amount. Expected ₦{expected_amount} for {credits} credits'}), 400
        
        # Generate unique transaction reference
        tx_ref = f"CREDIT_{user_id}_{secrets.token_hex(8)}"
        
        # Create pending transaction
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
        
        # Initialize Flutterwave payment
        payment_data = flutterwave_service.initialize_payment(
            amount=amount,
            email=user.email,
            name=user.name,
            tx_ref=tx_ref,
            redirect_url=f"{Config.BASE_URL}/wallet/payment_callback",
            meta={
                'user_id': user_id,
                'credits': credits,
                'type': 'credit_purchase'
            }
        )
        
        if payment_data.get('status') == 'success':
            payment_link = payment_data['data']['link']
            
            logger.info(f"Credit purchase initiated: {tx_ref} for user {user_id}")
            
            return jsonify({
                'message': 'Payment initialized',
                'payment_link': payment_link,
                'tx_ref': tx_ref,
                'amount': amount,
                'credits': credits
            }), 200
        else:
            db.session.delete(transaction)
            db.session.commit()
            return jsonify({'error': 'Failed to initialize payment'}), 500
        
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
