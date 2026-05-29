from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from core.database import Base
from sqlalchemy.orm import relationship

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey("services.id"))
    message = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    service = relationship(
        "Service",
        back_populates="alerts"
    )