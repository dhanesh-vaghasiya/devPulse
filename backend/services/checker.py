import httpx
import time
from core.config import settings

async def check_url(url: str):
    start = time.time()

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=settings.REQUEST_TIMEOUT)

        latency = round((time.time() - start) * 1000, 2)

        return {
            "success": True,
            "status_code": response.status_code,
            "latency": latency
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }