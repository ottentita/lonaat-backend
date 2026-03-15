"""
Database Guard - Protects routes when database is unavailable
Prevents OperationalError crashes by returning clear 503 responses
"""

from functools import wraps
from flask import jsonify
import logging

logger = logging.getLogger(__name__)

# This will be set by main.py after database initialization
db_initialized = False


def require_database(f):
    """
    Decorator to protect routes that require database access
    Returns 503 Service Unavailable if database is not initialized
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not db_initialized:
            logger.warning(f"Database required but not available for route: {f.__name__}")
            return jsonify({
                'error': 'Database Unavailable',
                'message': 'The database is not configured. Please set DATABASE_URL in deployment secrets.',
                'status': 503,
                'help': 'Visit /api/deployment/status for configuration guidance'
            }), 503
        return f(*args, **kwargs)
    return decorated_function


def set_db_initialized(status: bool):
    """Set the global database initialization status"""
    global db_initialized
    db_initialized = status
    logger.info(f"Database initialization status: {status}")
