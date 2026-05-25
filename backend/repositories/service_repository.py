from models import Service

def get_service_by_id(db, service_id):
    return db.query(Service).filter(
        Service.id == service_id
    ).first()

def get_all_services(db):   
    return db.query(Service).all()