"""
Email lead capture routes
/api/leads/capture - Capture email leads
"""

from flask import Blueprint, request, jsonify
from models import db
from datetime import datetime
import logging
import re

logger = logging.getLogger(__name__)

leads_bp = Blueprint('leads', __name__, url_prefix='/api/leads')

# Simple table for email leads (add to models.py if needed)
# For now, we'll just log them - you can add a proper EmailLead model later

def is_valid_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


@leads_bp.route('/capture', methods=['POST'])
def capture_lead():
    """
    Capture email lead for newsletter/updates
    
    Request body:
    {
        "email": "user@example.com"
    }
    """
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        if not is_valid_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Log the lead (in production, save to database)
        logger.info(f"Email lead captured: {email}")
        
        # TODO: Add EmailLead model and save to database
        # lead = EmailLead(email=email, captured_at=datetime.utcnow())
        # db.session.add(lead)
        # db.session.commit()
        
        return jsonify({
            'message': 'Email captured successfully',
            'email': email
        }), 201
        
    except Exception as e:
        logger.error(f"Capture lead error: {e}")
        return jsonify({'error': 'Failed to capture email'}), 500
