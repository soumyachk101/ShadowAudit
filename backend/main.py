from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uuid
from datetime import datetime, timezone

from models import SignalEventPayload, SessionModeUpdate
from database import database, init_db, sessions, signal_events, alerts
from ai_service import generate_alert_explanation

app = FastAPI(title="ShadowAudit API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_websockets = []

@app.on_event("startup")
async def startup():
    # Initialize schema sync
    init_db()
    # Connect async DB
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

@app.post("/sessions/{session_id}/signals")
async def receive_signal(session_id: str, payload: SignalEventPayload):
    event_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    # Check if session exists, create if not
    session_record = await database.fetch_one(sessions.select().where(sessions.c.id == session_id))
    if not session_record:
        await database.execute(sessions.insert().values(id=session_id, mode=payload.mode))
    
    # Store the signal event
    query = signal_events.insert().values(
        id=event_id,
        session_id=session_id,
        signal_type=payload.signal_type,
        raw_payload=payload.raw_payload,
        confidence=payload.confidence,
        detected_at=now
    )
    await database.execute(query)

    # Broadcast signal receipt
    for ws in active_websockets:
        await ws.send_json({"event": "signal_received", "signal_type": payload.signal_type})

    # If protected mode is active, trigger detection logic
    if payload.mode == "protected":
        alert_id = str(uuid.uuid4())
        
        # Claude Explanation
        explanation = await generate_alert_explanation(
            payload.signal_type, payload.confidence, session_id, now.isoformat()
        )
        
        # Save alert
        await database.execute(alerts.insert().values(
            id=alert_id,
            session_id=session_id,
            signal_event_id=event_id,
            explanation=explanation,
            severity="high",
            created_at=now
        ))

        # Push to dashboard
        for ws in active_websockets:
            await ws.send_json({
                "event": "alert_fired",
                "session_id": session_id,
                "signal_type": payload.signal_type,
                "confidence": payload.confidence,
                "explanation": explanation,
                "timestamp": now.isoformat()
            })

    return {"status": "received", "event_id": event_id}

@app.patch("/sessions/{session_id}/mode")
async def update_session_mode(session_id: str, update: SessionModeUpdate):
    session_record = await database.fetch_one(sessions.select().where(sessions.c.id == session_id))
    if session_record:
        await database.execute(sessions.update().where(sessions.c.id == session_id).values(mode=update.mode))
    else:
        await database.execute(sessions.insert().values(id=session_id, mode=update.mode))
    return {"status": "updated", "mode": update.mode}

@app.websocket("/ws/sessions/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    active_websockets.append(websocket)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        active_websockets.remove(websocket)
