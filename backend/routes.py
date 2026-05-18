from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Service

router = APIRouter()


# Request schema
class ServiceCreate(BaseModel):
    url: HttpUrl


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Add monitored service
@router.post("/services")
async def add_service(data: ServiceCreate):
    db: Session = next(get_db())

    # check duplicate
    existing = db.query(Service).filter(Service.url == str(data.url)).first()

    if existing:
        raise HTTPException(status_code=400, detail="URL already exists")

    service = Service(
        url=str(data.url)
    )

    db.add(service)
    db.commit()
    db.refresh(service)

    return {
        "message": "Service added successfully",
        "service": {
            "id": service.id,
            "url": service.url
        }
    }


# Get all services
@router.get("/services")
async def get_services():
    db: Session = next(get_db())

    services = db.query(Service).all()

    return services