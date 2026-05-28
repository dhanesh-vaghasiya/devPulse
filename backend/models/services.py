from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime
from datetime import datetime
from core.database import Base


class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, unique=True, nullable=False)
    is_up = Column(Boolean, default=True)
    description = Column(String)
    last_latency = Column(Float, nullable=True)
    last_status_code = Column(Integer, nullable=True)
    failure_count = Column(Integer, default=0)
    last_checked = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
