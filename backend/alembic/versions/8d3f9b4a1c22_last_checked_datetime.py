"""convert service last_checked to datetime

Revision ID: 8d3f9b4a1c22
Revises: 559eaf1c5612
Create Date: 2026-05-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d3f9b4a1c22'
down_revision: Union[str, Sequence[str], None] = '559eaf1c5612'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'services',
        'last_checked',
        existing_type=sa.String(),
        type_=sa.DateTime(),
        existing_nullable=True,
        postgresql_using='last_checked::timestamp',
    )


def downgrade() -> None:
    op.alter_column(
        'services',
        'last_checked',
        existing_type=sa.DateTime(),
        type_=sa.String(),
        existing_nullable=True,
        postgresql_using='last_checked::text',
    )