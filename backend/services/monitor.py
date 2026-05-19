import asyncio
from datetime import datetime
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Service, Log
from services.checker import check_url

async def check_and_store(service, db):
    
    from websocket_manager import manager
    
    result = await check_url(service.url)

    log = Log(
        service_id=service.id,
        status_code=result.get("status_code"),
        latency=result.get("latency"),
        success=result.get("success"),
        error=result.get("error")
    )

    if result["success"]:
        service.is_up = True
        service.failure_count = 0
    else:
        service.failure_count += 1
        if service.failure_count >= 3:
            service.is_up = False
        if (service.failure_count == 3):
            print(f"Service {service.url} is down")
    

    service.last_latency = result.get("latency")

    service.last_status_code = result.get("status_code")

    service.last_checked = str(datetime.now())
    db.add(log)

    await manager.broadcast({
        "service": service.url,
        "success": result.get("success"),
        "status_code": result.get("status_code"),
        "latency": result.get("latency")
    })  

async def monitor_services():

    while True:

        db: Session = SessionLocal()

        try:

            services = db.query(Service).all()

            tasks = [
                check_and_store(service, db)
                for service in services
            ]
            await asyncio.gather(*tasks)
            db.commit()
            print(f"Checked {len(services)} services")

        except Exception as e:

            print("Monitor Error:", e)

        finally:
            db.close()

        await asyncio.sleep(30)