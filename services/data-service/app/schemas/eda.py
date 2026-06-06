from pydantic import BaseModel
from typing import Dict, Any, List

class EdaRecordResponse(BaseModel):
    data: List[Dict[str, Any]]

class EdaCountResponse(BaseModel):
    count: int
