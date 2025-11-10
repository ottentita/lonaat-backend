"""
Database Seed Script for Lonaat
Creates test users for development and acceptance testing
"""

from models import db, User
from flask import Flask
from config import Config
import sys

def create_test_users(app):
    """Create 3 test users: 1 admin, 2 affiliates"""
    
    with app.app_context():
        users_data = [
            {
                'name': 'Admin User',
                'email': 'admin@lonaat.com',
                'password': 'Admin123!',
                'role': 'admin',
                'verified': True,
                'balance': 0
            },
            {
                'name': 'Affiliate One',
                'email': 'user1@lonaat.com',
                'password': 'Test123!',
                'role': 'user',
                'verified': True,
                'balance': 5000
            },
            {
                'name': 'Affiliate Two',
                'email': 'user2@lonaat.com',
                'password': 'Test123!',
                'role': 'user',
                'verified': True,
                'balance': 3000
            }
        ]
        
        print("\n🌱 Seeding database with test users...")
        
        for user_data in users_data:
            existing = User.query.filter_by(email=user_data['email']).first()
            
            if existing:
                print(f"⚠️  User {user_data['email']} already exists - skipping")
                continue
            
            user = User(
                name=user_data['name'],
                email=user_data['email'],
                role=user_data['role'],
                verified=user_data['verified'],
                balance=user_data['balance']
            )
            user.set_password(user_data['password'])
            
            db.session.add(user)
            print(f"✅ Created {user_data['role']}: {user_data['email']} (password: {user_data['password']})")
        
        try:
            db.session.commit()
            print("\n✅ Database seeded successfully!\n")
            print("Test Credentials:")
            print("================")
            for user_data in users_data:
                print(f"{user_data['name']}: {user_data['email']} / {user_data['password']}")
            print()
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error seeding database: {str(e)}\n")
            sys.exit(1)


if __name__ == '__main__':
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    
    create_test_users(app)
