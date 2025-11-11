"""
Deployment Status and Health Check Endpoint
Helps diagnose configuration issues in production
"""

from flask import Blueprint, jsonify, current_app
import os

status_bp = Blueprint('status', __name__)


@status_bp.route('/api/deployment/status', methods=['GET'])
def deployment_status():
    """
    Check deployment configuration status
    Returns which critical secrets are configured
    """
    
    # Check database configuration
    database_url = os.getenv('DATABASE_URL')
    db_configured = bool(database_url and database_url.startswith('postgresql'))
    db_type = 'PostgreSQL' if db_configured else 'SQLite (development fallback)'
    
    # Check encryption key
    encryption_configured = bool(os.getenv('ENCRYPTION_KEY'))
    
    # Check admin credentials
    admin_username = bool(os.getenv('ADMIN_USERNAME'))
    admin_password = bool(os.getenv('ADMIN_PASSWORD'))
    admin_configured = admin_username and admin_password
    
    # Check email configuration
    email_user = bool(os.getenv('EMAIL_USER'))
    email_pass = bool(os.getenv('EMAIL_PASS'))
    email_configured = email_user and email_pass
    
    # Check affiliate network APIs
    amazon_configured = bool(os.getenv('AMAZON_ACCESS_KEY') and os.getenv('AMAZON_SECRET_KEY'))
    shareasale_configured = bool(os.getenv('SHAREASALE_TOKEN'))
    cj_configured = bool(os.getenv('CJ_TOKEN'))
    impact_configured = bool(os.getenv('IMPACT_TOKEN'))
    
    # Production environment detection
    is_production = bool(os.getenv('RENDER') or os.getenv('RAILWAY') or os.getenv('FLY_APP_NAME'))
    
    # Overall deployment health
    critical_checks = [db_configured, encryption_configured, admin_configured]
    health_score = sum(critical_checks) / len(critical_checks) * 100
    
    if health_score == 100:
        status = 'HEALTHY'
        message = 'All critical configurations are set ✅'
    elif health_score >= 66:
        status = 'DEGRADED'
        message = 'Missing some configurations - check warnings below ⚠️'
    else:
        status = 'UNHEALTHY'
        message = 'Critical configurations missing - add secrets to deployment ❌'
    
    return jsonify({
        'status': status,
        'health_score': health_score,
        'message': message,
        'environment': 'PRODUCTION' if is_production else 'DEVELOPMENT',
        'checks': {
            'critical': {
                'database': {
                    'configured': db_configured,
                    'type': db_type,
                    'message': 'Add DATABASE_URL secret' if not db_configured else 'OK'
                },
                'encryption': {
                    'configured': encryption_configured,
                    'message': 'Add ENCRYPTION_KEY secret' if not encryption_configured else 'OK'
                },
                'admin': {
                    'configured': admin_configured,
                    'message': 'Add ADMIN_USERNAME and ADMIN_PASSWORD' if not admin_configured else 'OK'
                }
            },
            'optional': {
                'email': {
                    'configured': email_configured,
                    'message': 'Add EMAIL_USER and EMAIL_PASS for notifications' if not email_configured else 'OK'
                },
                'affiliate_networks': {
                    'amazon': amazon_configured,
                    'shareasale': shareasale_configured,
                    'cj_affiliate': cj_configured,
                    'impact': impact_configured,
                    'message': 'Add affiliate network API keys to enable product sync'
                }
            }
        },
        'next_steps': _get_next_steps(db_configured, encryption_configured, admin_configured, email_configured)
    })


def _get_next_steps(db, encryption, admin, email):
    """Generate actionable next steps based on configuration status"""
    steps = []
    
    if not db:
        steps.append({
            'priority': 'CRITICAL',
            'task': 'Add DATABASE_URL',
            'command': 'Create PostgreSQL database in deployment dashboard, then add DATABASE_URL=<connection-string> to secrets'
        })
    
    if not encryption:
        steps.append({
            'priority': 'CRITICAL',
            'task': 'Add ENCRYPTION_KEY',
            'command': 'Run: python -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())" then add to secrets'
        })
    
    if not admin:
        steps.append({
            'priority': 'CRITICAL',
            'task': 'Add Admin Credentials',
            'command': 'Add ADMIN_USERNAME=admin@lonaat.com and ADMIN_PASSWORD=<secure-password> to secrets'
        })
    
    if not email:
        steps.append({
            'priority': 'RECOMMENDED',
            'task': 'Configure Email Service',
            'command': 'Sign up for Brevo (free tier), add EMAIL_USER and EMAIL_PASS to secrets'
        })
    
    if not steps:
        steps.append({
            'priority': 'INFO',
            'task': 'Configuration Complete',
            'command': 'All critical secrets configured! Add affiliate network API keys to enable more features.'
        })
    
    return steps
