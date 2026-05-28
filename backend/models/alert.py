from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey
from datetime import datetime
from zoneinfo import ZoneInfo
from core.database import Base

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey("services.id"))
    message = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)