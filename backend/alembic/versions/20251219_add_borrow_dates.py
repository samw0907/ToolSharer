"""add borrow request start and due dates

Revision ID: add_borrow_dates_20251219
Revises: c7d26f454a32
Create Date: 2025-12-19
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_borrow_dates_20251219"  # CHANGE: unique id (string is fine)
down_revision: Union[str, Sequence[str], None] = "c7d26f454a32"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # CHANGE: add new columns
    op.add_column("borrow_requests", sa.Column("start_date", sa.Date(), nullable=True))
    op.add_column("borrow_requests", sa.Column("due_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("borrow_requests", "due_date")
    op.drop_column("borrow_requests", "start_date")
