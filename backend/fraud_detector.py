"""
Fraud Detection System for Lonaat
Detects suspicious withdrawal and commission activities
"""

from datetime import datetime, timedelta
from flask import current_app
from models import db, AuditLog, WithdrawalRequest
from email_service import send_fraud_alert_email
import logging

logger = logging.getLogger(__name__)


def log_audit(user_id, action, entity_type, entity_id=None, details=None, ip_address=None, fraud_score=0):
    """Log an audit event"""
    audit = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address,
        fraud_score=fraud_score,
        flagged=(fraud_score >= 50)
    )
    db.session.add(audit)
    db.session.commit()
    return audit


def check_withdrawal_fraud(user_id, amount):
    """
    Check if withdrawal request is potentially fraudulent
    
    Returns:
        dict: {
            'flagged': bool,
            'fraud_score': int (0-100),
            'reason': str
        }
    """
    from models import User
    
    if not current_app.config.get('FRAUD_DETECTION_ENABLED', True):
        return {'flagged': False, 'fraud_score': 0, 'reason': None}
    
    fraud_score = 0
    reasons = []
    
    user = User.query.get(user_id)
    if not user:
        return {'flagged': True, 'fraud_score': 100, 'reason': 'User not found'}
    
    pending_withdrawals = WithdrawalRequest.query.filter_by(
        user_id=user_id,
        status='pending'
    ).count()
    
    if pending_withdrawals > 0:
        return {
            'flagged': True,
            'fraud_score': 100,
            'reason': 'You already have a pending withdrawal. Please wait for it to be processed.'
        }
    
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    today_withdrawals = WithdrawalRequest.query.filter(
        WithdrawalRequest.user_id == user_id,
        WithdrawalRequest.requested_at >= today_start
    ).count()
    
    max_per_day = current_app.config.get('MAX_WITHDRAWALS_PER_DAY', 3)
    if today_withdrawals >= max_per_day:
        return {
            'flagged': True,
            'fraud_score': 80,
            'reason': f'Maximum {max_per_day} withdrawals per day exceeded'
        }
    
    five_min_ago = datetime.utcnow() - timedelta(minutes=5)
    recent_withdrawals = WithdrawalRequest.query.filter(
        WithdrawalRequest.user_id == user_id,
        WithdrawalRequest.requested_at >= five_min_ago
    ).count()
    
    if recent_withdrawals > 0:
        fraud_score += 40
        reasons.append('Multiple withdrawals within 5 minutes')
    
    if amount > user.balance * 0.95:
        fraud_score += 20
        reasons.append('Withdrawing >95% of balance')
    
    if amount < 100:
        fraud_score += 10
        reasons.append('Very small withdrawal amount')
    
    recent_audit_flags = AuditLog.query.filter(
        AuditLog.user_id == user_id,
        AuditLog.flagged == True,
        AuditLog.created_at >= datetime.utcnow() - timedelta(days=7)
    ).count()
    
    if recent_audit_flags > 2:
        fraud_score += 30
        reasons.append('Multiple fraud flags in past 7 days')
    
    flagged = fraud_score >= 50
    
    if flagged:
        reason_str = '; '.join(reasons)
        logger.warning(f"🚨 Fraud detected for user {user_id}: {reason_str} (score: {fraud_score})")
        
        send_fraud_alert_email(
            user.email,
            user.name,
            reason_str,
            admin_copy=True
        )
    
    return {
        'flagged': flagged,
        'fraud_score': fraud_score,
        'reason': '; '.join(reasons) if reasons else None
    }


def check_commission_fraud(user_id, product_id, amount):
    """
    Check if commission creation is potentially fraudulent
    
    Returns:
        dict: Similar to check_withdrawal_fraud
    """
    if not current_app.config.get('FRAUD_DETECTION_ENABLED', True):
        return {'flagged': False, 'fraud_score': 0, 'reason': None}
    
    fraud_score = 0
    reasons = []
    
    one_min_ago = datetime.utcnow() - timedelta(minutes=1)
    recent_commissions = AuditLog.query.filter(
        AuditLog.user_id == user_id,
        AuditLog.action == 'commission_created',
        AuditLog.entity_id == product_id,
        AuditLog.created_at >= one_min_ago
    ).count()
    
    max_per_min = current_app.config.get('MAX_COMMISSIONS_PER_PRODUCT_PER_MIN', 5)
    if recent_commissions >= max_per_min:
        return {
            'flagged': True,
            'fraud_score': 100,
            'reason': f'Too many commissions for this product ({max_per_min}/min limit)'
        }
    
    if recent_commissions > 2:
        fraud_score += 30
        reasons.append('Rapid commission creation')
    
    if amount > 10000:
        fraud_score += 20
        reasons.append('Unusually high commission amount')
    
    flagged = fraud_score >= 50
    
    return {
        'flagged': flagged,
        'fraud_score': fraud_score,
        'reason': '; '.join(reasons) if reasons else None
    }


def temporarily_block_account(user_id, reason, duration_hours=24):
    """
    Temporarily block a user account due to suspicious activity
    
    Args:
        user_id: ID of user to block
        reason: Reason for blocking
        duration_hours: How long to block (default 24 hours)
    
    Returns:
        dict with block details
    """
    from models import User
    
    user = User.query.get(user_id)
    if not user:
        return {'success': False, 'error': 'User not found'}
    
    # Admin accounts cannot be blocked
    if user.is_admin:
        return {'success': False, 'error': 'Cannot block admin accounts'}
    
    # Set blocked status
    user.is_blocked = True
    user.blocked_until = datetime.utcnow() + timedelta(hours=duration_hours)
    user.block_reason = reason
    
    # Log the action
    log_audit(
        user_id=user_id,
        action='account_blocked',
        entity_type='user',
        entity_id=user_id,
        details=f"Blocked for {duration_hours}h: {reason}",
        fraud_score=100
    )
    
    db.session.commit()
    
    logger.warning(f"🚫 Account blocked: User {user_id} for {duration_hours}h - {reason}")
    
    return {
        'success': True,
        'user_id': user_id,
        'blocked_until': user.blocked_until.isoformat(),
        'reason': reason
    }


def check_and_auto_block(user_id):
    """
    Check if user should be automatically blocked based on fraud patterns
    Auto-blocks if more than 5 fraud flags in 24 hours
    
    Returns:
        dict with block status
    """
    from models import User
    
    user = User.query.get(user_id)
    if not user or user.is_admin:
        return {'blocked': False}
    
    # Check if already blocked
    if user.is_blocked and user.blocked_until and user.blocked_until > datetime.utcnow():
        return {'blocked': True, 'reason': 'Already blocked', 'until': user.blocked_until.isoformat()}
    
    # Count fraud flags in last 24 hours
    last_24h = datetime.utcnow() - timedelta(hours=24)
    recent_flags = AuditLog.query.filter(
        AuditLog.user_id == user_id,
        AuditLog.flagged == True,
        AuditLog.created_at >= last_24h
    ).count()
    
    # Auto-block threshold: 5 fraud flags in 24 hours
    if recent_flags >= 5:
        result = temporarily_block_account(
            user_id, 
            f"Automatic block: {recent_flags} fraud flags in 24 hours",
            duration_hours=48
        )
        return {'blocked': True, 'auto_blocked': True, 'reason': result.get('reason')}
    
    return {'blocked': False, 'recent_flags': recent_flags}


def get_fraud_stats():
    """Get fraud detection statistics for admin dashboard"""
    total_flags = AuditLog.query.filter_by(flagged=True).count()
    
    last_24h = datetime.utcnow() - timedelta(hours=24)
    recent_flags = AuditLog.query.filter(
        AuditLog.flagged == True,
        AuditLog.created_at >= last_24h
    ).count()
    
    high_risk_users = db.session.query(AuditLog.user_id).filter(
        AuditLog.flagged == True,
        AuditLog.created_at >= datetime.utcnow() - timedelta(days=7)
    ).group_by(AuditLog.user_id).having(
        db.func.count(AuditLog.id) > 2
    ).all()
    
    return {
        'total_flags': total_flags,
        'recent_flags_24h': recent_flags,
        'high_risk_users': len(high_risk_users)
    }
