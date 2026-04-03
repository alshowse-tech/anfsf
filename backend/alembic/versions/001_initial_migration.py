"""Initial migration - Create all tables

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('is_verified', sa.Boolean(), nullable=True, default=False),
        sa.Column('is_superuser', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.Column('ownership_root_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_username', 'users', ['username'], unique=True)
    op.create_index('ix_users_email_active', 'users', ['email', 'is_active'])
    
    # Create wallets table
    op.create_table('wallets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('balance_cents', sa.Numeric(precision=20, scale=0), nullable=True, default=0),
        sa.Column('currency', sa.String(length=3), nullable=True, default='CNY'),
        sa.Column('status', sa.String(length=20), nullable=True, default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], )
    )
    op.create_index('ix_wallets_user_id', 'wallets', ['user_id'], unique=True)
    op.create_index('ix_wallets_user_status', 'wallets', ['user_id', 'status'])
    
    # Create transactions table
    op.create_table('transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('wallet_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('amount_cents', sa.Numeric(precision=20, scale=0), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=True, default='CNY'),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True, default='completed'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('reference_id', sa.String(length=255), nullable=True),
        sa.Column('extra_data', sa.String(length=1000), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['wallet_id'], ['wallets.id'], )
    )
    op.create_index('ix_transactions_wallet_id', 'transactions', ['wallet_id'])
    op.create_index('ix_transactions_type', 'transactions', ['type'])
    op.create_index('ix_transactions_status', 'transactions', ['status'])
    op.create_index('ix_transactions_reference_id', 'transactions', ['reference_id'])
    op.create_index('ix_transactions_created', 'transactions', ['created_at'])
    op.create_index('ix_transactions_type_status', 'transactions', ['type', 'status'])
    
    # Create contracts table
    op.create_table('contracts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('version', sa.String(length=50), nullable=True, default='1.0.0'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('contract_type', sa.String(length=100), nullable=False),
        sa.Column('scope', sa.String(length=50), nullable=True, default='private'),
        sa.Column('terms', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('constraints', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('permissions', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('is_enforced', sa.Boolean(), nullable=True, default=True),
        sa.Column('valid_from', sa.DateTime(), nullable=True),
        sa.Column('valid_until', sa.DateTime(), nullable=True),
        sa.Column('ownership_record_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], )
    )
    op.create_index('ix_contracts_creator_id', 'contracts', ['creator_id'])
    op.create_index('ix_contracts_type', 'contracts', ['contract_type'])
    op.create_index('ix_contracts_is_active', 'contracts', ['is_active'])
    op.create_index('ix_contracts_type_active', 'contracts', ['contract_type', 'is_active'])
    
    # Create ownership_records table
    op.create_table('ownership_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('asset_type', sa.String(length=100), nullable=False),
        sa.Column('asset_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('proof_hash', sa.String(length=255), nullable=True),
        sa.Column('proof_metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('parent_record_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('derivation_path', sa.Text(), nullable=True),
        sa.Column('rights', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('restrictions', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('contract_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('is_transferable', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('transferred_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['parent_record_id'], ['ownership_records.id'], ),
        sa.ForeignKeyConstraint(['contract_id'], ['contracts.id'], )
    )
    op.create_index('ix_ownership_owner_id', 'ownership_records', ['owner_id'])
    op.create_index('ix_ownership_asset_type', 'ownership_records', ['asset_type'])
    op.create_index('ix_ownership_asset_id', 'ownership_records', ['asset_id'])
    op.create_index('ix_ownership_asset', 'ownership_records', ['asset_type', 'asset_id'])
    op.create_index('ix_ownership_owner_active', 'ownership_records', ['owner_id', 'is_active'])
    op.create_index('ix_ownership_contract_id', 'ownership_records', ['contract_id'])
    op.create_index('ix_ownership_parent_record_id', 'ownership_records', ['parent_record_id'])
    
    # Create tasks table
    op.create_table('tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True, default='pending'),
        sa.Column('priority', sa.Integer(), nullable=True, default=5),
        sa.Column('task_type', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('progress_percent', sa.Integer(), nullable=True, default=0),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('input_data', sa.Text(), nullable=True),
        sa.Column('output_data', sa.Text(), nullable=True),
        sa.Column('result_url', sa.String(length=500), nullable=True),
        sa.Column('contract_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('ownership_record_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['contract_id'], ['contracts.id'], ),
        sa.ForeignKeyConstraint(['ownership_record_id'], ['ownership_records.id'], )
    )
    op.create_index('ix_tasks_owner_id', 'tasks', ['owner_id'])
    op.create_index('ix_tasks_status', 'tasks', ['status'])
    op.create_index('ix_tasks_task_type', 'tasks', ['task_type'])
    op.create_index('ix_tasks_category', 'tasks', ['category'])
    op.create_index('ix_tasks_owner_status', 'tasks', ['owner_id', 'status'])
    op.create_index('ix_tasks_created', 'tasks', ['created_at'])
    op.create_index('ix_tasks_contract_id', 'tasks', ['contract_id'])
    
    # Create transcriptions table
    op.create_table('transcriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_url', sa.String(length=500), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('source_format', sa.String(length=20), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True, default='pending'),
        sa.Column('language', sa.String(length=20), nullable=True, default='zh-CN'),
        sa.Column('transcript_text', sa.Text(), nullable=True),
        sa.Column('transcript_url', sa.String(length=500), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('engine', sa.String(length=50), nullable=True),
        sa.Column('processing_time_seconds', sa.Float(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('contract_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('ownership_record_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['contract_id'], ['contracts.id'], ),
        sa.ForeignKeyConstraint(['ownership_record_id'], ['ownership_records.id'], )
    )
    op.create_index('ix_transcriptions_owner_id', 'transcriptions', ['owner_id'])
    op.create_index('ix_transcriptions_status', 'transcriptions', ['status'])
    op.create_index('ix_transcriptions_owner_status', 'transcriptions', ['owner_id', 'status'])
    op.create_index('ix_transcriptions_created', 'transcriptions', ['created_at'])
    op.create_index('ix_transcriptions_contract_id', 'transcriptions', ['contract_id'])


def downgrade() -> None:
    op.drop_table('transcriptions')
    op.drop_table('tasks')
    op.drop_table('ownership_records')
    op.drop_table('contracts')
    op.drop_table('transactions')
    op.drop_table('wallets')
    op.drop_table('users')
