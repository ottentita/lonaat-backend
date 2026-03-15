"""
Rate Limiter
Protects endpoints from abuse.
"""
from flask import request, jsonify
from functools import wraps
import time

RATE_LIMIT = 100  # requests per hour
RATE_LIMIT_WINDOW = 3600  # seconds

rate_limit_store = {}

def rate_limit(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        ip = request.remote_addr
        now = int(time.time())
        window = now // RATE_LIMIT_WINDOW
        key = f'{ip}:{window}'
        count = rate_limit_store.get(key, 0)
        if count >= RATE_LIMIT:
            return jsonify({'error': 'Rate limit exceeded'}), 429
        rate_limit_store[key] = count + 1
        return f(*args, **kwargs)
    return decorated
