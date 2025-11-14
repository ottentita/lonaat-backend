"""
File upload service for payment receipts
Handles secure file storage with validation
"""

import os
import secrets
from werkzeug.utils import secure_filename
from flask import current_app
import logging

logger = logging.getLogger(__name__)

# Allowed file extensions and MIME types
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf', 'gif'}
ALLOWED_MIME_TYPES = {
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'application/pdf'
}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def validate_file(file):
    """
    Validate uploaded file
    
    Args:
        file: FileStorage object from request.files
    
    Returns:
        (is_valid: bool, error_message: str or None)
    """
    if not file:
        return False, "No file provided"
    
    if file.filename == '':
        return False, "No file selected"
    
    if not allowed_file(file.filename):
        return False, f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
    
    # Check MIME type if available
    if hasattr(file, 'content_type') and file.content_type:
        if file.content_type not in ALLOWED_MIME_TYPES:
            return False, f"Invalid file type. Expected image or PDF"
    
    # Check file size (read into memory to check)
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)  # Reset to beginning
    
    if file_size > MAX_FILE_SIZE:
        return False, f"File too large. Maximum size: {MAX_FILE_SIZE / (1024 * 1024):.1f} MB"
    
    if file_size == 0:
        return False, "File is empty"
    
    return True, None


def save_receipt(file, user_id, purpose='payment'):
    """
    Save payment receipt file securely
    
    Args:
        file: FileStorage object from request.files
        user_id: User ID for organizing files
        purpose: 'payment', 'subscription', etc.
    
    Returns:
        (success: bool, result: dict or error_message: str)
        result contains: {
            'filename': str,  # secure filename
            'path': str,  # relative path for database
            'url': str  # URL for accessing file
        }
    """
    try:
        # Validate file
        is_valid, error = validate_file(file)
        if not is_valid:
            return False, error
        
        # Create upload directory if it doesn't exist
        upload_folder = os.path.join(current_app.root_path, 'uploads', 'receipts')
        os.makedirs(upload_folder, exist_ok=True)
        
        # Generate secure filename with random prefix
        original_filename = secure_filename(file.filename)
        file_ext = original_filename.rsplit('.', 1)[1].lower()
        random_prefix = secrets.token_hex(16)
        secure_name = f"{user_id}_{purpose}_{random_prefix}.{file_ext}"
        
        # Save file
        file_path = os.path.join(upload_folder, secure_name)
        file.save(file_path)
        
        # Return file info
        relative_path = f"uploads/receipts/{secure_name}"
        file_url = f"/api/receipts/{secure_name}"  # For serving later
        
        logger.info(f"Receipt saved successfully: {secure_name} for user {user_id}")
        
        return True, {
            'filename': secure_name,
            'path': relative_path,
            'url': file_url,
            'original_filename': original_filename
        }
        
    except Exception as e:
        logger.error(f"File upload error: {e}")
        return False, f"Failed to save file: {str(e)}"


def delete_receipt(file_path):
    """
    Delete a receipt file
    
    Args:
        file_path: Relative path to file (e.g., 'uploads/receipts/filename.jpg')
    
    Returns:
        (success: bool, message: str)
    """
    try:
        full_path = os.path.join(current_app.root_path, file_path)
        
        if os.path.exists(full_path):
            os.remove(full_path)
            logger.info(f"Receipt deleted: {file_path}")
            return True, "File deleted successfully"
        else:
            logger.warning(f"File not found for deletion: {file_path}")
            return False, "File not found"
            
    except Exception as e:
        logger.error(f"File deletion error: {e}")
        return False, f"Failed to delete file: {str(e)}"
