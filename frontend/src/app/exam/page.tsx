"use client";

import { useState, useEffect } from "react";

export default function ExamPage() {
  const [sessionMode, setSessionMode] = useState("baseline");

  useEffect(() => {
    const mode = localStorage.getItem("shadowaudit_mode") || "baseline";
    setSessionMode(mode);
  }, []);

  const simulateTamper = async () => {
    // In a real scenario, this happens automatically via a background worker checking signals.
    // For the demo, we manually trigger the payload to the backend.
    try {
      await fetch("http://localhost:8000/sessions/demo/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: sessionMode,
          signal_type: "display_config_anomaly",
          raw_payload: {
            reported_display_count: 1,
            detected_rendering_contexts: 2,
            jitter_ms: 45.2
          },
          confidence: 0.94
        }),
      });
      console.log("Tamper signal dispatched.");
    } catch (err) {
      console.error("Failed to send signal", err);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 32 }}>
        Mock Certification Exam
      </h1>
      
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Question 1</h3>
        <p style={{ color: "var(--text-dim)", marginBottom: 24 }}>
          What is the primary vulnerability identified in the face-value trust of client-side display enumeration?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, color: "var(--text-primary)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="radio" name="q1" /> A) Network latency
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="radio" name="q1" /> B) Spoofable API returns
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="radio" name="q1" /> C) Memory leaks
          </label>
        </div>
      </div>

      <div style={{ marginTop: 64, padding: 24, border: "1px dashed var(--color-red)", borderRadius: 8, background: "rgba(255, 77, 109, 0.05)" }}>
        <h4 style={{ color: "var(--color-red)", marginBottom: 12, fontFamily: "var(--font-mono)", fontSize: 14 }}>[DEMO CONTROL PANEL]</h4>
        <p style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 16 }}>
          Clicking this button simulates a candidate activating a virtual monitor driver to mirror their exam tab to a secondary display, bypassing simple screen-count checks.
        </p>
        <button className="btn" style={{ borderColor: "var(--color-red)", color: "var(--color-red)" }} onClick={simulateTamper}>
          Trigger Tamper Action (Virtual Display Spoof)
        </button>
      </div>
    </div>
  );
}
