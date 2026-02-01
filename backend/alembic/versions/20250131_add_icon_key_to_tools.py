"""add icon_key to tools

Revision ID: add_icon_key_20250131
Revises: add_geocoding_20250120
Create Date: 2025-01-31
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_icon_key_20250131"
down_revision: Union[str, Sequence[str], None] = "add_geocoding_20250120"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tools", sa.Column("icon_key", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("tools", "icon_key")
