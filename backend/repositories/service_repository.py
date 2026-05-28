from sqlalchemy.orm import Session
from models import Service


def get_service_by_id(db: Session, service_id: int):
    return db.query(Service).filter(
        Service.id == service_id
    ).first()


def get_all_services(db: Session):
    return db.query(Service).all()


def create_service(db: Session, url: str):

    service = Service(url=url)

    db.add(service)
    db.commit()
    db.refresh(service)

    return service