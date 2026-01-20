"""add geocoding fields to users and tools

Revision ID: add_geocoding_20250120
Revises: add_google_sub_20250119
Create Date: 2025-01-20
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_geocoding_20250120"
down_revision: Union[str, Sequence[str], None] = "add_google_sub_20250119"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add geocoding fields to users table
    op.add_column("users", sa.Column("home_address", sa.String(), nullable=True))
    op.add_column("users", sa.Column("home_lat", sa.Float(), nullable=True))
    op.add_column("users", sa.Column("home_lng", sa.Float(), nullable=True))

    # Rename 'location' to 'address' and add lat/lng to tools table
    # SQLite doesn't support ALTER COLUMN, so we need to handle this carefully
    # For SQLite, we'll just add the new columns; 'location' data stays as-is
    op.add_column("tools", sa.Column("address", sa.String(), nullable=True))
    op.add_column("tools", sa.Column("lat", sa.Float(), nullable=True))
    op.add_column("tools", sa.Column("lng", sa.Float(), nullable=True))

    # Copy existing location data to address column
    op.execute("UPDATE tools SET address = location WHERE location IS NOT NULL")


def downgrade() -> None:
    # Remove geocoding fields from users
    op.drop_column("users", "home_lng")
    op.drop_column("users", "home_lat")
    op.drop_column("users", "home_address")

    # Remove geocoding fields from tools
    op.drop_column("tools", "lng")
    op.drop_column("tools", "lat")
    op.drop_column("tools", "address")
