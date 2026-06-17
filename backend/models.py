from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

class SignalEventPayload(BaseModel):
    mode: str
    signal_type: str
    raw_payload: Dict[str, Any]
    confidence: float

class SessionModeUpdate(BaseModel):
    mode: str

class AlertResponse(BaseModel):
    id: str
    session_id: str
    signal_type: str
    confidence: float
    explanation: str
    timestamp: str
