"""Initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

NOTE: Demo uses create_all on startup — this migration is a stub for reference.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Stub — create_all handles schema creation in demo mode
    pass


def downgrade() -> None:
    pass
