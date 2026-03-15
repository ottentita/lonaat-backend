from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

api_bp = Blueprint('api', __name__, url_prefix='/api')

# --- Autonomous Orchestrator Endpoints ---
@api_bp.route('/orchestrator/start', methods=['POST'])
@jwt_required()
def orchestrator_start():
    from growth.autonomous_campaign_controller import _campaign_controller
    return jsonify(_campaign_controller.start_orchestration())

@api_bp.route('/orchestrator/stop', methods=['POST'])
@jwt_required()
def orchestrator_stop():
    from growth.autonomous_campaign_controller import _campaign_controller
    return jsonify(_campaign_controller.stop_orchestration())

@api_bp.route('/orchestrator/status', methods=['GET'])
@jwt_required()
def orchestrator_status():
    from growth.autonomous_campaign_controller import _campaign_controller
    return jsonify(_campaign_controller.orchestrator_status())

@api_bp.route('/orchestrator/run-cycle', methods=['POST'])
@jwt_required()
def orchestrator_run_cycle():
    from growth.autonomous_campaign_controller import _campaign_controller
    return jsonify(_campaign_controller.run_cycle())

@api_bp.route('/orchestrator/health', methods=['GET'])
@jwt_required()
def orchestrator_health():
    from growth.autonomous_campaign_controller import _campaign_controller
    return jsonify(_campaign_controller.orchestrator_health())
# --- Predictive Optimization Engine Endpoints ---
from ai.campaign_optimization.optimization_strategy_engine import OptimizationStrategyEngine
from ai.campaign_optimization.performance_metrics_engine import PerformanceMetricsEngine
from ai.campaign_optimization.experiment_manager import ExperimentManager
from ai.campaign_optimization.campaign_analyzer import CampaignAnalyzer

_optimization_engine = OptimizationStrategyEngine()
_metrics_engine = PerformanceMetricsEngine()
_experiment_manager = ExperimentManager()
_campaign_analyzer = CampaignAnalyzer()

@api_bp.route('/optimization/analyze', methods=['POST'])
@jwt_required()
def optimization_analyze():
    data = request.get_json()
    result = _campaign_analyzer.analyze(data)
    return jsonify(result)

@api_bp.route('/optimization/predict', methods=['POST'])
@jwt_required()
def optimization_predict():
    data = request.get_json()
    result = _metrics_engine.predict_performance(data)
    return jsonify(result)

@api_bp.route('/optimization/recommend', methods=['POST'])
@jwt_required()
def optimization_recommend():
    data = request.get_json()
    insights = data.get('insights', {})
    metrics = data.get('metrics', {})
    result = _optimization_engine.recommend(insights, metrics)
    return jsonify(result)

@api_bp.route('/optimization/experiments', methods=['POST'])
@jwt_required()
def optimization_experiments():
    data = request.get_json()
    variants = data.get('variants', [])
    result = _experiment_manager.run_experiment(variants)
    return jsonify(result)

@api_bp.route('/optimization/performance', methods=['POST'])
@jwt_required()
def optimization_performance():
    data = request.get_json()
    result = _metrics_engine.compute_metrics(data)
    return jsonify(result)
# --- Campaign Automation Manager Endpoints ---
from growth.autonomous_campaign_controller import AutonomousCampaignController
from growth.budget_allocator import BudgetAllocator
from growth.creative_testing_manager import CreativeTestingManager
from growth.traffic_strategy_engine import TrafficStrategyEngine

_budget_allocator = BudgetAllocator()
_creative_testing_manager = CreativeTestingManager()
_traffic_strategy_engine = TrafficStrategyEngine()
_campaign_controller = AutonomousCampaignController(
    launcher=None,  # Not used in REST API, handled by create/launch
    allocator=_budget_allocator,
    strategy_engine=_traffic_strategy_engine,
    creative_manager=_creative_testing_manager
)

@api_bp.route('/campaign/create', methods=['POST'])
@jwt_required()
def campaign_create():
    data = request.get_json()
    campaign = _campaign_controller.create_campaign(data)
    return jsonify(campaign)

@api_bp.route('/campaign/launch', methods=['POST'])
@jwt_required()
def campaign_launch():
    data = request.get_json()
    campaign_id = data.get('campaign_id')
    result = _campaign_controller.launch_campaign(campaign_id)
    return jsonify(result)

@api_bp.route('/campaign/optimize', methods=['POST'])
@jwt_required()
def campaign_optimize():
    data = request.get_json()
    campaign_id = data.get('campaign_id')
    result = _campaign_controller.optimize_campaign(campaign_id)
    return jsonify(result)

@api_bp.route('/campaign/pause', methods=['POST'])
@jwt_required()
def campaign_pause():
    data = request.get_json()
    campaign_id = data.get('campaign_id')
    result = _campaign_controller.pause_campaign(campaign_id)
    return jsonify(result)

@api_bp.route('/campaign/performance', methods=['GET'])
@jwt_required()
def campaign_performance():
    campaign_id = request.args.get('campaign_id')
    result = _campaign_controller.get_performance(campaign_id)
    return jsonify(result)
# --- Creative Generation Endpoints ---
from ai.content_generation.content_generator import ContentGenerator
from ai.content_generation.campaign_copy_engine import CampaignCopyEngine
from ai.content_generation.video_script_generator import VideoScriptGenerator
from ai.content_generation.prompt_builder import PromptBuilder

# Dummy model interface for demonstration (replace with real model in production)
class DummyModelInterface:
    def predict(self, model_name, prompt):
        return {"model": model_name, "prompt": prompt, "output": f"Generated content for: {prompt}"}

_model_interface = DummyModelInterface()
_content_generator = ContentGenerator(_model_interface)
_campaign_copy_engine = CampaignCopyEngine(_content_generator)
_video_script_generator = VideoScriptGenerator(_content_generator)
_prompt_builder = PromptBuilder()

@api_bp.route('/creative/generate', methods=['POST'])
@jwt_required()
def creative_generate():
    data = request.get_json()
    prompt = data.get('prompt')
    return jsonify(_content_generator.generate(prompt))

@api_bp.route('/creative/variants', methods=['POST'])
@jwt_required()
def creative_generate_variants():
    data = request.get_json()
    prompt = data.get('prompt')
    n = int(data.get('n', 3))
    return jsonify({"variants": _content_generator.generate_variants(prompt, n)})

@api_bp.route('/creative/score', methods=['POST'])
@jwt_required()
def creative_score():
    data = request.get_json()
    creative = data.get('creative')
    context = data.get('context')
    return jsonify(_content_generator.score_creative(creative, context))

@api_bp.route('/creative/copy', methods=['POST'])
@jwt_required()
def creative_generate_copy():
    data = request.get_json()
    context = data.get('context')
    return jsonify(_campaign_copy_engine.generate_copy(context))

@api_bp.route('/creative/headlines', methods=['POST'])
@jwt_required()
def creative_generate_headlines():
    data = request.get_json()
    context = data.get('context')
    n = int(data.get('n', 3))
    return jsonify({"headlines": _campaign_copy_engine.generate_headlines(context, n)})

@api_bp.route('/creative/hooks', methods=['POST'])
@jwt_required()
def creative_generate_hooks():
    data = request.get_json()
    context = data.get('context')
    n = int(data.get('n', 3))
    return jsonify({"hooks": _campaign_copy_engine.generate_hooks(context, n)})

@api_bp.route('/creative/descriptions', methods=['POST'])
@jwt_required()
def creative_generate_descriptions():
    data = request.get_json()
    context = data.get('context')
    n = int(data.get('n', 3))
    return jsonify({"descriptions": _campaign_copy_engine.generate_descriptions(context, n)})

@api_bp.route('/creative/video_script', methods=['POST'])
@jwt_required()
def creative_generate_video_script():
    data = request.get_json()
    context = data.get('context')
    return jsonify(_video_script_generator.generate_script(context))

@api_bp.route('/creative/video_script_variants', methods=['POST'])
@jwt_required()
def creative_generate_video_script_variants():
    data = request.get_json()
    context = data.get('context')
    n = int(data.get('n', 3))
    return jsonify({"variants": _video_script_generator.generate_script_variants(context, n)})

@api_bp.route('/creative/prompt', methods=['POST'])
@jwt_required()
def creative_build_prompt():
    data = request.get_json()
    context = data.get('context')
    format_type = data.get('format_type', 'general')
    optimize = bool(data.get('optimize', False))
    return jsonify({"prompt": _prompt_builder.build_prompt(context, format_type, optimize)})

@api_bp.route('/creative/prompt_optimize', methods=['POST'])
@jwt_required()
def creative_optimize_prompt():
    data = request.get_json()
    prompt = data.get('prompt')
    return jsonify({"optimized_prompt": _prompt_builder.optimize_prompt(prompt)})
# --- Ad Platform Integrations Endpoints ---
from integrations import impact_connector, admitad_connector, mylead_connector, aliexpress_connector

@api_bp.route('/integrations/impact/report', methods=['GET'])
@jwt_required()
def get_impact_report():
    return jsonify(impact_connector.get_report())

@api_bp.route('/integrations/impact/sync', methods=['POST'])
@jwt_required()
def sync_impact_campaigns():
    return jsonify(impact_connector.sync_campaigns())

@api_bp.route('/integrations/impact/ingest', methods=['POST'])
@jwt_required()
def ingest_impact_campaign():
    campaign = request.get_json()
    return jsonify(impact_connector.ingest_campaign(campaign))

@api_bp.route('/integrations/admitad/report', methods=['GET'])
@jwt_required()
def get_admitad_report():
    return jsonify(admitad_connector.get_report())

@api_bp.route('/integrations/admitad/sync', methods=['POST'])
@jwt_required()
def sync_admitad_campaigns():
    return jsonify(admitad_connector.sync_campaigns())

@api_bp.route('/integrations/admitad/ingest', methods=['POST'])
@jwt_required()
def ingest_admitad_campaign():
    campaign = request.get_json()
    return jsonify(admitad_connector.ingest_campaign(campaign))

@api_bp.route('/integrations/mylead/report', methods=['GET'])
@jwt_required()
def get_mylead_report():
    return jsonify(mylead_connector.get_report())

@api_bp.route('/integrations/mylead/sync', methods=['POST'])
@jwt_required()
def sync_mylead_campaigns():
    return jsonify(mylead_connector.sync_campaigns())

@api_bp.route('/integrations/mylead/ingest', methods=['POST'])
@jwt_required()
def ingest_mylead_campaign():
    campaign = request.get_json()
    return jsonify(mylead_connector.ingest_campaign(campaign))

@api_bp.route('/integrations/aliexpress/report', methods=['GET'])
@jwt_required()
def get_aliexpress_report():
    return jsonify(aliexpress_connector.get_report())

@api_bp.route('/integrations/aliexpress/sync', methods=['POST'])
@jwt_required()
def sync_aliexpress_campaigns():
    return jsonify(aliexpress_connector.sync_campaigns())

@api_bp.route('/integrations/aliexpress/ingest', methods=['POST'])
@jwt_required()
def ingest_aliexpress_campaign():
    campaign = request.get_json()
    return jsonify(aliexpress_connector.ingest_campaign(campaign))
from intelligence.performance_learning_engine import PerformanceLearningEngine
from intelligence.traffic_source_analyzer import TrafficSourceAnalyzer
from intelligence.conversion_tracker import ConversionTracker
from intelligence.revenue_attribution_engine import RevenueAttributionEngine
from intelligence.conversion_event_router import ConversionEventRouter

# Singleton instances for in-memory analytics (for demonstration; replace with persistent storage in production)
_conversion_tracker = ConversionTracker()
_traffic_analyzer = TrafficSourceAnalyzer()
_revenue_attributor = RevenueAttributionEngine()
_learning_engine = PerformanceLearningEngine()
_event_router = ConversionEventRouter(_conversion_tracker, _traffic_analyzer, _revenue_attributor, _learning_engine)

# --- Product Intelligence Engine Endpoints ---
@api_bp.route('/intelligence/summary', methods=['GET'])
@jwt_required()
def get_intelligence_summary():
    """Get a summary report of product intelligence analytics."""
    limit = int(request.args.get('limit', 100))
    report = _event_router.get_full_report(limit=limit)
    return jsonify(report)

@api_bp.route('/intelligence/conversions', methods=['GET'])
@jwt_required()
def get_conversion_events():
    limit = int(request.args.get('limit', 100))
    return jsonify({
        "conversions": _conversion_tracker.get_all(limit),
        "stats": _conversion_tracker.get_conversion_stats()
    })

@api_bp.route('/intelligence/traffic_sources', methods=['GET'])
@jwt_required()
def get_traffic_sources():
    limit = int(request.args.get('limit', 100))
    return jsonify({
        "traffic_sources": _traffic_analyzer.get_recent_analyses(limit),
        "stats": _traffic_analyzer.get_source_stats()
    })

@api_bp.route('/intelligence/revenue_attributions', methods=['GET'])
@jwt_required()
def get_revenue_attributions():
    limit = int(request.args.get('limit', 100))
    return jsonify({
        "revenue_attributions": _revenue_attributor.get_recent_attributions(limit),
        "summary": _revenue_attributor.get_attribution_summary()
    })

@api_bp.route('/intelligence/learning', methods=['GET'])
@jwt_required()
def get_learning_data():
    limit = int(request.args.get('limit', 100))
    return jsonify({
        "learning_data": _learning_engine.get_learning_data(limit),
        "summary": _learning_engine.get_learning_summary()
    })

@api_bp.route('/intelligence/ingest_event', methods=['POST'])
@jwt_required()
def ingest_intelligence_event():
    """Ingest a new event for intelligence analytics (for testing/demo)."""
    event = request.get_json()
    result = _event_router.route(event)
    return jsonify(result)
"""
API routes for user profile and admin dashboard
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Transaction
from auth import is_admin_user
from functools import wraps
import os

api_bp = Blueprint('api', __name__, url_prefix='/api')


def admin_required(fn):
    """Decorator to require admin role"""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Use centralized admin check
        if not is_admin_user(current_user_id):
            return jsonify({'error': 'Admin access required'}), 403
        
        return fn(*args, **kwargs)
    
    return wrapper


@api_bp.route('/user/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """
    Get current user's profile
    
    Requires: JWT token in Authorization header
    Returns: User profile data
    """
    try:
        current_user_id = int(get_jwt_identity())
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user's recent transactions
        recent_transactions = Transaction.query.filter_by(user_id=user.id)\
            .order_by(Transaction.created_at.desc())\
            .limit(10)\
            .all()
        
        return jsonify({
            'user': user.to_dict(),
            'recent_transactions': [t.to_dict() for t in recent_transactions]
        }), 200
        
    except Exception as e:
        print(f"Profile fetch error: {str(e)}")
        return jsonify({'error': 'Failed to fetch profile'}), 500


@api_bp.route('/admin/dashboard', methods=['GET'])
@admin_required
def admin_dashboard():
    """
    ENHANCED Admin dashboard with full analytics
    
    Requires: JWT token with is_admin=true
    Returns: Complete platform statistics and analytics
    """
    try:
        from models import Product, ImportedProduct, Commission, AffiliateClick, AdBoost, CreditWallet, AdminAudit
        
        # User statistics
        total_users = User.query.count()
        total_admins = User.query.filter_by(is_admin=True).count()
        verified_users = User.query.filter_by(verified=True).count()
        active_users = User.query.filter_by(is_active=True).count()
        deactivated_users = User.query.filter_by(is_active=False).count()
        
        # Transaction statistics
        total_transactions = Transaction.query.count()
        total_commissions = db.session.query(db.func.sum(Transaction.amount))\
            .filter_by(type='commission', status='completed')\
            .scalar() or 0
        
        total_withdrawals = db.session.query(db.func.sum(Transaction.amount))\
            .filter_by(type='withdrawal', status='completed')\
            .scalar() or 0
        
        pending_withdrawals_count = Transaction.query.filter_by(
            type='withdrawal',
            status='pending'
        ).count()
        
        pending_withdrawals_amount = db.session.query(db.func.sum(Transaction.amount))\
            .filter_by(type='withdrawal', status='pending')\
            .scalar() or 0
        
        # Product statistics
        total_products = Product.query.count()
        total_imported_products = ImportedProduct.query.count()
        active_products = Product.query.filter_by(is_active=True).count()
        
        # Click statistics
        total_clicks = AffiliateClick.query.count()
        
        # Commission statistics
        total_commissions_db = Commission.query.count()
        pending_commissions = Commission.query.filter_by(status='pending').count()
        approved_commissions = Commission.query.filter_by(status='approved').count()
        paid_commissions = Commission.query.filter_by(status='paid').count()
        
        total_commission_amount = db.session.query(db.func.sum(Commission.amount))\
            .filter_by(status='paid')\
            .scalar() or 0
        
        # AdBoost statistics
        total_ad_boosts = AdBoost.query.count()
        active_ad_boosts = AdBoost.query.filter_by(status='active').count()
        
        # Credit wallet statistics
        total_credits_in_system = db.session.query(db.func.sum(CreditWallet.credits)).scalar() or 0
        total_credits_spent = db.session.query(db.func.sum(CreditWallet.total_spent)).scalar() or 0
        
        # Recent data
        recent_users = User.query.order_by(User.created_at.desc()).limit(20).all()
        recent_transactions = Transaction.query.order_by(Transaction.created_at.desc()).limit(30).all()
        recent_commissions = Commission.query.order_by(Commission.created_at.desc()).limit(20).all()
        recent_admin_actions = AdminAudit.query.order_by(AdminAudit.created_at.desc()).limit(50).all()
        
        # All users (for user management)
        all_users = User.query.order_by(User.created_at.desc()).all()
        
        # System status
        system_status = {
            'database': 'operational',
            'api': 'operational',
            'webhooks': 'operational'
        }
        
        return jsonify({
            'statistics': {
                'users': {
                    'total': total_users,
                    'admins': total_admins,
                    'verified': verified_users,
                    'active': active_users,
                    'deactivated': deactivated_users
                },
                'transactions': {
                    'total': total_transactions,
                    'total_commissions': round(total_commissions, 2),
                    'total_withdrawals': round(total_withdrawals, 2),
                    'pending_withdrawals_count': pending_withdrawals_count,
                    'pending_withdrawals_amount': round(pending_withdrawals_amount, 2)
                },
                'products': {
                    'total': total_products,
                    'imported': total_imported_products,
                    'active': active_products
                },
                'clicks': {
                    'total': total_clicks
                },
                'commissions': {
                    'total': total_commissions_db,
                    'pending': pending_commissions,
                    'approved': approved_commissions,
                    'paid': paid_commissions,
                    'total_amount': round(total_commission_amount, 2)
                },
                'ad_boosts': {
                    'total': total_ad_boosts,
                    'active': active_ad_boosts
                },
                'credits': {
                    'total_in_system': round(total_credits_in_system, 2),
                    'total_spent': round(total_credits_spent, 2)
                }
            },
            'recent_users': [user.to_dict(include_balance=True) for user in recent_users],
            'recent_transactions': [t.to_dict() for t in recent_transactions],
            'recent_commissions': [c.to_dict() for c in recent_commissions],
            'recent_admin_actions': [a.to_dict() for a in recent_admin_actions],
            'all_users': [user.to_dict(include_balance=True) for user in all_users],
            'system_status': system_status
        }), 200
        
    except Exception as e:
        print(f"Admin dashboard error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch dashboard data'}), 500


@api_bp.route('/admin/users/<int:user_id>/deactivate', methods=['POST'])
@admin_required
def deactivate_user(user_id):
    """
    Deactivate a user account
    
    Requires: JWT token with is_admin=true
    """
    try:
        from models import AdminAudit
        from auth import log_admin_action
        
        current_admin_id = int(get_jwt_identity())
        
        # Prevent admin from deactivating themselves
        if current_admin_id == user_id:
            return jsonify({'error': 'Cannot deactivate your own account'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if not user.is_active:
            return jsonify({'error': 'User is already deactivated'}), 400
        
        user.is_active = False
        db.session.commit()
        
        # Log admin action
        log_admin_action(
            admin_id=current_admin_id,
            action='deactivate_user',
            target_user_id=user_id,
            details={'user_email': user.email},
            ip_address=request.remote_addr
        )
        
        return jsonify({
            'message': f'User {user.email} deactivated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Deactivate user error: {str(e)}")
        return jsonify({'error': 'Failed to deactivate user'}), 500


@api_bp.route('/admin/users/<int:user_id>/reactivate', methods=['POST'])
@admin_required
def reactivate_user(user_id):
    """
    Reactivate a user account
    
    Requires: JWT token with is_admin=true
    """
    try:
        from models import AdminAudit
        from auth import log_admin_action
        
        current_admin_id = int(get_jwt_identity())
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.is_active:
            return jsonify({'error': 'User is already active'}), 400
        
        user.is_active = True
        db.session.commit()
        
        # Log admin action
        log_admin_action(
            admin_id=current_admin_id,
            action='reactivate_user',
            target_user_id=user_id,
            details={'user_email': user.email},
            ip_address=request.remote_addr
        )
        
        return jsonify({
            'message': f'User {user.email} reactivated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Reactivate user error: {str(e)}")
        return jsonify({'error': 'Failed to reactivate user'}), 500


@api_bp.route('/admin/users', methods=['GET'])
@admin_required
def get_all_users():
    """
    Get all users for admin management
    
    Requires: JWT token with is_admin=true
    """
    try:
        users = User.query.order_by(User.created_at.desc()).all()
        
        return jsonify({
            'users': [user.to_dict(include_balance=True) for user in users],
            'total': len(users)
        }), 200
        
    except Exception as e:
        print(f"Get all users error: {str(e)}")
        return jsonify({'error': 'Failed to fetch users'}), 500


# ============= ADMIN AI SYSTEM =============

@api_bp.route('/admin/ai/bulk-import', methods=['POST'])
@admin_required
def admin_ai_bulk_import():
    """
    Admin-only: Bulk import products from all networks with AI ad generation
    
    This is the Admin AI system - FREE and UNLIMITED for admins.
    
    Request body:
    {
        "networks": ["digistore24", "awin"],  // Optional, defaults to all
        "max_per_network": 20,                // Optional, default 20
        "generate_ads": true                  // Optional, generate AI ads
    }
    
    Returns:
    - Products imported from each network
    - AI-generated ad text for each product
    """
    from affiliate_manager import get_affiliate_manager
    from affiliate_scraper import generate_ad_text, generate_product_description
    from models import Product
    
    try:
        data = request.get_json() or {}
        networks = data.get('networks', ['digistore24', 'awin'])
        max_per_network = data.get('max_per_network', 20)
        generate_ads = data.get('generate_ads', True)
        
        admin_id = int(get_jwt_identity())
        affiliate_manager = get_affiliate_manager()
        
        results = {
            'networks_processed': [],
            'total_imported': 0,
            'products_with_ai': 0,
            'errors': []
        }
        
        for network in networks:
            try:
                # Fetch products from network
                products = affiliate_manager.fetch_from_network(network, max_results=max_per_network)
                
                if not products:
                    results['errors'].append(f"No products from {network}")
                    continue
                
                imported_count = 0
                for product_data in products:
                    # Create product record
                    product = Product(
                        user_id=admin_id,
                        name=product_data.get('name', 'Untitled'),
                        description=product_data.get('description', ''),
                        price=product_data.get('price', 'N/A'),
                        affiliate_link=product_data.get('link', product_data.get('affiliate_link', '')),
                        network=network,
                        category=product_data.get('category', ''),
                        image_url=product_data.get('image', product_data.get('image_url')),
                        commission_rate=product_data.get('commission', product_data.get('commission_rate'))
                    )
                    
                    # Generate AI description and ad text
                    if generate_ads:
                        try:
                            ai_description = generate_product_description(product_data.get('name', ''))
                            product.description = ai_description
                            results['products_with_ai'] += 1
                        except Exception as e:
                            print(f"AI generation failed for {product_data.get('name')}: {e}")
                    
                    db.session.add(product)
                    imported_count += 1
                
                results['networks_processed'].append({
                    'network': network,
                    'imported': imported_count
                })
                results['total_imported'] += imported_count
                
            except Exception as e:
                results['errors'].append(f"{network}: {str(e)}")
                continue
        
        db.session.commit()
        
        return jsonify({
            'message': f"Admin AI bulk import complete: {results['total_imported']} products",
            'results': results
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Admin AI bulk import error: {str(e)}")
        return jsonify({'error': 'Bulk import failed'}), 500


@api_bp.route('/admin/ai/generate-ads', methods=['POST'])
@admin_required
def admin_ai_generate_ads():
    """
    Admin-only: Generate AI ads for existing products
    
    Request body:
    {
        "product_ids": [1, 2, 3]  // Optional, if empty generates for all
    }
    """
    from affiliate_scraper import generate_ad_text
    from models import Product
    
    try:
        data = request.get_json() or {}
        product_ids = data.get('product_ids', [])
        
        admin_id = int(get_jwt_identity())
        
        if product_ids:
            products = Product.query.filter(Product.id.in_(product_ids)).all()
        else:
            products = Product.query.filter_by(user_id=admin_id).limit(50).all()
        
        results = {'generated': 0, 'failed': 0, 'products': []}
        
        for product in products:
            try:
                ad_text = generate_ad_text(product.name)
                results['generated'] += 1
                results['products'].append({
                    'id': product.id,
                    'name': product.name,
                    'ad_text': ad_text
                })
            except Exception as e:
                results['failed'] += 1
                print(f"Failed to generate ad for {product.name}: {e}")
        
        return jsonify({
            'message': f"Generated AI ads for {results['generated']} products",
            'results': results
        }), 200
        
    except Exception as e:
        print(f"Admin AI generate ads error: {str(e)}")
        return jsonify({'error': 'Ad generation failed'}), 500


@api_bp.route('/admin/fraud/stats', methods=['GET'])
@admin_required
def admin_fraud_stats():
    """
    Admin-only: Get fraud detection statistics
    """
    from fraud_detector import get_fraud_stats
    
    try:
        stats = get_fraud_stats()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/users/<int:user_id>/block', methods=['POST'])
@admin_required
def admin_block_user(user_id):
    """
    Admin-only: Temporarily block a user account
    
    Request body:
    {
        "reason": "Suspicious activity detected",
        "duration_hours": 24
    }
    """
    from fraud_detector import temporarily_block_account
    
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'Admin action')
        duration_hours = data.get('duration_hours', 24)
        
        result = temporarily_block_account(user_id, reason, duration_hours)
        
        if result.get('success'):
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/users/<int:user_id>/unblock', methods=['POST'])
@admin_required
def admin_unblock_user(user_id):
    """
    Admin-only: Unblock a user account
    """
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user.is_blocked = False
        user.blocked_until = None
        user.block_reason = None
        
        db.session.commit()
        
        return jsonify({
            'message': f'User {user.email} unblocked successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
