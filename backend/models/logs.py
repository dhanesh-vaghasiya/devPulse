from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey
from datetime import datetime
from core.database import Base
from sqlalchemy.orm import relationship


class Log(Base):
    __tablename__ = "logs"
    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"))
    status_code = Column(Integer, nullable=True)
    latency = Column(Float, nullable=True)
    success = Column(Boolean)
    error = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    service = relationship(
        "Service",
        back_populates="logs"
    )