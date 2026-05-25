import httpx
from core.config import settings

async def validate_service_url(url: str):

    try:

        async with httpx.AsyncClient() as client:

            response = await client.get(
                url,
                timeout=settings.REQUEST_TIMEOUT
            )

        return {
            "valid": True,
            "status_code": response.status_code
        }

    except Exception as e:

        return {
            "valid": False,
            "error": str(e)
        }