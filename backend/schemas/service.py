from pydantic import BaseModel, HttpUrl

class ServiceCreate(BaseModel):
    url: HttpUrl