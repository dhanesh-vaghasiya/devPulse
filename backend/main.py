# main.py

from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncio

from database import Base, engine
from routes.monitor import router
from services.monitor import monitor_services


# Create tables
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):

    # startup
    task = asyncio.create_task(
        monitor_services()
    )

    yield

    # shutdown
    task.cancel()


app = FastAPI(
    title="DevPulse",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(router)


@app.get("/")
async def root():
    return {
        "message": "DevPulse Running"
    }