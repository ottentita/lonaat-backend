"""
Smoke test script for marketplace and wallet endpoints.
Creates an in-memory DB, registers a test user, sets balance, requests withdrawal, approves it as admin.
Run: python backend/smoke_test.py
"""
import os
import json

# Use Docker PostgreSQL for testing (must be running)
os.environ['DATABASE_URL'] = 'postgresql://postgres:postgres@postgres:5432/lonaat'
os.environ['FLASK_SECRET'] = 'test_flask_secret'
os.environ['JWT_SECRET_KEY'] = 'test_jwt_secret'

from backend import main as app_mod
from flask_jwt_extended import create_access_token
from models import db, User, BankAccount, WithdrawalRequest

app = app_mod.app


def pretty(obj):
    try:
        return json.dumps(obj, indent=2, default=str)
    except Exception:
        return str(obj)


with app.app_context():
    client = app.test_client()

    print('\n== GET /api/market/categories ==')
    r = client.get('/api/market/categories')
    print(r.status_code, r.get_json())

    print('\n== GET /api/market/listings ==')
    r = client.get('/api/market/listings')
    print(r.status_code, r.get_json())

    # Create user directly in DB (bypass register to avoid email sending)
    u = User(name='Smoke Test', email='smoke@example.com', role='user')
    u.set_password('password123')
    u.balance = 100.0
    db.session.add(u)
    db.session.commit()
    print('\nCreated user id=', u.id)

    # Create access token
    token = create_access_token(identity=str(u.id))
    headers = {'Authorization': f'Bearer {token}'}

    print('\n== GET /api/wallet/summary ==')
    r = client.get('/api/wallet/summary', headers=headers)
    print(r.status_code, pretty(r.get_json()))

    print('\n== POST /api/wallet/withdraw (amount=50) ==')
    r = client.post('/api/wallet/withdraw', headers=headers, json={'amount': 50})
    print(r.status_code, pretty(r.get_json()))

    if r.status_code == 201:
        wr = r.get_json().get('withdrawal')
        wid = wr.get('id')
        print('\nWithdrawal created id=', wid)

        # Promote user to admin to approve
        u.is_admin = True
        db.session.commit()
        admin_token = create_access_token(identity=str(u.id))
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        print('\n== POST /api/wallet/admin/withdrawals/{id}/approve ==')
        r2 = client.post(f'/api/wallet/admin/withdrawals/{wid}/approve', headers=admin_headers)
        print(r2.status_code, pretty(r2.get_json()))

        print('\n== GET /api/wallet/summary (after approval) ==')
        r3 = client.get('/api/wallet/summary', headers=headers)
        print(r3.status_code, pretty(r3.get_json()))
    else:
        print('Withdrawal request failed; cannot continue admin approval test')

    print('\nSmoke tests complete')
