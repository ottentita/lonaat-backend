from flask import Blueprint, request, jsonify, redirect
from flask_jwt_extended import jwt_required, get_jwt_identity
from social_manager import manager
from models import db as sqlalchemy_db, User, SocialConnection
from oauth_state_store import oauth_state_store
from datetime import datetime, timedelta
import secrets
import logging

logger = logging.getLogger(__name__)

social_bp = Blueprint('social', __name__, url_prefix='/api/social')


@social_bp.route('/platforms', methods=['GET'])
def get_platforms():
    platforms_info = manager.get_platform_info()
    return jsonify({
        'success': True,
        'platforms': platforms_info
    }), 200


@social_bp.route('/connect/<platform>', methods=['GET'])
@jwt_required()
def initiate_connection(platform):
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        redirect_uri = request.args.get('redirect_uri', f'{request.host_url}api/social/callback/{platform}')
        state = secrets.token_urlsafe(32)
        
        oauth_state_store.create_state(state, current_user_id, platform, redirect_uri)
        
        auth_url = manager.get_authorization_url(platform, redirect_uri, state)
        
        if not auth_url:
            return jsonify({
                'error': f'OAuth not configured for {platform}',
                'message': 'Platform credentials not set in environment'
            }), 503
        
        return jsonify({
            'success': True,
            'authorization_url': auth_url,
            'state': state
        }), 200
        
    except Exception as e:
        logger.error(f"Error initiating {platform} connection: {e}")
        return jsonify({'error': str(e)}), 500


@social_bp.route('/callback/<platform>', methods=['GET'])
def oauth_callback(platform):
    try:
        code = request.args.get('code')
        state = request.args.get('state')
        
        if not code or not state:
            return jsonify({'error': 'Missing code or state parameter'}), 400
        
        state_data = oauth_state_store.get_and_remove_state(state)
        if not state_data:
            return jsonify({'error': 'Invalid or expired state'}), 400
        
        if state_data['platform'] != platform:
            return jsonify({'error': 'Platform mismatch'}), 400
        
        user_id = state_data['user_id']
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        code = request.args.get('code')
        state = request.args.get('state')
        
        if not code:
            return jsonify({'error': 'Authorization code missing'}), 400
        
        redirect_uri = request.args.get('redirect_uri', f'{request.host_url}api/social/callback/{platform}')
        
        token_data = manager.exchange_code(platform, code, redirect_uri)
        
        profile = manager.get_user_profile(platform, token_data['access_token'])
        
        connection = SocialConnection.query.filter_by(
            user_id=user.id,
            platform=platform
        ).first()
        
        if connection:
            connection.access_token = token_data['access_token']
            connection.refresh_token = token_data.get('refresh_token')
            connection.token_expires_at = datetime.utcnow() + timedelta(seconds=token_data.get('expires_in', 3600))
            connection.platform_user_id = profile.get('id', profile.get('open_id'))
            connection.platform_username = profile.get('name', profile.get('display_name'))
            connection.updated_at = datetime.utcnow()
        else:
            connection = SocialConnection(
                user_id=user.id,
                platform=platform,
                platform_user_id=profile.get('id', profile.get('open_id')),
                platform_username=profile.get('name', profile.get('display_name')),
                access_token=token_data['access_token'],
                refresh_token=token_data.get('refresh_token'),
                token_expires_at=datetime.utcnow() + timedelta(seconds=token_data.get('expires_in', 3600))
            )
            sqlalchemy_db.session.add(connection)
        
        sqlalchemy_db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'{platform.title()} connected successfully',
            'connection': {
                'platform': platform,
                'username': connection.platform_username,
                'connected_at': connection.created_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in {platform} OAuth callback: {e}")
        sqlalchemy_db.session.rollback()
        return jsonify({'error': str(e)}), 500


@social_bp.route('/connections', methods=['GET'])
@jwt_required()
def get_connections():
    try:
        current_user_id = get_jwt_identity()
        connections = SocialConnection.query.filter_by(user_id=current_user_id).all()
        
        return jsonify({
            'success': True,
            'connections': [{
                'id': conn.id,
                'platform': conn.platform,
                'platform_username': conn.platform_username,
                'connected_at': conn.created_at.isoformat(),
                'is_active': conn.is_active
            } for conn in connections]
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching connections: {e}")
        return jsonify({'error': str(e)}), 500


@social_bp.route('/disconnect/<platform>', methods=['DELETE'])
@jwt_required()
def disconnect_platform(platform):
    try:
        current_user_id = get_jwt_identity()
        connection = SocialConnection.query.filter_by(
            user_id=current_user_id,
            platform=platform
        ).first()
        
        if not connection:
            return jsonify({'error': 'Connection not found'}), 404
        
        sqlalchemy_db.session.delete(connection)
        sqlalchemy_db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'{platform.title()} disconnected successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error disconnecting {platform}: {e}")
        sqlalchemy_db.session.rollback()
        return jsonify({'error': str(e)}), 500


@social_bp.route('/post', methods=['POST'])
@jwt_required()
def post_to_social():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        platform = data.get('platform')
        content = data.get('content', {})
        
        if not platform:
            return jsonify({'error': 'Platform required'}), 400
        
        connection = SocialConnection.query.filter_by(
            user_id=current_user_id,
            platform=platform,
            is_active=True
        ).first()
        
        if not connection:
            return jsonify({'error': f'Not connected to {platform}'}), 404
        
        result = manager.post_content(platform, connection.access_token, content)
        
        return jsonify({
            'success': True,
            'message': 'Posted successfully',
            'post_id': result.get('id'),
            'result': result
        }), 200
        
    except Exception as e:
        logger.error(f"Error posting to {platform}: {e}")
        return jsonify({'error': str(e)}), 500


@social_bp.route('/schedule', methods=['POST'])
@jwt_required()
def schedule_post():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        return jsonify({
            'success': True,
            'message': 'Post scheduled successfully',
            'note': 'Scheduling feature coming soon'
        }), 200
        
    except Exception as e:
        logger.error(f"Error scheduling post: {e}")
        return jsonify({'error': str(e)}), 500
