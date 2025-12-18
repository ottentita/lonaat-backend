"""
Production API Endpoints for Lonaat
Handles product imports, tracking, webhooks, and commissions
Production-ready for Digistore24 and Awin only
"""

from flask import Blueprint, request, jsonify, redirect
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, ImportedProduct, AffiliateClick, Commission, Product
from affiliate_manager import get_affiliate_manager
from auth import is_admin_user
from datetime import datetime
import json
import secrets

production_bp = Blueprint('production', __name__, url_prefix='/api')

# Initialize affiliate manager
affiliate_manager = get_affiliate_manager()


@production_bp.route('/offers', methods=['GET'])
@jwt_required()
def get_offers():
    """
    Get affiliate offers from Digistore24 or Awin
    
    Query params:
        network: 'digistore24' or 'awin'
        q: search query (optional)
        page: page number (default 1)
    """
    try:
        network = request.args.get('network', '').lower()
        query = request.args.get('q', '')
        page = int(request.args.get('page', 1))
        
        if network not in ['digistore24', 'awin']:
            return jsonify({'error': 'Invalid network. Use digistore24 or awin'}), 400
        
        # Fetch products from network
        products = affiliate_manager.fetch_from_network(
            network,
            max_results=20,
            category=query if query else 'all'
        )
        
        return jsonify({
            'network': network,
            'products': products,
            'page': page,
            'total': len(products)
        }), 200
        
    except Exception as e:
        print(f"Get offers error: {str(e)}")
        return jsonify({'error': 'Failed to fetch offers'}), 500


@production_bp.route('/offers/<int:offer_id>', methods=['GET'])
@jwt_required()
def get_offer_detail(offer_id):
    """Get detailed information about a specific offer"""
    try:
        # For demo, return mock offer details
        # In production, this would fetch from the network's API
        return jsonify({
            'id': offer_id,
            'name': 'Sample Product',
            'description': 'Detailed product description',
            'price': '$99',
            'commission': '50%',
            'network': 'digistore24'
        }), 200
        
    except Exception as e:
        print(f"Get offer detail error: {str(e)}")
        return jsonify({'error': 'Failed to fetch offer details'}), 500


@production_bp.route('/offers/import', methods=['POST'])
@jwt_required()
def import_offer():
    """
    Import an offer from Digistore24 or Awin
    Admin users have unlimited imports (bypass all limits).
    Regular users are limited by their subscription plan's max_products.
    
    Body:
        {
            "offer_id": "12345",
            "network": "digistore24",
            "earn_mode": "auto"  // or "manual"
        }
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        offer_id = data.get('offer_id')
        network = data.get('network', '').lower()
        earn_mode = data.get('earn_mode', 'auto')
        
        if not offer_id or not network:
            return jsonify({'error': 'offer_id and network are required'}), 400
        
        if network not in ['digistore24', 'awin']:
            return jsonify({'error': 'Invalid network. Use digistore24 or awin'}), 400
        
        if earn_mode not in ['auto', 'manual']:
            return jsonify({'error': 'earn_mode must be auto or manual'}), 400
        
        # Check product limits (admin bypasses this)
        from auth import can_add_products
        can_add, error_msg, current_count, max_allowed = can_add_products(int(current_user_id), 1)
        
        if not can_add:
            return jsonify({
                'error': error_msg,
                'current_products': current_count,
                'max_products': max_allowed,
                'upgrade_required': True
            }), 403
        
        # Fetch product details from network
        products = affiliate_manager.fetch_from_network(network, max_results=50)
        product_data = next((p for p in products if str(p.get('name', '')).lower().find(offer_id.lower()) != -1), None)
        
        if not product_data:
            product_data = {
                'name': f'Product {offer_id}',
                'link': f'https://{network}.com/product/{offer_id}',
                'price': 'N/A',
                'commission': '50%',
                'description': f'Imported from {network}'
            }
        
        # Create ImportedProduct record
        imported_product = ImportedProduct(
            user_id=user.id,
            network=network,
            external_product_id=offer_id,
            product_name=product_data.get('name', f'Product {offer_id}'),
            product_url=product_data.get('link', ''),
            product_image_url=product_data.get('image_url'),
            commission_info=product_data.get('commission', 'N/A'),
            price=product_data.get('price', 'N/A'),
            earn_mode=earn_mode
        )
        
        db.session.add(imported_product)
        
        # Also create Product record for main products table (for compatibility)
        main_product = Product(
            user_id=user.id,
            name=product_data.get('name', f'Product {offer_id}'),
            description=product_data.get('description', f'Imported from {network}'),
            price=product_data.get('price', 'N/A'),
            affiliate_link=product_data.get('link', ''),
            network=network,
            commission_rate=product_data.get('commission', 'N/A'),
            image_url=product_data.get('image_url'),
            is_active=True
        )
        
        db.session.add(main_product)
        db.session.commit()
        
        return jsonify({
            'message': 'Product imported successfully',
            'product': imported_product.to_dict(),
            'main_product_id': main_product.id,
            'earn_mode': earn_mode
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Import offer error: {str(e)}")
        return jsonify({'error': 'Failed to import offer'}), 500


@production_bp.route('/t/<tracking_id>', methods=['GET'])
def track_click(tracking_id):
    """
    Tracking link for affiliate clicks
    Redirects to merchant and records click
    """
    try:
        # Find product by ID
        product = Product.query.get(int(tracking_id))
        
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        # Record click
        click = AffiliateClick(
            product_id=product.id,
            user_id=product.user_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', '')
        )
        
        db.session.add(click)
        db.session.commit()
        
        # Redirect to affiliate link
        return redirect(product.affiliate_link, code=302)
        
    except Exception as e:
        db.session.rollback()
        print(f"Track click error: {str(e)}")
        return jsonify({'error': 'Tracking failed'}), 500


@production_bp.route('/webhook/affiliate/digistore24', methods=['POST'])
def digistore24_webhook():
    """
    Webhook endpoint for Digistore24 commission notifications
    """
    try:
        data = request.get_json() or request.form.to_dict()
        
        # Extract commission data
        # Note: Actual Digistore24 webhook format may vary
        external_ref = data.get('transaction_id') or data.get('order_id')
        amount = float(data.get('affiliate_earnings', 0))
        product_identifier = data.get('product_id') or data.get('product_name')
        
        if not external_ref or amount <= 0:
            return jsonify({'error': 'Invalid webhook data'}), 400
        
        # Find user by product mapping
        user_id = None
        imported_product = None
        
        if product_identifier:
            imported_product = ImportedProduct.query.filter_by(
                external_product_id=product_identifier,
                network='digistore24'
            ).first()
            
            if imported_product:
                user_id = imported_product.user_id
        
        # If no product match found, log and return error instead of guessing
        if not user_id:
            error_msg = f"No product match for Digistore24 webhook. Product ID: {product_identifier}, Transaction: {external_ref}"
            print(f"⚠️  WEBHOOK ERROR: {error_msg}")
            print(f"Webhook data: {json.dumps(data)}")
            
            return jsonify({
                'status': 'error',
                'message': 'Product not found in system',
                'transaction_id': external_ref
            }), 404
        
        # Check for duplicate commission (idempotent handling)
        existing_commission = Commission.query.filter_by(
            network='digistore24',
            external_ref=external_ref
        ).first()
        
        if existing_commission:
            return jsonify({
                'status': 'duplicate',
                'message': 'Commission already recorded',
                'commission_id': existing_commission.id
            }), 200
        
        commission = Commission(
            user_id=user_id,
            network='digistore24',
            amount=amount,
            status='pending',
            external_ref=external_ref,
            product_id=imported_product.id if imported_product else None,
            webhook_data=json.dumps(data)
        )
        
        db.session.add(commission)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'user_id': user_id,
            'commission_id': commission.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Digistore24 webhook error: {str(e)}")
        return jsonify({'error': 'Webhook processing failed'}), 500


@production_bp.route('/webhook/affiliate/awin', methods=['POST'])
def awin_webhook():
    """
    Webhook endpoint for Awin commission notifications
    """
    try:
        data = request.get_json() or request.form.to_dict()
        
        # Extract commission data
        external_ref = data.get('transaction_id') or data.get('awin_transaction_id')
        amount = float(data.get('commission_amount', 0))
        product_identifier = data.get('advertiser_id') or data.get('product_id')
        
        if not external_ref or amount <= 0:
            return jsonify({'error': 'Invalid webhook data'}), 400
        
        # Find user by product mapping
        user_id = None
        imported_product = None
        
        if product_identifier:
            imported_product = ImportedProduct.query.filter_by(
                external_product_id=str(product_identifier),
                network='awin'
            ).first()
            
            if imported_product:
                user_id = imported_product.user_id
        
        # If no product match found, log and return error instead of guessing
        if not user_id:
            error_msg = f"No product match for Awin webhook. Product ID: {product_identifier}, Transaction: {external_ref}"
            print(f"⚠️  WEBHOOK ERROR: {error_msg}")
            print(f"Webhook data: {json.dumps(data)}")
            
            return jsonify({
                'status': 'error',
                'message': 'Product not found in system',
                'transaction_id': external_ref
            }), 404
        
        # Check for duplicate commission (idempotent handling)
        existing_commission = Commission.query.filter_by(
            network='awin',
            external_ref=external_ref
        ).first()
        
        if existing_commission:
            return jsonify({
                'status': 'duplicate',
                'message': 'Commission already recorded',
                'commission_id': existing_commission.id
            }), 200
        
        commission = Commission(
            user_id=user_id,
            network='awin',
            amount=amount,
            status='pending',
            external_ref=external_ref,
            product_id=imported_product.id if imported_product else None,
            webhook_data=json.dumps(data)
        )
        
        db.session.add(commission)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'user_id': user_id,
            'commission_id': commission.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Awin webhook error: {str(e)}")
        return jsonify({'error': 'Webhook processing failed'}), 500


@production_bp.route('/webhook/affiliate/partnerstack', methods=['POST'])
def partnerstack_webhook():
    """
    Webhook endpoint for PartnerStack commission notifications
    """
    try:
        data = request.get_json() or request.form.to_dict()
        
        # Extract commission data
        external_ref = data.get('transaction_key') or data.get('id') or data.get('event_id')
        amount = float(data.get('amount', 0) or data.get('commission_amount', 0))
        product_identifier = data.get('product_key') or data.get('partner_key') or data.get('action')
        
        if not external_ref or amount <= 0:
            return jsonify({'error': 'Invalid webhook data'}), 400
        
        # Check for duplicate commission
        existing_commission = Commission.query.filter_by(
            network='partnerstack',
            external_ref=external_ref
        ).first()
        
        if existing_commission:
            return jsonify({
                'status': 'duplicate',
                'message': 'Commission already recorded',
                'commission_id': existing_commission.id
            }), 200
        
        # Find user by product mapping
        user_id = None
        imported_product = None
        
        if product_identifier:
            imported_product = ImportedProduct.query.filter_by(
                external_product_id=str(product_identifier),
                network='partnerstack'
            ).first()
            
            if imported_product:
                user_id = imported_product.user_id
        
        # If no product match found, log and return error
        if not user_id:
            error_msg = f"No product match for PartnerStack webhook. Product: {product_identifier}, Transaction: {external_ref}"
            print(f"⚠️  WEBHOOK ERROR: {error_msg}")
            print(f"Webhook data: {json.dumps(data)}")
            
            return jsonify({
                'status': 'error',
                'message': 'Product not found in system',
                'transaction_id': external_ref
            }), 404
        
        commission = Commission(
            user_id=user_id,
            network='partnerstack',
            amount=amount,
            status='pending',
            external_ref=external_ref,
            product_id=imported_product.id if imported_product else None,
            webhook_data=json.dumps(data)
        )
        
        db.session.add(commission)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'user_id': user_id,
            'commission_id': commission.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"PartnerStack webhook error: {str(e)}")
        return jsonify({'error': 'Webhook processing failed'}), 500


@production_bp.route('/commissions/user', methods=['GET'])
@jwt_required()
def get_user_commissions():
    """Get all commissions for current user"""
    try:
        current_user_id = get_jwt_identity()
        
        commissions = Commission.query.filter_by(user_id=int(current_user_id)).order_by(
            Commission.created_at.desc()
        ).all()
        
        return jsonify({
            'commissions': [c.to_dict() for c in commissions],
            'total': len(commissions)
        }), 200
        
    except Exception as e:
        print(f"Get user commissions error: {str(e)}")
        return jsonify({'error': 'Failed to fetch commissions'}), 500


@production_bp.route('/commissions/all', methods=['GET'])
@jwt_required()
def get_all_commissions():
    """Get all commissions (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        commissions = Commission.query.order_by(Commission.created_at.desc()).all()
        
        return jsonify({
            'commissions': [c.to_dict() for c in commissions],
            'total': len(commissions)
        }), 200
        
    except Exception as e:
        print(f"Get all commissions error: {str(e)}")
        return jsonify({'error': 'Failed to fetch commissions'}), 500


@production_bp.route('/commissions/<int:commission_id>/mark-paid', methods=['POST'])
@jwt_required()
def mark_commission_paid(commission_id):
    """Mark commission as paid (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        commission = Commission.query.get(commission_id)
        
        if not commission:
            return jsonify({'error': 'Commission not found'}), 404
        
        commission.status = 'paid'
        commission.paid_at = datetime.utcnow()
        
        # Update user balance
        commission_user = User.query.get(commission.user_id)
        if commission_user:
            commission_user.balance += commission.amount
        
        db.session.commit()
        
        return jsonify({
            'message': 'Commission marked as paid',
            'commission': commission.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Mark commission paid error: {str(e)}")
        return jsonify({'error': 'Failed to mark commission as paid'}), 500
