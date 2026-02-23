"""
Real Estate & Rentals Module Routes
/api/properties - CRUD operations for property listings
/api/properties/bookings - Booking management
/api/admin/properties - Admin approval workflow
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Property, PropertyImage, RentalDetails, PropertyBooking, PropertyAd, User, CreditWallet
from auth import is_admin_user, check_user_blocked
from datetime import datetime, timedelta
import logging
import json
import re
from decimal import Decimal

logger = logging.getLogger(__name__)

real_estate_bp = Blueprint('real_estate', __name__)

PROPERTY_TYPES = ['land', 'house', 'rental', 'guest_house', 'car_rental']
CAMEROON_CITIES = ['Douala', 'Yaounde', 'Bamenda', 'Bafoussam', 'Garoua', 'Maroua', 'Ngaoundere', 'Bertoua', 'Limbe', 'Buea', 'Kribi', 'Ebolowa']


def can_add_property(user_id: int) -> tuple:
    """Check if user can add more properties based on their plan"""
    user = User.query.get(user_id)
    if not user:
        return False, "User not found", 0, 0
    
    if user.is_admin:
        return True, None, 0, float('inf')
    
    from models import Subscription, Plan
    active_sub = Subscription.query.filter_by(
        user_id=user_id, 
        status='active'
    ).first()
    
    if active_sub and active_sub.plan:
        max_properties = active_sub.plan.max_products or 10
    else:
        max_properties = 3
    
    current_count = Property.query.filter_by(user_id=user_id).filter(
        Property.status != 'archived'
    ).count()
    
    if current_count >= max_properties:
        return False, f"Property limit reached ({current_count}/{max_properties}). Upgrade your plan for more.", current_count, max_properties
    
    return True, None, current_count, max_properties


@real_estate_bp.route('/api/properties', methods=['GET'])
@jwt_required()
def get_properties():
    """Get user's properties or all approved properties (public)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        property_type = request.args.get('type')
        city = request.args.get('city')
        my_listings = request.args.get('my_listings', 'false').lower() == 'true'
        
        if my_listings:
            query = Property.query.filter_by(user_id=user_id)
        else:
            query = Property.query.filter_by(status='approved', is_active=True)
        
        if property_type:
            query = query.filter_by(property_type=property_type)
        if city:
            query = query.filter_by(city=city)
        
        pagination = query.order_by(Property.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'properties': [p.to_dict() for p in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'total_pages': pagination.pages
        }), 200
        
    except Exception as e:
        logger.error(f"Get properties error: {e}")
        return jsonify({'error': 'Failed to fetch properties'}), 500


@real_estate_bp.route('/api/properties', methods=['POST'])
@jwt_required()
def create_property():
    """Create a new property listing (pending approval)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        is_blocked, block_message = check_user_blocked(user_id)
        if is_blocked:
            return jsonify({'error': block_message}), 403
        
        can_add, error_msg, current, max_allowed = can_add_property(user_id)
        if not can_add:
            return jsonify({
                'error': error_msg,
                'current_count': current,
                'max_allowed': max_allowed
            }), 403
        
        data = request.get_json()
        
        if not data.get('title') or not data.get('property_type') or not data.get('city'):
            return jsonify({'error': 'Title, property_type, and city are required'}), 400
        
        if data['property_type'] not in PROPERTY_TYPES:
            return jsonify({'error': f'Invalid property type. Must be one of: {PROPERTY_TYPES}'}), 400
        
        status = 'approved' if user.is_admin else 'pending'
        
        raw_price = data.get('price')
        price_val = None
        if raw_price is not None:
            if isinstance(raw_price, str):
                cleaned = re.sub(r"[^\d\.]+", "", raw_price).strip()
                price_val = Decimal(cleaned) if cleaned != "" else None
            else:
                price_val = Decimal(str(raw_price))

        property_obj = Property(
            user_id=user_id,
            title=data['title'],
            description=data.get('description'),
            property_type=data['property_type'],
            country='Cameroon',
            city=data['city'],
            address=data.get('address'),
            price=price_val,
            currency=data.get('currency', 'XAF'),
            price_type=data.get('price_type'),
            bedrooms=data.get('bedrooms'),
            bathrooms=data.get('bathrooms'),
            size_sqm=data.get('size_sqm'),
            amenities=json.dumps(data.get('amenities', [])) if data.get('amenities') else None,
            status=status
        )
        db.session.add(property_obj)
        db.session.flush()
        
        if data['property_type'] in ['rental', 'guest_house', 'car_rental']:
            rental_data = data.get('rental_details', {})
            def parse_money(v):
                if v is None:
                    return None
                if isinstance(v, str):
                    cleaned = re.sub(r"[^\d\.]+", "", v).strip()
                    return Decimal(cleaned) if cleaned != "" else None
                return Decimal(str(v))

            rental_details = RentalDetails(
                property_id=property_obj.id,
                daily_rate=parse_money(rental_data.get('daily_rate')),
                weekly_rate=parse_money(rental_data.get('weekly_rate')),
                monthly_rate=parse_money(rental_data.get('monthly_rate')),
                min_stay_days=rental_data.get('min_stay_days', 1),
                max_stay_days=rental_data.get('max_stay_days'),
                max_guests=rental_data.get('max_guests'),
                vehicle_make=rental_data.get('vehicle_make'),
                vehicle_model=rental_data.get('vehicle_model'),
                vehicle_year=rental_data.get('vehicle_year'),
                vehicle_type=rental_data.get('vehicle_type'),
                deposit_required=parse_money(rental_data.get('deposit_required')),
                cancellation_policy=rental_data.get('cancellation_policy', 'flexible')
            )
            db.session.add(rental_details)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Property created successfully' + (' (auto-approved for admin)' if user.is_admin else ' (pending approval)'),
            'property': property_obj.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create property error: {e}")
        return jsonify({'error': 'Failed to create property'}), 500


@real_estate_bp.route('/api/properties/<int:property_id>', methods=['GET'])
@jwt_required()
def get_property(property_id):
    """Get a single property"""
    try:
        property_obj = Property.query.get(property_id)
        
        if not property_obj:
            return jsonify({'error': 'Property not found'}), 404
        
        return jsonify({'property': property_obj.to_dict()}), 200
        
    except Exception as e:
        logger.error(f"Get property error: {e}")
        return jsonify({'error': 'Failed to fetch property'}), 500


@real_estate_bp.route('/api/properties/<int:property_id>', methods=['PUT'])
@jwt_required()
def update_property(property_id):
    """Update a property (owner or admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        property_obj = Property.query.get(property_id)
        
        if not property_obj:
            return jsonify({'error': 'Property not found'}), 404
        
        if property_obj.user_id != user_id and not user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        if 'title' in data:
            property_obj.title = data['title']
        if 'description' in data:
            property_obj.description = data['description']
        if 'city' in data:
            property_obj.city = data['city']
        if 'address' in data:
            property_obj.address = data['address']
        if 'price' in data:
            raw_price = data.get('price')
            if raw_price is None:
                property_obj.price = None
            else:
                if isinstance(raw_price, str):
                    cleaned = re.sub(r"[^\d\.]+", "", raw_price).strip()
                    property_obj.price = Decimal(cleaned) if cleaned != "" else None
                else:
                    property_obj.price = Decimal(str(raw_price))
        if 'price_type' in data:
            property_obj.price_type = data['price_type']
        if 'bedrooms' in data:
            property_obj.bedrooms = data['bedrooms']
        if 'bathrooms' in data:
            property_obj.bathrooms = data['bathrooms']
        if 'size_sqm' in data:
            property_obj.size_sqm = data['size_sqm']
        if 'amenities' in data:
            property_obj.amenities = json.dumps(data['amenities'])
        if 'is_active' in data:
            property_obj.is_active = data['is_active']
        
        if not user.is_admin and property_obj.status == 'approved':
            pass
        
        db.session.commit()
        
        return jsonify({
            'message': 'Property updated successfully',
            'property': property_obj.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update property error: {e}")
        return jsonify({'error': 'Failed to update property'}), 500


@real_estate_bp.route('/api/properties/<int:property_id>', methods=['DELETE'])
@jwt_required()
def delete_property(property_id):
    """Archive a property (soft delete)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        property_obj = Property.query.get(property_id)
        
        if not property_obj:
            return jsonify({'error': 'Property not found'}), 404
        
        if property_obj.user_id != user_id and not user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403
        
        property_obj.status = 'archived'
        property_obj.is_active = False
        db.session.commit()
        
        return jsonify({'message': 'Property archived successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete property error: {e}")
        return jsonify({'error': 'Failed to archive property'}), 500


@real_estate_bp.route('/api/properties/<int:property_id>/images', methods=['POST'])
@jwt_required()
def add_property_image(property_id):
    """Add an image to a property"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        property_obj = Property.query.get(property_id)
        
        if not property_obj:
            return jsonify({'error': 'Property not found'}), 404
        
        if property_obj.user_id != user_id and not user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        if not data.get('image_url'):
            return jsonify({'error': 'image_url is required'}), 400
        
        is_primary = data.get('is_primary', False)
        if is_primary:
            PropertyImage.query.filter_by(property_id=property_id, is_primary=True).update({'is_primary': False})
        
        image = PropertyImage(
            property_id=property_id,
            image_url=data['image_url'],
            caption=data.get('caption'),
            is_primary=is_primary,
            display_order=data.get('display_order', 0)
        )
        db.session.add(image)
        db.session.commit()
        
        return jsonify({
            'message': 'Image added successfully',
            'image': image.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Add property image error: {e}")
        return jsonify({'error': 'Failed to add image'}), 500


@real_estate_bp.route('/api/properties/<int:property_id>/boost', methods=['POST'])
@jwt_required()
def boost_property(property_id):
    """Boost a property listing with ad credits"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        property_obj = Property.query.get(property_id)
        
        if not property_obj:
            return jsonify({'error': 'Property not found'}), 404
        
        if property_obj.user_id != user_id and not user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403
        
        if property_obj.status != 'approved':
            return jsonify({'error': 'Property must be approved before boosting'}), 400
        
        is_blocked, block_message = check_user_blocked(user_id)
        if is_blocked:
            return jsonify({'error': block_message}), 403
        
        active_ad = PropertyAd.query.filter_by(
            property_id=property_id,
            status='active'
        ).first()
        
        if active_ad:
            return jsonify({'error': 'Property already has an active boost'}), 400
        
        credits_cost = 10
        if not user.is_admin:
            wallet = CreditWallet.query.filter_by(user_id=user_id).first()
            if not wallet or wallet.credits < credits_cost:
                return jsonify({'error': f'Insufficient credits. Need {credits_cost} credits.'}), 400
            wallet.credits -= credits_cost
            wallet.total_spent += credits_cost
        else:
            credits_cost = 0
        
        property_ad = PropertyAd(
            property_id=property_id,
            user_id=user_id,
            boost_level=1,
            credits_spent=credits_cost,
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        db.session.add(property_ad)
        db.session.commit()
        
        return jsonify({
            'message': 'Property boosted successfully' + (' (FREE for admin)' if user.is_admin else ''),
            'property_ad': property_ad.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Boost property error: {e}")
        return jsonify({'error': 'Failed to boost property'}), 500


@real_estate_bp.route('/api/properties/bookings', methods=['GET'])
@jwt_required()
def get_my_bookings():
    """Get user's bookings (as tenant or property owner)"""
    try:
        user_id = int(get_jwt_identity())
        role = request.args.get('role', 'tenant')
        
        if role == 'owner':
            my_properties = Property.query.filter_by(user_id=user_id).all()
            property_ids = [p.id for p in my_properties]
            bookings = PropertyBooking.query.filter(
                PropertyBooking.property_id.in_(property_ids)
            ).order_by(PropertyBooking.created_at.desc()).all()
        else:
            bookings = PropertyBooking.query.filter_by(
                user_id=user_id
            ).order_by(PropertyBooking.created_at.desc()).all()
        
        return jsonify({
            'bookings': [b.to_dict() for b in bookings]
        }), 200
        
    except Exception as e:
        logger.error(f"Get bookings error: {e}")
        return jsonify({'error': 'Failed to fetch bookings'}), 500


@real_estate_bp.route('/api/properties/<int:property_id>/book', methods=['POST'])
@jwt_required()
def create_booking(property_id):
    """Create a booking request for a property"""
    try:
        user_id = int(get_jwt_identity())
        property_obj = Property.query.get(property_id)
        
        if not property_obj:
            return jsonify({'error': 'Property not found'}), 404
        
        if property_obj.status != 'approved':
            return jsonify({'error': 'Property is not available for booking'}), 400
        
        if property_obj.property_type not in ['rental', 'guest_house', 'car_rental']:
            return jsonify({'error': 'This property type does not accept bookings'}), 400
        
        data = request.get_json()
        
        if not data.get('check_in') or not data.get('check_out'):
            return jsonify({'error': 'check_in and check_out dates are required'}), 400
        
        check_in = datetime.fromisoformat(data['check_in'].replace('Z', '+00:00'))
        check_out = datetime.fromisoformat(data['check_out'].replace('Z', '+00:00'))
        
        if check_in >= check_out:
            return jsonify({'error': 'check_out must be after check_in'}), 400
        
        days = (check_out - check_in).days
        rental_details = property_obj.rental_details
        
        if rental_details:
            if rental_details.daily_rate:
                total_price = days * rental_details.daily_rate
            elif property_obj.price:
                total_price = days * property_obj.price
            else:
                total_price = 0
        else:
            total_price = days * (property_obj.price or 0)
        
        booking = PropertyBooking(
            property_id=property_id,
            user_id=user_id,
            check_in=check_in,
            check_out=check_out,
            guests=data.get('guests', 1),
            total_price=total_price,
            guest_notes=data.get('notes')
        )
        db.session.add(booking)
        db.session.commit()
        
        return jsonify({
            'message': 'Booking request submitted',
            'booking': booking.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create booking error: {e}")
        return jsonify({'error': 'Failed to create booking'}), 500


@real_estate_bp.route('/api/bookings/<int:booking_id>/confirm', methods=['POST'])
@jwt_required()
def confirm_booking(booking_id):
    """Confirm a booking (property owner only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        booking = PropertyBooking.query.get(booking_id)
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        if booking.property.user_id != user_id and not user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403
        
        booking.status = 'confirmed'
        booking.confirmed_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Booking confirmed',
            'booking': booking.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Confirm booking error: {e}")
        return jsonify({'error': 'Failed to confirm booking'}), 500


@real_estate_bp.route('/api/bookings/<int:booking_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_booking(booking_id):
    """Cancel a booking"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        booking = PropertyBooking.query.get(booking_id)
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        if booking.user_id != user_id and booking.property.user_id != user_id and not user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403
        
        booking.status = 'cancelled'
        booking.cancelled_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Booking cancelled',
            'booking': booking.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Cancel booking error: {e}")
        return jsonify({'error': 'Failed to cancel booking'}), 500


@real_estate_bp.route('/api/admin/properties', methods=['GET'])
@jwt_required()
def admin_get_properties():
    """Admin: Get all properties with filters"""
    try:
        user_id = int(get_jwt_identity())
        if not is_admin_user(user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        property_type = request.args.get('type')
        
        query = Property.query
        
        if status:
            query = query.filter_by(status=status)
        if property_type:
            query = query.filter_by(property_type=property_type)
        
        pagination = query.order_by(Property.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        pending_count = Property.query.filter_by(status='pending').count()
        approved_count = Property.query.filter_by(status='approved').count()
        
        return jsonify({
            'properties': [p.to_dict() for p in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'total_pages': pagination.pages,
            'pending_count': pending_count,
            'approved_count': approved_count
        }), 200
        
    except Exception as e:
        logger.error(f"Admin get properties error: {e}")
        return jsonify({'error': 'Failed to fetch properties'}), 500


@real_estate_bp.route('/api/admin/properties/<int:property_id>/approve', methods=['POST'])
@jwt_required()
def admin_approve_property(property_id):
    """Admin: Approve a property listing"""
    try:
        user_id = int(get_jwt_identity())
        if not is_admin_user(user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        property_obj = Property.query.get(property_id)
        if not property_obj:
            return jsonify({'error': 'Property not found'}), 404
        
        data = request.get_json() or {}
        
        property_obj.status = 'approved'
        property_obj.reviewed_by = user_id
        property_obj.reviewed_at = datetime.utcnow()
        property_obj.review_note = data.get('note')
        property_obj.is_featured = data.get('is_featured', False)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Property approved',
            'property': property_obj.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Admin approve property error: {e}")
        return jsonify({'error': 'Failed to approve property'}), 500


@real_estate_bp.route('/api/admin/properties/<int:property_id>/reject', methods=['POST'])
@jwt_required()
def admin_reject_property(property_id):
    """Admin: Reject a property listing"""
    try:
        user_id = int(get_jwt_identity())
        if not is_admin_user(user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        property_obj = Property.query.get(property_id)
        if not property_obj:
            return jsonify({'error': 'Property not found'}), 404
        
        data = request.get_json() or {}
        
        property_obj.status = 'rejected'
        property_obj.reviewed_by = user_id
        property_obj.reviewed_at = datetime.utcnow()
        property_obj.review_note = data.get('reason', 'Rejected by admin')
        
        db.session.commit()
        
        return jsonify({
            'message': 'Property rejected',
            'property': property_obj.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Admin reject property error: {e}")
        return jsonify({'error': 'Failed to reject property'}), 500


@real_estate_bp.route('/api/properties/types', methods=['GET'])
def get_property_types():
    """Get available property types"""
    return jsonify({
        'types': PROPERTY_TYPES,
        'cities': CAMEROON_CITIES
    }), 200


@real_estate_bp.route('/api/properties/stats', methods=['GET'])
@jwt_required()
def get_property_stats():
    """Get user's property statistics"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if user.is_admin:
            total = Property.query.count()
            pending = Property.query.filter_by(status='pending').count()
            approved = Property.query.filter_by(status='approved').count()
            total_bookings = PropertyBooking.query.count()
            pending_bookings = PropertyBooking.query.filter_by(status='pending').count()
        else:
            total = Property.query.filter_by(user_id=user_id).count()
            pending = Property.query.filter_by(user_id=user_id, status='pending').count()
            approved = Property.query.filter_by(user_id=user_id, status='approved').count()
            
            my_properties = Property.query.filter_by(user_id=user_id).all()
            property_ids = [p.id for p in my_properties]
            total_bookings = PropertyBooking.query.filter(PropertyBooking.property_id.in_(property_ids)).count() if property_ids else 0
            pending_bookings = PropertyBooking.query.filter(
                PropertyBooking.property_id.in_(property_ids),
                PropertyBooking.status == 'pending'
            ).count() if property_ids else 0
        
        can_add, _, current, max_allowed = can_add_property(user_id)
        
        return jsonify({
            'total_properties': total,
            'pending_approval': pending,
            'approved': approved,
            'total_bookings': total_bookings,
            'pending_bookings': pending_bookings,
            'can_add_property': can_add,
            'current_count': current,
            'max_allowed': max_allowed if not user.is_admin else 'unlimited'
        }), 200
        
    except Exception as e:
        logger.error(f"Get property stats error: {e}")
        return jsonify({'error': 'Failed to fetch stats'}), 500


@real_estate_bp.route('/api/admin/properties', methods=['POST'])
@jwt_required()
def admin_create_property():
    """Admin: Create a property listing (auto-approved, no limits)"""
    try:
        user_id = int(get_jwt_identity())
        if not is_admin_user(user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request data required'}), 400
        
        title = data.get('title')
        property_type = data.get('property_type')
        city = data.get('city')
        
        if not all([title, property_type, city]):
            return jsonify({'error': 'Title, property type, and city are required'}), 400
        
        if property_type not in PROPERTY_TYPES:
            return jsonify({'error': f'Invalid property type. Must be one of: {PROPERTY_TYPES}'}), 400
        
        if city not in CAMEROON_CITIES:
            return jsonify({'error': f'Invalid city. Must be one of: {CAMEROON_CITIES}'}), 400
        
        property_obj = Property(
            user_id=user_id,
            title=title,
            description=data.get('description', ''),
            property_type=property_type,
            city=city,
            address=data.get('address', ''),
            price=data.get('price'),
            price_type=data.get('price_type', 'fixed'),
            bedrooms=data.get('bedrooms'),
            bathrooms=data.get('bathrooms'),
            size_sqm=data.get('size_sqm'),
            amenities=json.dumps(data.get('amenities', [])) if data.get('amenities') else None,
            status='approved',
            reviewed_by=user_id,
            reviewed_at=datetime.utcnow(),
            is_featured=data.get('is_featured', False)
        )
        
        db.session.add(property_obj)
        db.session.flush()
        
        if property_type in ['rental', 'guest_house', 'car_rental'] and data.get('rental_details'):
            rd = data['rental_details']
            rental_details = RentalDetails(
                property_id=property_obj.id,
                daily_rate=rd.get('daily_rate'),
                weekly_rate=rd.get('weekly_rate'),
                monthly_rate=rd.get('monthly_rate'),
                min_stay_days=rd.get('min_stay_days', 1),
                max_stay_days=rd.get('max_stay_days'),
                max_guests=rd.get('max_guests'),
                vehicle_make=rd.get('vehicle_make'),
                vehicle_model=rd.get('vehicle_model'),
                vehicle_year=rd.get('vehicle_year'),
                vehicle_type=rd.get('vehicle_type'),
                deposit_required=rd.get('deposit_required'),
                cancellation_policy=rd.get('cancellation_policy', 'flexible')
            )
            db.session.add(rental_details)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Property created and auto-approved',
            'property': property_obj.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Admin create property error: {e}")
        return jsonify({'error': 'Failed to create property'}), 500


@real_estate_bp.route('/api/admin/properties/<int:property_id>/run-ad', methods=['POST'])
@jwt_required()
def admin_run_property_ad(property_id):
    """Admin: Run ad for property (FREE, no credit cost)"""
    try:
        user_id = int(get_jwt_identity())
        if not is_admin_user(user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        property_obj = Property.query.get(property_id)
        if not property_obj:
            return jsonify({'error': 'Property not found'}), 404
        
        existing_ad = PropertyAd.query.filter_by(
            property_id=property_id,
            status='active'
        ).first()
        
        if existing_ad:
            return jsonify({
                'message': 'Property already has an active ad',
                'ad': existing_ad.to_dict()
            }), 200
        
        data = request.get_json() or {}
        duration_days = data.get('duration_days', 7)
        boost_level = data.get('boost_level', 1)
        
        property_ad = PropertyAd(
            property_id=property_id,
            user_id=property_obj.user_id,
            boost_level=boost_level,
            credits_spent=0,
            status='active',
            started_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=duration_days)
        )
        
        db.session.add(property_ad)
        db.session.commit()
        
        return jsonify({
            'message': 'Ad created successfully (FREE for admin)',
            'ad': property_ad.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Admin run property ad error: {e}")
        return jsonify({'error': 'Failed to create ad'}), 500


@real_estate_bp.route('/api/admin/properties/run-all-ads', methods=['POST'])
@jwt_required()
def admin_run_all_property_ads():
    """Admin: Run ads for all approved properties (FREE)"""
    try:
        user_id = int(get_jwt_identity())
        if not is_admin_user(user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json() or {}
        duration_days = data.get('duration_days', 7)
        
        properties = Property.query.filter_by(
            status='approved',
            is_active=True
        ).all()
        
        ads_created = 0
        ads_skipped = 0
        
        for prop in properties:
            existing_ad = PropertyAd.query.filter_by(
                property_id=prop.id,
                status='active'
            ).first()
            
            if existing_ad:
                ads_skipped += 1
                continue
            
            property_ad = PropertyAd(
                property_id=prop.id,
                user_id=prop.user_id,
                boost_level=1,
                credits_spent=0,
                status='active',
                started_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=duration_days)
            )
            db.session.add(property_ad)
            ads_created += 1
        
        db.session.commit()
        
        return jsonify({
            'message': f'Created {ads_created} ads, skipped {ads_skipped} (already have active ads)',
            'ads_created': ads_created,
            'ads_skipped': ads_skipped,
            'total_properties': len(properties)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Admin run all property ads error: {e}")
        return jsonify({'error': 'Failed to create ads'}), 500
