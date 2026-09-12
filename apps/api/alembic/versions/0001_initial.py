"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-09-12
"""
from alembic import op

from app.core.db import Base
import app.models  # noqa: F401

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # First migration creates every table from the models. Later migrations must be written by hand
    # (or generated with `alembic revision --autogenerate`).
    Base.metadata.create_all(op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(op.get_bind())
