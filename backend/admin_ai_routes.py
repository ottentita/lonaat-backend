"""
Admin AI Control Center Routes

Provides endpoints for:
- Running ads for all entity types
- Scanning commissions from affiliate networks
- Viewing AI task logs
- Stopping all AI tasks

All routes require admin authentication
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps

from models import db, User
from services.admin_ai_service import AdminAIService

admin_ai_bp = Blueprint('admin_ai', __name__)


def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function


@admin_ai_bp.route('/api/admin/ai/run-ads/products', methods=['POST'])
@admin_required
def run_ads_for_products():
    """Run ads for all or selected products"""
    admin_id = int(get_jwt_identity())
    data = request.get_json() or {}
    product_ids = data.get('product_ids')
    
    result = AdminAIService.run_ads_for_products(admin_id, product_ids)
    
    if 'error' in result:
        return jsonify(result), 400 if result.get('status') == 'busy' else 500
    
    return jsonify({
        'message': 'Product ads created successfully',
        'result': result
    }), 200


@admin_ai_bp.route('/api/admin/ai/run-ads/real-estate', methods=['POST'])
@admin_required
def run_ads_for_real_estate():
    """Run ads for all or selected real estate listings"""
    admin_id = int(get_jwt_identity())
    data = request.get_json() or {}
    property_ids = data.get('property_ids')
    
    result = AdminAIService.run_ads_for_real_estate(admin_id, property_ids)
    
    if 'error' in result:
        return jsonify(result), 400 if result.get('status') == 'busy' else 500
    
    return jsonify({
        'message': 'Real estate ads created successfully',
        'result': result
    }), 200


@admin_ai_bp.route('/api/admin/ai/run-ads/all', methods=['POST'])
@admin_required
def run_ads_for_all():
    """Run ads for all entity types (products + real estate)"""
    admin_id = int(get_jwt_identity())
    
    result = AdminAIService.run_ads_for_all(admin_id)
    
    if 'error' in result:
        return jsonify(result), 400 if result.get('status') == 'busy' else 500
    
    return jsonify({
        'message': 'All ads created successfully',
        'result': result
    }), 200


@admin_ai_bp.route('/api/admin/ai/run-commission-scan', methods=['POST'])
@admin_required
def scan_commissions():
    """Scan commissions from all affiliate networks"""
    admin_id = int(get_jwt_identity())
    data = request.get_json() or {}
    networks = data.get('networks')
    
    result = AdminAIService.scan_commissions(admin_id, networks)
    
    if 'error' in result:
        return jsonify(result), 400 if result.get('status') == 'busy' else 500
    
    return jsonify({
        'message': 'Commission scan completed',
        'result': result
    }), 200


@admin_ai_bp.route('/api/admin/ai/stop-all', methods=['POST'])
@admin_required
def stop_all_tasks():
    """Stop all running AI tasks"""
    AdminAIService.stop_all_tasks()
    
    return jsonify({
        'message': 'All AI tasks stopped',
        'status': 'stopped'
    }), 200


@admin_ai_bp.route('/api/admin/ai/logs', methods=['GET'])
@admin_required
def get_ai_logs():
    """Get AI task logs"""
    limit = request.args.get('limit', 50, type=int)
    status = request.args.get('status')
    job_type = request.args.get('job_type')
    
    logs = AdminAIService.get_ai_logs(limit, status, job_type)
    
    return jsonify({
        'logs': logs,
        'count': len(logs)
    }), 200


@admin_ai_bp.route('/api/admin/ai/stats', methods=['GET'])
@admin_required
def get_ai_stats():
    """Get AI system statistics"""
    stats = AdminAIService.get_ai_stats()
    
    return jsonify({
        'stats': stats
    }), 200


@admin_ai_bp.route('/api/admin/ai/status', methods=['GET'])
@admin_required
def get_ai_status():
    """Get current AI task status"""
    running_tasks = []
    task_names = ['run_ads_products', 'run_ads_real_estate', 'run_ads_all', 'scan_commissions']
    
    for task_name in task_names:
        if AdminAIService.is_task_running(task_name):
            running_tasks.append(task_name)
    
    return jsonify({
        'running_tasks': running_tasks,
        'is_busy': len(running_tasks) > 0
    }), 200
