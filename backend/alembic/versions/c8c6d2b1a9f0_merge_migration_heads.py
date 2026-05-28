"""merge migration heads

Revision ID: c8c6d2b1a9f0
Revises: e49ce55328a9, 8d3f9b4a1c22
Create Date: 2026-05-28 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8c6d2b1a9f0'
down_revision: Union[str, Sequence[str], None] = ('e49ce55328a9', '8d3f9b4a1c22')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
