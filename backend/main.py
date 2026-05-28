# main.py

from contextlib import asynccontextmanager, suppress
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from routes.monitor import router
from services.monitor import monitor_services

    
@asynccontextmanager
async def lifespan(app: FastAPI):

    # startup
    task = asyncio.create_task(
        monitor_services()
    )

    yield

    # shutdown
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task


app = FastAPI(
    title="DevPulse",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root():
    return {
        "message": "DevPulse Running"
    }