from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from affiliate_manager import manager
from models import db as sqlalchemy_db, User
from models_network_connection import NetworkConnection
import logging

logger = logging.getLogger(__name__)

networks_bp = Blueprint('networks', __name__, url_prefix='/api/networks')


@networks_bp.route('/list', methods=['GET'])
@jwt_required(optional=True)
def list_networks():
    try:
        current_user_id = get_jwt_identity()
        networks = manager.get_available_networks()
        setup_instructions = manager.get_setup_instructions()
        
        connected_ids = set()
        if current_user_id:
            user_connections = NetworkConnection.query.filter_by(
                user_id=current_user_id,
                is_active=True
            ).all()
            connected_ids = {conn.network_id for conn in user_connections}
        
        network_details = []
        for network in networks:
            status = 'connected' if network in connected_ids else 'demo'
            network_details.append({
                'id': network,
                'name': network.title(),
                'status': status,
                'setup_url': setup_instructions.get(network, 'N/A')
            })
        
        return jsonify({
            'success': True,
            'networks': network_details,
            'total': len(networks)
        }), 200
        
    except Exception as e:
        logger.error(f"Error listing networks: {e}")
        return jsonify({'error': str(e)}), 500


@networks_bp.route('/connect', methods=['POST'])
@jwt_required()
def connect_network():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        network_id = data.get('network_id')
        affiliate_id = data.get('affiliate_id')
        api_key = data.get('api_key')
        api_secret = data.get('api_secret')
        
        if not network_id or not affiliate_id:
            return jsonify({'error': 'network_id and affiliate_id required'}), 400
        
        connection = NetworkConnection.query.filter_by(
            user_id=current_user_id,
            network_id=network_id
        ).first()
        
        if connection:
            connection.affiliate_id = affiliate_id
            connection.api_key = api_key
            connection.api_secret = api_secret
            connection.is_active = True
        else:
            connection = NetworkConnection(
                user_id=current_user_id,
                network_id=network_id,
                affiliate_id=affiliate_id,
                api_key=api_key,
                api_secret=api_secret
            )
            sqlalchemy_db.session.add(connection)
        
        sqlalchemy_db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'{network_id.title()} connection saved',
            'connection': connection.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Error connecting network: {e}")
        sqlalchemy_db.session.rollback()
        return jsonify({'error': str(e)}), 500


@networks_bp.route('/import', methods=['POST'])
@jwt_required()
def import_products():
    try:
        data = request.get_json()
        url = data.get('url', '')
        products = []
        
        if 'amazon' in url.lower():
            products = manager.fetch_from_network('amazon', max_results=10)
        elif 'clickbank' in url.lower():
            products = manager.fetch_from_network('clickbank', max_results=10)
        elif 'shareasale' in url.lower():
            products = manager.fetch_from_network('shareasale', max_results=10)
        else:
            return jsonify({'error': 'Network not auto-detected from URL'}), 400
        
        return jsonify({
            'success': True,
            'products': products,
            'count': len(products)
        }), 200
        
    except Exception as e:
        logger.error(f"Error importing products: {e}")
        return jsonify({'error': str(e)}), 500
