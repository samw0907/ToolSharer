"""add return_pending status to borrow requests

Revision ID: add_return_pending_20250117
Revises: add_borrow_dates_20251219
Create Date: 2025-01-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_return_pending_20250117"
down_revision: Union[str, Sequence[str], None] = "add_borrow_dates_20251219"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite doesn't support ALTER TYPE for enums
    # The new RETURN_PENDING status will be available when the model is used
    # No schema changes needed - SQLite stores enums as strings
    pass


def downgrade() -> None:
    # No schema changes to revert
    pass
