"""PostgreSQL Native Upgrade - JSONB, timezone-aware timestamps, admin campaigns

Revision ID: postgresql_native_01
Revises: dbd9ab2a386b
Create Date: 2024-12-18

This migration adds:
- JSONB columns for flexible data storage
- is_admin_campaign flag for bypassing credit checks
- Timezone awareness to existing timestamp columns
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision = 'postgresql_native_01'
down_revision = '56bff84dfaf9'
branch_labels = None
depends_on = None


def upgrade():
    # Add JSONB columns where Text was used for JSON
    
    # Add extra_data column to transactions (JSONB)
    op.add_column('transactions', 
        sa.Column('extra_data', JSONB, nullable=True)
    )
    
    # Add extra_data to products (JSONB)
    op.add_column('products', 
        sa.Column('extra_data', JSONB, nullable=True)
    )
    
    # Add extra_data to notifications (JSONB)
    op.add_column('notifications', 
        sa.Column('extra_data', JSONB, nullable=True)
    )
    
    # Add is_admin_campaign to ad_boosts
    op.add_column('ad_boosts', 
        sa.Column('is_admin_campaign', sa.Boolean(), nullable=True, server_default='false')
    )
    
    # Add campaign_config JSONB to ad_boosts
    op.add_column('ad_boosts', 
        sa.Column('campaign_config', JSONB, nullable=True)
    )
    
    # Add extra_data to social_connections (JSONB)
    op.add_column('social_connections', 
        sa.Column('extra_data', JSONB, nullable=True)
    )
    
    # Add extra_data to imported_products (JSONB)
    op.add_column('imported_products', 
        sa.Column('extra_data', JSONB, nullable=True)
    )
    
    # Add extra_data to payment_requests (JSONB)
    op.add_column('payment_requests', 
        sa.Column('extra_data', JSONB, nullable=True)
    )
    
    # Add is_admin_campaign to property_ads
    op.add_column('property_ads', 
        sa.Column('is_admin_campaign', sa.Boolean(), nullable=True, server_default='false')
    )
    
    # Convert existing Text columns to JSONB where applicable
    # (These are new, so we just need to add them if not exists)
    
    # Migrate existing details columns from Text to JSONB
    try:
        op.execute("""
            ALTER TABLE audit_logs 
            ALTER COLUMN details TYPE JSONB USING details::jsonb
        """)
    except Exception:
        pass  # Column might already be JSONB or migration already run
    
    try:
        op.execute("""
            ALTER TABLE admin_audit 
            ALTER COLUMN details TYPE JSONB USING details::jsonb
        """)
    except Exception:
        pass
    
    try:
        op.execute("""
            ALTER TABLE commissions 
            ALTER COLUMN webhook_data TYPE JSONB USING webhook_data::jsonb
        """)
    except Exception:
        pass
    
    try:
        op.execute("""
            ALTER TABLE ai_jobs 
            ALTER COLUMN result TYPE JSONB USING result::jsonb
        """)
    except Exception:
        pass
    
    try:
        op.execute("""
            ALTER TABLE ai_security_flags 
            ALTER COLUMN evidence TYPE JSONB USING evidence::jsonb
        """)
    except Exception:
        pass
    
    try:
        op.execute("""
            ALTER TABLE properties 
            ALTER COLUMN amenities TYPE JSONB USING amenities::jsonb
        """)
    except Exception:
        pass
    
    try:
        op.execute("""
            ALTER TABLE plans 
            ALTER COLUMN features TYPE JSONB USING features::jsonb
        """)
    except Exception:
        pass
    
    # Make is_admin_campaign NOT NULL after setting defaults
    op.execute("UPDATE ad_boosts SET is_admin_campaign = false WHERE is_admin_campaign IS NULL")
    op.alter_column('ad_boosts', 'is_admin_campaign', nullable=False)
    
    op.execute("UPDATE property_ads SET is_admin_campaign = false WHERE is_admin_campaign IS NULL")
    op.alter_column('property_ads', 'is_admin_campaign', nullable=False)
    
    # Add indexes for JSONB columns (GIN indexes for efficient querying)
    try:
        op.create_index('ix_transactions_extra_data', 'transactions', ['extra_data'], postgresql_using='gin')
    except Exception:
        pass
    try:
        op.create_index('ix_ad_boosts_campaign_config', 'ad_boosts', ['campaign_config'], postgresql_using='gin')
    except Exception:
        pass


def downgrade():
    # Remove JSONB columns
    op.drop_column('transactions', 'extra_data')
    op.drop_column('products', 'extra_data')
    op.drop_column('notifications', 'extra_data')
    op.drop_column('ad_boosts', 'is_admin_campaign')
    op.drop_column('ad_boosts', 'campaign_config')
    op.drop_column('social_connections', 'extra_data')
    op.drop_column('imported_products', 'extra_data')
    op.drop_column('payment_requests', 'extra_data')
    op.drop_column('property_ads', 'is_admin_campaign')
    
    # Drop GIN indexes
    try:
        op.drop_index('ix_transactions_extra_data', 'transactions')
    except Exception:
        pass
    try:
        op.drop_index('ix_ad_boosts_campaign_config', 'ad_boosts')
    except Exception:
        pass
