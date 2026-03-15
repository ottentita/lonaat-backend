"""
Authentication Middleware
Protects endpoints with authentication checks.
"""
from flask import request, jsonify
from functools import wraps
import os

SECRET_KEY = os.getenv('JWT_SECRET_KEY')

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401
        # Placeholder: validate JWT token
        # In production, use a JWT library to decode and verify
        if token != f'Bearer {SECRET_KEY}':
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated
