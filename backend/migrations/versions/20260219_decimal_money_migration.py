"""Convert monetary Float columns to Numeric(20,8)

Revision ID: 20260219_decimal_money
Revises: 2755813623ff
Create Date: 2026-02-19

This migration alters several columns that previously used Float to use
Numeric(20,8) to preserve monetary precision. For SQLite installations
Alembic's batch_alter_table is used; if ALTER/TYPE changes fail, manual
SQL notes are included in comments below.
"""
from alembic import op
import sqlalchemy as sa


revision = '20260219_decimal_money'
down_revision = '2755813623ff'
branch_labels = None
depends_on = None


def upgrade():
    # Use batch_alter_table for cross-DB compatibility (works for SQLite too)
    try:
        with op.batch_alter_table('users') as batch_op:
            batch_op.alter_column('balance', existing_type=sa.Float(), type_=sa.Numeric(20,8), existing_nullable=False)

        with op.batch_alter_table('transactions') as batch_op:
            batch_op.alter_column('amount', existing_type=sa.Float(), type_=sa.Numeric(20,8), existing_nullable=False)

        with op.batch_alter_table('withdrawal_requests') as batch_op:
            batch_op.alter_column('amount', existing_type=sa.Float(), type_=sa.Numeric(20,8), existing_nullable=False)

        with op.batch_alter_table('referral_payouts') as batch_op:
            batch_op.alter_column('amount', existing_type=sa.Float(), type_=sa.Numeric(20,8), existing_nullable=False)

        with op.batch_alter_table('commissions') as batch_op:
            batch_op.alter_column('amount', existing_type=sa.Float(), type_=sa.Numeric(20,8), existing_nullable=False)

        with op.batch_alter_table('plans') as batch_op:
            batch_op.alter_column('price', existing_type=sa.Float(), type_=sa.Numeric(20,8), existing_nullable=False)

        with op.batch_alter_table('credit_packages') as batch_op:
            batch_op.alter_column('price', existing_type=sa.Float(), type_=sa.Numeric(20,8), existing_nullable=False)

        with op.batch_alter_table('payment_requests') as batch_op:
            batch_op.alter_column('amount', existing_type=sa.Float(), type_=sa.Numeric(20,8), existing_nullable=False)

        with op.batch_alter_table('properties') as batch_op:
            batch_op.alter_column('price', existing_type=sa.Float(), type_=sa.Numeric(20,8), existing_nullable=True)

        with op.batch_alter_table('rental_details') as batch_op:
            batch_op.alter_column('daily_rate', existing_type=sa.Float(), type_=sa.Numeric(20,8), existing_nullable=True)
            batch_op.alter_column('weekly_rate', existing_type=sa.Float(), type_=sa.Numeric(20,8), existing_nullable=True)
            batch_op.alter_column('monthly_rate', existing_type=sa.Float(), type_=sa.Numeric(20,8), existing_nullable=True)
            batch_op.alter_column('deposit_required', existing_type=sa.Float(), type_=sa.Numeric(20,8), existing_nullable=True)

        with op.batch_alter_table('property_bookings') as batch_op:
            batch_op.alter_column('total_price', existing_type=sa.Float(), type_=sa.Numeric(20,8), existing_nullable=False)
            batch_op.alter_column('deposit_paid', existing_type=sa.Float(), type_=sa.Numeric(20,8), existing_nullable=False)

    except Exception:
        # Some databases (or older SQLite) may not support direct ALTER TYPE.
        # If this fails, perform a manual migration using SQL (example for SQLite):
        # 1. CREATE TABLE new_table ... with NUMERIC columns
        # 2. INSERT INTO new_table(col, ...) SELECT col, ... FROM old_table
        #    (cast string prices to numeric where needed)
        # 3. DROP TABLE old_table; ALTER TABLE new_table RENAME TO old_table
        # For PostgreSQL manual SQL would be:
        # ALTER TABLE table_name ALTER COLUMN col TYPE NUMERIC(20,8) USING col::numeric;
        raise


def downgrade():
    # Revert Numeric back to Float where applicable
    with op.batch_alter_table('property_bookings') as batch_op:
        batch_op.alter_column('deposit_paid', existing_type=sa.Numeric(20,8), type_=sa.Float(), existing_nullable=False)
        batch_op.alter_column('total_price', existing_type=sa.Numeric(20,8), type_=sa.Float(), existing_nullable=False)

    with op.batch_alter_table('rental_details') as batch_op:
        batch_op.alter_column('deposit_required', existing_type=sa.Numeric(20,8), type_=sa.Float(), existing_nullable=True)
        batch_op.alter_column('monthly_rate', existing_type=sa.Numeric(20,8), type_=sa.Float(), existing_nullable=True)
        batch_op.alter_column('weekly_rate', existing_type=sa.Numeric(20,8), type_=sa.Float(), existing_nullable=True)
        batch_op.alter_column('daily_rate', existing_type=sa.Numeric(20,8), type_=sa.Float(), existing_nullable=True)

    with op.batch_alter_table('properties') as batch_op:
        batch_op.alter_column('price', existing_type=sa.Numeric(20,8), type_=sa.Float(), existing_nullable=True)

    with op.batch_alter_table('payment_requests') as batch_op:
        batch_op.alter_column('amount', existing_type=sa.Numeric(20,8), type_=sa.Float(), existing_nullable=False)

    with op.batch_alter_table('credit_packages') as batch_op:
        batch_op.alter_column('price', existing_type=sa.Numeric(20,8), type_=sa.Float(), existing_nullable=False)

    with op.batch_alter_table('plans') as batch_op:
        batch_op.alter_column('price', existing_type=sa.Numeric(20,8), type_=sa.Float(), existing_nullable=False)

    with op.batch_alter_table('commissions') as batch_op:
        batch_op.alter_column('amount', existing_type=sa.Numeric(20,8), type_=sa.Float(), existing_nullable=False)

    with op.batch_alter_table('referral_payouts') as batch_op:
        batch_op.alter_column('amount', existing_type=sa.Numeric(20,8), type_=sa.Float(), existing_nullable=False)

    with op.batch_alter_table('withdrawal_requests') as batch_op:
        batch_op.alter_column('amount', existing_type=sa.Numeric(20,8), type_=sa.Float(), existing_nullable=False)

    with op.batch_alter_table('transactions') as batch_op:
        batch_op.alter_column('amount', existing_type=sa.Numeric(20,8), type_=sa.Float(), existing_nullable=False)

    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('balance', existing_type=sa.Numeric(20,8), type_=sa.Float(), existing_nullable=False)
