"use client";

import { useState, useEffect, useRef } from "react";

type SignalLog = {
  id: string;
  time: string;
  info: string;
  type: "info" | "alert";
};

type AlertDetail = {
  signal_type: string;
  confidence: number;
  explanation: string;
  timestamp: string;
} | null;

export default function AdminDashboard() {
  const [mode, setMode] = useState("baseline");
  const [status, setStatus] = useState<"Monitoring" | "Alert Fired">("Monitoring");
  const [logs, setLogs] = useState<SignalLog[]>([]);
  const [alert, setAlert] = useState<AlertDetail>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const addLog = (info: string, type: "info" | "alert") => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      time: new Date().toISOString().substring(11, 19),
      info,
      type
    }]);
  };

  useEffect(() => {
    const storedMode = localStorage.getItem("shadowaudit_mode") || "baseline";
    setMode(storedMode);
    addLog(`Session started in ${storedMode.toUpperCase()} mode.`, "info");

    const connectWebSocket = () => {
      const ws = new WebSocket("ws://localhost:8000/ws/sessions/demo");
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.event === "signal_received") {
           addLog(`Incoming signal stream: ${data.signal_type}`, "info");
        } else if (data.event === "alert_fired") {
           addLog(`ANOMALY DETECTED: ${data.signal_type} [Confidence: ${data.confidence}]`, "alert");
           setStatus("Alert Fired");
           setAlert({
             signal_type: data.signal_type,
             confidence: data.confidence,
             explanation: data.explanation,
             timestamp: data.timestamp
           });
        }
      };

      ws.onclose = () => {
        setTimeout(connectWebSocket, 1000);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleModeToggle = async () => {
    const newMode = mode === "baseline" ? "protected" : "baseline";
    setMode(newMode);
    localStorage.setItem("shadowaudit_mode", newMode);
    setStatus("Monitoring");
    setAlert(null);
    addLog(`Switched to ${newMode.toUpperCase()} mode.`, "info");
    
    try {
      await fetch(`http://localhost:8000/sessions/demo/mode`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode })
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Topbar */}
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 18 }}>ShadowAudit::Admin</h2>
          
          <div className="mode-switch-container">
            <button
              className={`mode-switch-btn ${mode === "baseline" ? "active-baseline" : ""}`}
              onClick={handleModeToggle}
              style={{ padding: "6px 12px" }}
            >
              Baseline
            </button>
            <button
              className={`mode-switch-btn ${mode === "protected" ? "active-protected" : ""}`}
              onClick={handleModeToggle}
              style={{ padding: "6px 12px" }}
            >
              Protected
            </button>
          </div>
        </div>

        <div className={`pill ${status === "Monitoring" ? "pill-green" : "pill-red"}`}>
          <div className={`pill-dot ${status === "Monitoring" ? "pill-dot-green" : "pill-dot-red"}`}></div>
          {status}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", padding: 32, gap: 32 }}>
        
        {/* Terminal Feed */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <h3 style={{ marginBottom: 16, fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-dim)" }}>
            &gt; REALTIME_SIGNAL_FEED
          </h3>
          <div className="terminal-log" style={{ flex: 1, maxHeight: "none" }}>
            {logs.map(log => (
              <div key={log.id} className="terminal-line">
                <span className="terminal-time">[{log.time}]</span>
                <span className={log.type === "alert" ? "terminal-alert" : "terminal-info"}>{log.info}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Alert Card */}
        {alert && (
          <div className="card slide-in" style={{ width: 400, borderLeft: "3px solid var(--color-red)", height: "fit-content" }}>
            <h3 style={{ color: "var(--color-red)", marginBottom: 16 }}>Integrity Alert</h3>
            <div style={{ marginBottom: 16, fontSize: 14 }}>
              <div style={{ color: "var(--text-dim)", marginBottom: 4 }}>Timestamp</div>
              <div className="mono">{new Date(alert.timestamp).toLocaleTimeString()}</div>
            </div>
            <div style={{ marginBottom: 16, fontSize: 14 }}>
              <div style={{ color: "var(--text-dim)", marginBottom: 4 }}>Signal Category</div>
              <div className="mono" style={{ color: "var(--color-cyan)" }}>{alert.signal_type}</div>
            </div>
            <div style={{ marginBottom: 24, fontSize: 14 }}>
              <div style={{ color: "var(--text-dim)", marginBottom: 4 }}>Confidence</div>
              <div className="mono">{(alert.confidence * 100).toFixed(1)}%</div>
            </div>
            
            <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: 16, borderRadius: 6, fontSize: 15, lineHeight: 1.5 }}>
              <strong style={{ display: "block", marginBottom: 8, fontSize: 12, textTransform: "uppercase", color: "var(--text-dim)" }}>AI Explanation</strong>
              {alert.explanation}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
