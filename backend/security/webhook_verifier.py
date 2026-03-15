"""
Webhook Verifier
Verifies incoming webhook requests for authenticity.
"""
from flask import request, jsonify
from functools import wraps
import hmac
import hashlib
import os

WEBHOOK_SECRET = os.getenv('WEBHOOK_SECRET', 'default_webhook_secret')

def verify_webhook(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        signature = request.headers.get('X-Signature')
        payload = request.get_data()
        expected = hmac.new(WEBHOOK_SECRET.encode(), payload, hashlib.sha256).hexdigest()
        if signature != expected:
            return jsonify({'error': 'Invalid webhook signature'}), 403
        return f(*args, **kwargs)
    return decorated
