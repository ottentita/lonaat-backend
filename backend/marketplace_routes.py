"""
Marketplace routes
- GET /api/market/categories - list categories from products/imported_products
- GET /api/market/listings - list products (filter by category or seller)
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Product, ImportedProduct, User
from sqlalchemy import func
import logging

logger = logging.getLogger(__name__)

marketplace_bp = Blueprint('marketplace', __name__, url_prefix='/api/market')


@marketplace_bp.route('/categories', methods=['GET'])
def get_categories():
    """Return distinct categories from Product and ImportedProduct"""
    try:
        prod_cats = db.session.query(func.distinct(Product.category)).filter(Product.category != None).all()
        imp_cats = db.session.query(func.distinct(ImportedProduct.category)).filter(ImportedProduct.category != None).all()

        # Extract values from tuples and merge unique
        categories = set([c[0] for c in prod_cats if c[0]]) | set([c[0] for c in imp_cats if c[0]])
        categories_list = sorted(list(categories))

        return jsonify({'categories': categories_list}), 200
    except Exception as e:
        logger.error(f"Get categories error: {e}")
        return jsonify({'error': 'Failed to fetch categories'}), 500


def normalize_item(item, source='product'):
    if source == 'product':
        return {
            'id': item.id,
            'seller_id': item.user_id,
            'name': item.name,
            'description': item.description,
            'price': item.price,
            'affiliate_link': item.affiliate_link,
            'network': item.network,
            'category': item.category,
            'image_url': item.image_url,
            'source': 'product',
            'created_at': item.created_at.isoformat() if item.created_at else None
        }
    else:
        return {
            'id': item.id,
            'seller_id': item.user_id,
            'name': item.product_name,
            'description': item.extra_data.get('description') if item.extra_data else None,
            'price': item.price,
            'affiliate_link': item.product_url,
            'network': item.network,
            'category': item.category,
            'image_url': item.product_image_url,
            'source': 'imported',
            'created_at': item.created_at.isoformat() if item.created_at else None
        }


@marketplace_bp.route('/listings', methods=['GET'])
def get_listings():
    """Return marketplace listings combining Product and ImportedProduct

    Query params: category, seller_id, page, per_page
    """
    try:
        category = request.args.get('category')
        seller_id = request.args.get('seller_id', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Query products
        prod_q = Product.query.filter(Product.is_active == True)
        imp_q = ImportedProduct.query.filter(ImportedProduct.is_active == True)

        if category:
            prod_q = prod_q.filter(Product.category == category)
            imp_q = imp_q.filter(ImportedProduct.category == category)

        if seller_id:
            prod_q = prod_q.filter(Product.user_id == seller_id)
            imp_q = imp_q.filter(ImportedProduct.user_id == seller_id)

        prods = prod_q.order_by(Product.created_at.desc()).limit(1000).all()
        imps = imp_q.order_by(ImportedProduct.created_at.desc()).limit(1000).all()

        items = [normalize_item(p, 'product') for p in prods] + [normalize_item(i, 'imported') for i in imps]

        # Sort by created_at desc
        items.sort(key=lambda x: x.get('created_at') or '', reverse=True)

        # Simple pagination
        total = len(items)
        start = (page - 1) * per_page
        end = start + per_page
        paged = items[start:end]

        return jsonify({
            'total': total,
            'page': page,
            'per_page': per_page,
            'items': paged
        }), 200
    except Exception as e:
        logger.error(f"Get listings error: {e}")
        return jsonify({'error': 'Failed to fetch listings'}), 500
