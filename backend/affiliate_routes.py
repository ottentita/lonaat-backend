"""
Affiliate click tracking
/api/affiliate/click - Track and redirect affiliate clicks
"""

from flask import Blueprint, request, jsonify, redirect
from models import db, AffiliateClick, Product
from ads_routes import handle_boost_click
import logging

logger = logging.getLogger(__name__)

affiliate_bp = Blueprint('affiliate', __name__, url_prefix='/api/affiliate')


@affiliate_bp.route('/click/<int:product_id>', methods=['GET'])
def track_click(product_id):
    """
    Track affiliate click and redirect to affiliate link
    
    URL: /api/affiliate/click/<product_id>
    """
    try:
        # Get product
        product = Product.query.get(product_id)
        
        if not product or not product.is_active:
            return jsonify({'error': 'Product not found or inactive'}), 404
        
        # Get client info
        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        user_agent = request.headers.get('User-Agent', '')
        
        # Create click record
        click = AffiliateClick(
            product_id=product_id,
            user_id=product.user_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.session.add(click)
        db.session.commit()
        
        # Handle AdBoost if active
        boost_result = handle_boost_click(product_id)
        
        logger.info(f"Click tracked: Product {product_id}, Boost: {boost_result.get('boosted', False)}")
        
        # Redirect to affiliate link
        return redirect(product.affiliate_link, code=302)
        
    except Exception as e:
        logger.error(f"Track click error: {e}")
        db.session.rollback()
        # Still redirect even if tracking fails
        try:
            product = Product.query.get(product_id)
            if product:
                return redirect(product.affiliate_link, code=302)
        except:
            pass
        return jsonify({'error': 'Click tracking failed'}), 500


@affiliate_bp.route('/stats/<int:product_id>', methods=['GET'])
def get_click_stats(product_id):
    """Get click statistics for a product"""
    try:
        product = Product.query.get(product_id)
        
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        total_clicks = AffiliateClick.query.filter_by(product_id=product_id).count()
        
        # Get recent clicks
        recent_clicks = AffiliateClick.query.filter_by(product_id=product_id)\
            .order_by(AffiliateClick.clicked_at.desc())\
            .limit(20)\
            .all()
        
        return jsonify({
            'product_id': product_id,
            'total_clicks': total_clicks,
            'recent_clicks': [c.to_dict() for c in recent_clicks]
        }), 200
        
    except Exception as e:
        logger.error(f"Get click stats error: {e}")
        return jsonify({'error': 'Failed to fetch stats'}), 500
