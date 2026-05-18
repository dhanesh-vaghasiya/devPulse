from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey
from database import Base


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, unique=True, nullable=False)


class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)

    service_id = Column(Integer, ForeignKey("services.id"))

    status_code = Column(Integer, nullable=True)

    latency = Column(Float, nullable=True)

    success = Column(Boolean)

    error = Column(String, nullable=True)