"""
Product management routes
/api/products - CRUD operations
/api/products/import - Bulk import from affiliate networks
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Product, User
from affiliate_manager import get_affiliate_manager
from auth import check_user_blocked
import logging

logger = logging.getLogger(__name__)

products_bp = Blueprint('products', __name__, url_prefix='/api/products')


@products_bp.route('', methods=['GET'])
@jwt_required()
def get_products():
    """Get user's products"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        is_active = request.args.get('is_active', type=lambda v: v.lower() == 'true')
        
        # Build query
        query = Product.query.filter_by(user_id=user_id)
        
        if is_active is not None:
            query = query.filter_by(is_active=is_active)
        
        # Paginate
        pagination = query.order_by(Product.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return jsonify({
            'products': [p.to_dict() for p in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'total_pages': pagination.pages
        }), 200
        
    except Exception as e:
        logger.error(f"Get products error: {e}")
        return jsonify({'error': 'Failed to fetch products'}), 500


@products_bp.route('', methods=['POST'])
@jwt_required()
def create_product():
    """
    Create a new product
    Admin users have unlimited products (bypass all limits).
    Regular users are limited by their subscription plan's max_products.
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
        
        if not data or not data.get('name') or not data.get('affiliate_link'):
            return jsonify({'error': 'Name and affiliate_link are required'}), 400
        
        # Check product limits (admin bypasses this)
        from auth import can_add_products
        can_add, error_msg, current_count, max_allowed = can_add_products(user_id, 1)
        
        if not can_add:
            return jsonify({
                'error': error_msg,
                'current_products': current_count,
                'max_products': max_allowed,
                'upgrade_required': True
            }), 403
        
        product = Product(
            user_id=user_id,
            name=data['name'],
            description=data.get('description'),
            price=data.get('price'),
            affiliate_link=data['affiliate_link'],
            network=data.get('network'),
            category=data.get('category'),
            image_url=data.get('image_url'),
            commission_rate=data.get('commission_rate')
        )
        
        db.session.add(product)
        db.session.commit()
        
        logger.info(f"Product created: {product.id} by user {user_id}")
        
        return jsonify({
            'message': 'Product created successfully',
            'product': product.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create product error: {e}")
        return jsonify({'error': 'Failed to create product'}), 500


@products_bp.route('/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    """Update a product"""
    try:
        user_id = int(get_jwt_identity())
        product = Product.query.filter_by(id=product_id, user_id=user_id).first()
        
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        data = request.get_json()
        
        if data.get('name'):
            product.name = data['name']
        if data.get('description'):
            product.description = data['description']
        if data.get('price'):
            product.price = data['price']
        if data.get('affiliate_link'):
            product.affiliate_link = data['affiliate_link']
        if data.get('network'):
            product.network = data['network']
        if data.get('category'):
            product.category = data['category']
        if data.get('image_url'):
            product.image_url = data['image_url']
        if data.get('commission_rate'):
            product.commission_rate = data['commission_rate']
        if 'is_active' in data:
            product.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Product updated successfully',
            'product': product.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update product error: {e}")
        return jsonify({'error': 'Failed to update product'}), 500


@products_bp.route('/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    """Delete a product"""
    try:
        user_id = int(get_jwt_identity())
        product = Product.query.filter_by(id=product_id, user_id=user_id).first()
        
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        db.session.delete(product)
        db.session.commit()
        
        return jsonify({'message': 'Product deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete product error: {e}")
        return jsonify({'error': 'Failed to delete product'}), 500


@products_bp.route('/import', methods=['POST'])
@jwt_required()
def import_products():
    """
    Import products from affiliate networks
    Admin users have unlimited imports (bypass all limits).
    Regular users are limited by their subscription plan's max_products.
    
    Request body:
    {
        "network": "clickbank",  // or "shareasale", "amazon", etc.
        "max_results": 10
    }
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        network = data.get('network', '').lower().strip()
        max_results = data.get('max_results', 10)
        
        if not network:
            return jsonify({'error': 'Network is required'}), 400
        
        # Get affiliate manager
        affiliate_manager = get_affiliate_manager()
        
        # Fetch products from network
        products = affiliate_manager.fetch_from_network(network, max_results=max_results)
        
        if not products:
            return jsonify({'error': f'No products found from {network}'}), 404
        
        # Check product limits (admin bypasses this)
        from auth import can_add_products
        can_add, error_msg, current_count, max_allowed = can_add_products(user_id, len(products))
        
        if not can_add:
            return jsonify({
                'error': error_msg,
                'current_products': current_count,
                'max_products': max_allowed,
                'attempted_import': len(products),
                'upgrade_required': True
            }), 403
        
        imported_count = 0
        updated_count = 0
        skipped_count = 0
        
        for product_data in products:
            affiliate_link = product_data.get('link', product_data.get('affiliate_link', ''))
            product_name = product_data.get('name', 'Untitled')
            
            if not affiliate_link:
                skipped_count += 1
                continue
            
            existing = Product.query.filter_by(
                user_id=user_id,
                affiliate_link=affiliate_link
            ).first()
            
            if existing:
                existing.name = product_name
                existing.description = product_data.get('description', existing.description or '')
                existing.price = product_data.get('price', existing.price or 'N/A')
                existing.category = product_data.get('category', existing.category or '')
                existing.image_url = product_data.get('image', product_data.get('image_url', existing.image_url))
                existing.commission_rate = product_data.get('commission', product_data.get('commission_rate', existing.commission_rate))
                updated_count += 1
            else:
                product = Product(
                    user_id=user_id,
                    name=product_name,
                    description=product_data.get('description', ''),
                    price=product_data.get('price', 'N/A'),
                    affiliate_link=affiliate_link,
                    network=network,
                    category=product_data.get('category', ''),
                    image_url=product_data.get('image', product_data.get('image_url')),
                    commission_rate=product_data.get('commission', product_data.get('commission_rate'))
                )
                db.session.add(product)
                imported_count += 1
        
        db.session.commit()
        
        logger.info(f"Import from {network}: {imported_count} new, {updated_count} updated, {skipped_count} skipped for user {user_id}")
        
        return jsonify({
            'message': f'Successfully processed products from {network}',
            'imported': imported_count,
            'updated': updated_count,
            'skipped': skipped_count,
            'network': network
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Import products error: {e}")
        return jsonify({'error': 'Failed to import products'}), 500
