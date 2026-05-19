import httpx


async def validate_service_url(url: str):

    try:

        async with httpx.AsyncClient() as client:

            response = await client.get(
                url,
                timeout=5
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