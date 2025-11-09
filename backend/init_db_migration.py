"""
Database migration script to add missing columns to existing tables
Run this once to update existing databases
"""

import os
from models import db
from main import app

def migrate_database():
    """Add missing columns to existing tables"""
    with app.app_context():
        try:
            # Check if running on PostgreSQL
            from sqlalchemy import text
            
            # Add reference column to transactions if not exists
            db.session.execute(text(
                "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference VARCHAR(100)"
            ))
            
            # Create index on reference column
            db.session.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference)"
            ))
            
            db.session.commit()
            print("✅ Database migration completed successfully")
            
        except Exception as e:
            db.session.rollback()
            print(f"⚠️  Migration error (may already be applied): {e}")

if __name__ == '__main__':
    migrate_database()
