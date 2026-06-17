import os
import json
from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()

claude_client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", "mock"))

ALERT_EXPLAINER_SYSTEM_PROMPT = """You are an integrity-alert assistant for an exam proctoring dashboard.
You receive a structured signal event describing an anomaly detected
during a proctored session. Your job is to explain it in 1-2 sentences
to a non-technical exam administrator.

Rules:
- Never speculate about the candidate's intent (e.g., do not say "the
  candidate was cheating"). Describe only what the signal shows.
- Never explain the underlying bypass mechanism in technical detail.
  Describe the category only (e.g., "a secondary display was detected
  that wasn't present at session start").
- Keep tone neutral and factual, not accusatory.
- Output should be short — max 2 sentences, no bullet lists, no markdown.
- If signal confidence is below threshold, say so explicitly rather
  than overstating certainty."""

async def generate_alert_explanation(signal_type: str, confidence: float, session_id: str, detected_at: str) -> str:
    # If no real API key is provided, return a fallback mock explanation for demo purposes
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key == "mock":
        return f"A {signal_type.replace('_', ' ')} was detected partway through this session that wasn't present when the exam started. Confidence in this detection is high ({int(confidence*100)}%). (MOCK API RESPONSE)"

    user_message = json.dumps({
        "signal_type": signal_type,
        "confidence": confidence,
        "session_id": session_id,
        "detected_at": detected_at,
    })
    
    try:
        response = await claude_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=150,
            system=ALERT_EXPLAINER_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text
    except Exception as e:
        print(f"Claude API Error: {e}")
        return f"A {signal_type.replace('_', ' ')} anomaly was detected. [Fallback explanation due to AI service error]"
