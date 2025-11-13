"""
AdBoost engine routes
/api/ads/launch - Launch an AdBoost campaign
/api/ads/status - Get active campaigns
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, AdBoost, Product, CreditWallet, User
from auth import is_admin_user
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

ads_bp = Blueprint('ads', __name__, url_prefix='/api/ads')

# AdBoost pricing (credits per level)
BOOST_COSTS = {
    1: 10,   # 1x boost: 10 credits
    2: 20,   # 2x boost: 20 credits
    4: 40,   # 4x boost: 40 credits
    8: 80,   # 8x boost: 80 credits
    16: 160, # 16x boost: 160 credits
    32: 320  # 32x boost: 320 credits (max)
}


@ads_bp.route('/launch', methods=['POST'])
@jwt_required()
def launch_ad():
    """
    Launch AdBoost campaign for a product
    
    Request body:
    {
        "product_id": 123
    }
    
    - Each ad lasts 24 hours
    - Starts at 1x boost
    - Each click doubles boost level (1x -> 2x -> 4x -> 8x -> 16x -> 32x max)
    - Costs credits based on boost level
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        product_id = data.get('product_id')
        
        if not product_id:
            return jsonify({'error': 'product_id is required'}), 400
        
        # Verify product ownership
        product = Product.query.filter_by(id=product_id, user_id=user_id).first()
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Check if product already has active boost
        existing_boost = AdBoost.query.filter_by(
            product_id=product_id,
            status='active'
        ).first()
        
        if existing_boost:
            return jsonify({'error': 'Product already has an active AdBoost campaign'}), 400
        
        # Check if user is admin - admins bypass ALL credit checks
        is_admin = is_admin_user(user_id)
        
        # Get or create wallet (even for admins, for tracking)
        wallet = CreditWallet.query.filter_by(user_id=user_id).first()
        if not wallet:
            wallet = CreditWallet(user_id=user_id)
            db.session.add(wallet)
            db.session.commit()
        
        # Check credits and deduct ONLY for non-admin users
        initial_cost = BOOST_COSTS[1]
        
        if not is_admin:
            # Regular users: check and deduct credits
            if wallet.credits < initial_cost:
                return jsonify({
                    'error': f'Insufficient credits. Need {initial_cost} credits, have {wallet.credits}'
                }), 400
            
            # Deduct credits
            wallet.credits -= initial_cost
            wallet.total_spent += initial_cost
        else:
            # Admin users: FREE unlimited access
            logger.info(f"Admin user {user_id} launching AdBoost - bypassing credit check")
            initial_cost = 0  # No cost for admin
        
        # Create AdBoost campaign
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        ad_boost = AdBoost(
            user_id=user_id,
            product_id=product_id,
            boost_level=1,
            credits_spent=initial_cost,
            clicks_received=0,
            status='active',
            started_at=datetime.utcnow(),
            expires_at=expires_at
        )
        
        db.session.add(ad_boost)
        db.session.commit()
        
        logger.info(f"AdBoost launched: Campaign {ad_boost.id} for product {product_id}")
        
        return jsonify({
            'message': 'AdBoost campaign launched successfully',
            'campaign': ad_boost.to_dict(),
            'credits_remaining': wallet.credits
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Launch ad error: {e}")
        return jsonify({'error': str(e)}), 500


@ads_bp.route('/status', methods=['GET'])
@jwt_required()
def get_ad_status():
    """Get user's active AdBoost campaigns"""
    try:
        user_id = int(get_jwt_identity())
        
        # Get active campaigns
        active_campaigns = AdBoost.query.filter_by(
            user_id=user_id,
            status='active'
        ).all()
        
        # Get recent expired campaigns
        expired_campaigns = AdBoost.query.filter_by(
            user_id=user_id,
            status='expired'
        ).order_by(AdBoost.expires_at.desc()).limit(10).all()
        
        return jsonify({
            'active_campaigns': [c.to_dict() for c in active_campaigns],
            'expired_campaigns': [c.to_dict() for c in expired_campaigns],
            'total_active': len(active_campaigns)
        }), 200
        
    except Exception as e:
        logger.error(f"Get ad status error: {e}")
        return jsonify({'error': 'Failed to fetch ad status'}), 500


@ads_bp.route('/<int:campaign_id>', methods=['GET'])
@jwt_required()
def get_campaign_details(campaign_id):
    """Get details of a specific campaign"""
    try:
        user_id = int(get_jwt_identity())
        
        campaign = AdBoost.query.filter_by(
            id=campaign_id,
            user_id=user_id
        ).first()
        
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404
        
        return jsonify({
            'campaign': campaign.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Get campaign details error: {e}")
        return jsonify({'error': 'Failed to fetch campaign details'}), 500


@ads_bp.route('/<int:campaign_id>/pause', methods=['POST'])
@jwt_required()
def pause_campaign(campaign_id):
    """Pause an active campaign"""
    try:
        user_id = int(get_jwt_identity())
        
        campaign = AdBoost.query.filter_by(
            id=campaign_id,
            user_id=user_id,
            status='active'
        ).first()
        
        if not campaign:
            return jsonify({'error': 'Active campaign not found'}), 404
        
        campaign.status = 'paused'
        db.session.commit()
        
        return jsonify({
            'message': 'Campaign paused successfully',
            'campaign': campaign.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Pause campaign error: {e}")
        return jsonify({'error': 'Failed to pause campaign'}), 500


def handle_boost_click(product_id: int) -> dict:
    """
    Internal function to handle AdBoost click
    Called when someone clicks a boosted product
    Doubles the boost level (up to 32x max)
    
    Admin users bypass ALL credit checks and get unlimited boost escalations
    """
    try:
        campaign = AdBoost.query.filter_by(
            product_id=product_id,
            status='active'
        ).first()
        
        if not campaign:
            return {'boosted': False}
        
        # Check if expired
        if datetime.utcnow() > campaign.expires_at:
            campaign.status = 'expired'
            db.session.commit()
            return {'boosted': False, 'expired': True}
        
        # Increment clicks
        campaign.clicks_received += 1
        
        # Check if campaign owner is admin
        is_admin = is_admin_user(campaign.user_id)
        
        # Double boost level if not at max
        if campaign.boost_level < 32:
            old_level = campaign.boost_level
            new_level = min(campaign.boost_level * 2, 32)
            
            # Calculate additional credits needed
            additional_credits = BOOST_COSTS[new_level] - BOOST_COSTS[old_level]
            
            if is_admin:
                # Admin bypass: FREE unlimited boost escalation
                campaign.boost_level = new_level
                # Don't add to credits_spent for admin (they don't pay)
                logger.info(f"Admin boost escalation (FREE): Campaign {campaign.id} from {old_level}x to {new_level}x")
            else:
                # Regular users: check and deduct credits
                wallet = CreditWallet.query.filter_by(user_id=campaign.user_id).first()
                
                if wallet and wallet.credits >= additional_credits:
                    # Deduct credits and boost
                    wallet.credits -= additional_credits
                    wallet.total_spent += additional_credits
                    campaign.boost_level = new_level
                    campaign.credits_spent += additional_credits
                    
                    logger.info(f"Boost doubled: Campaign {campaign.id} from {old_level}x to {new_level}x")
                else:
                    logger.warning(f"Insufficient credits for boost: Campaign {campaign.id}")
        
        db.session.commit()
        
        return {
            'boosted': True,
            'boost_level': campaign.boost_level,
            'clicks': campaign.clicks_received
        }
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Handle boost click error: {e}")
        return {'boosted': False, 'error': str(e)}
