"""
Database Seed Script for Lonaat
Creates test users for development and acceptance testing
"""

from models import (
    db,
    User,
    Product,
    AffiliateClick,
    Commission,
    WithdrawalRequest,
    Transaction,
    CommissionStatus,
    WithdrawalStatus,
    TransactionType,
    TransactionStatus,
)
from flask import Flask
from config import Config
import sys
from decimal import Decimal
from datetime import timedelta


def create_deterministic_seed(app):
    """Create deterministic seed data:
    - 5 users (1 admin, 4 affiliates)
    - 10 offers (products)
    - 50 clicks
    - 12 commission/conversion records (8 approved/paid)
    - 3 completed payouts (withdrawal requests)

    The function is idempotent and will skip existing records by unique keys.
    """

    with app.app_context():
        print("\n🌱 Running deterministic seed...")

        # 1) Users
        users_spec = [
            {'name': 'Admin User', 'email': 'admin@lonaat.com', 'password': 'Admin123!', 'role': 'admin', 'is_admin': True, 'balance': Decimal('0')},
            {'name': 'Affiliate A', 'email': 'aff1@lonaat.com', 'password': 'AffPass1!', 'role': 'user', 'is_admin': False, 'balance': Decimal('100.00')},
            {'name': 'Affiliate B', 'email': 'aff2@lonaat.com', 'password': 'AffPass2!', 'role': 'user', 'is_admin': False, 'balance': Decimal('200.00')},
            {'name': 'Affiliate C', 'email': 'aff3@lonaat.com', 'password': 'AffPass3!', 'role': 'user', 'is_admin': False, 'balance': Decimal('300.00')},
            {'name': 'Affiliate D', 'email': 'aff4@lonaat.com', 'password': 'AffPass4!', 'role': 'user', 'is_admin': False, 'balance': Decimal('400.00')},
        ]

        created_users = []
        for u in users_spec:
            existing = User.query.filter_by(email=u['email']).first()
            if existing:
                print(f"⚠️  User {u['email']} exists - reusing")
                created_users.append(existing)
                continue

            user = User(
                name=u['name'],
                email=u['email'],
                role=u['role'],
                is_admin=u['is_admin'],
                verified=True,
                balance=u['balance'],
            )
            user.set_password(u['password'])
            db.session.add(user)
            db.session.flush()
            created_users.append(user)
            print(f"✅ Created user {u['email']}")

        db.session.commit()

        # Map affiliates (exclude admin)
        affiliates = [u for u in created_users if not u.is_admin]
        if len(affiliates) < 4:
            print("⚠️  Less than 4 affiliates found/created; aborting further seed steps.")
            return

        # 2) Create 10 offers (Products)
        products = []
        for i in range(1, 11):
            name = f"Offer {i}"
            affiliate_owner = affiliates[(i - 1) % len(affiliates)]
            existing = Product.query.filter_by(name=name, user_id=affiliate_owner.id).first()
            if existing:
                products.append(existing)
                continue

            p = Product(
                user_id=affiliate_owner.id,
                name=name,
                description=f"Deterministic seeded offer {i}",
                price=f"{9 + i}.99",
                affiliate_link=f"https://offers.example.com/{i}?ref={affiliate_owner.referral_code}",
                network='seed-net',
                category='seed',
                commission_rate='10%',
                is_active=True,
            )
            db.session.add(p)
            db.session.flush()
            products.append(p)

        db.session.commit()

        # 3) Create 50 clicks across the 10 products
        total_clicks = 50
        clicks = []
        for i in range(total_clicks):
            product = products[i % len(products)]
            # rotate user assignment; make some clicks anonymous
            user = affiliates[i % len(affiliates)] if (i % 5) != 0 else None
            existing = None
            click = AffiliateClick(
                product_id=product.id,
                user_id=user.id if user else None,
                ip_address=f"192.0.2.{(i % 250) + 1}",
            )
            db.session.add(click)
            clicks.append(click)

        db.session.commit()

        # 4) Create 12 commission/conversion records, mark 8 as approved/paid
        commissions = []
        for i in range(12):
            product = products[i % len(products)]
            # assign to one of the product owners
            owner = User.query.get(product.user_id)
            amount = Decimal('5.00') + Decimal(i)
            status = CommissionStatus.PENDING
            approved_at = None
            paid_at = None
            if i < 8:
                status = CommissionStatus.APPROVED
                approved_at = (product.created_at or None)
                # make half of approved commissions paid
                if i < 3:
                    status = CommissionStatus.PAID
                    paid_at = None

            existing = Commission.query.filter_by(user_id=owner.id, product_id=product.id, amount=amount).first()
            if existing:
                commissions.append(existing)
                continue

            c = Commission(
                user_id=owner.id,
                network='seed-net',
                product_id=product.id,
                amount=amount,
                status=status,
                external_ref=f"seed_conv_{i+1}",
            )
            if approved_at:
                c.approved_at = approved_at
            if paid_at:
                c.paid_at = paid_at

            db.session.add(c)
            db.session.flush()
            commissions.append(c)

        db.session.commit()

        # 5) Create 3 completed payouts (WithdrawalRequest) and corresponding Transactions
        payout_amounts = [Decimal('50.00'), Decimal('75.25'), Decimal('100.00')]
        for idx, amt in enumerate(payout_amounts):
            user = affiliates[idx % len(affiliates)]
            existing = WithdrawalRequest.query.filter_by(user_id=user.id, amount=amt, status=WithdrawalStatus.PAID).first()
            if existing:
                print(f"⚠️  Payout for {user.email} ${amt} exists - skipping")
                continue

            wr = WithdrawalRequest(
                user_id=user.id,
                amount=amt,
                status=WithdrawalStatus.PAID,
            )
            db.session.add(wr)
            db.session.flush()

            # also add Transaction record for payout
            tr = Transaction(
                user_id=user.id,
                type=TransactionType.WITHDRAWAL,
                amount=amt,
                status=TransactionStatus.COMPLETED,
                description=f"Seeded payout ${amt}",
            )
            db.session.add(tr)

        try:
            db.session.commit()
            print("\n✅ Deterministic seed completed successfully!\n")
            print("Summary:")
            print(f"- Users: {len(created_users)} (1 admin, 4 affiliates)")
            print(f"- Offers: {len(products)}")
            print(f"- Clicks: {AffiliateClick.query.count()}")
            print(f"- Commissions: {Commission.query.count()}")
            print(f"- Completed payouts: {WithdrawalRequest.query.filter_by(status=WithdrawalStatus.PAID).count()}")
            print()
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error during seeding: {str(e)}\n")
            sys.exit(1)


if __name__ == '__main__':
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)

    create_deterministic_seed(app)
