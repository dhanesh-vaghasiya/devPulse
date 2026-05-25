from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime
from datetime import datetime
from zoneinfo import ZoneInfo
from database import Base

class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, unique=True, nullable=False)
    is_up = Column(Boolean, default=True)
    description = Column(String)
    last_latency = Column(Float, nullable=True)
    last_status_code = Column(Integer, nullable=True)
    failure_count = Column(Integer, default=0)
    last_checked = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now(ZoneInfo("Asia/Kolkata")), index=True)

class Log(Base):
    __tablename__ = "logs"
    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"))
    status_code = Column(Integer, nullable=True)
    latency = Column(Float, nullable=True)
    success = Column(Boolean)
    error = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now(ZoneInfo("Asia/Kolkata")), index=True)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey("services.id"))
    message = Column(String)
    created_at = Column(DateTime, default=datetime.now(ZoneInfo("Asia/Kolkata")), index=True)