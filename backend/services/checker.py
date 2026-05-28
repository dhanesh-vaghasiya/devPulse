import httpx
import time
from core.config import settings

async def check_url(url: str, client: httpx.AsyncClient | None = None):
    start = time.time()

    try:
        if client is None:
            async with httpx.AsyncClient() as request_client:
                response = await request_client.get(url, timeout=settings.REQUEST_TIMEOUT)
        else:
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