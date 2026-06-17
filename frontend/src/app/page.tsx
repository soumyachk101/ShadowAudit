"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const [mode, setMode] = useState<"baseline" | "protected">("baseline");
  const router = useRouter();

  const handleStartSession = async () => {
    // Save mode to local storage for the demo
    localStorage.setItem("shadowaudit_mode", mode);
    
    // In a real flow, this would call the backend to create a session
    // For now, redirect to the admin dashboard and open the exam view
    window.open("/exam", "_blank");
    router.push("/admin");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div className="card" style={{ maxWidth: 500, width: "100%", textAlign: "center" }}>
        <h1 style={{ marginBottom: 16 }}>ShadowAudit PoC</h1>
        <p style={{ color: "var(--text-dim)", marginBottom: 32 }}>
          Select the operating mode for the mock session.
        </p>

        <div className="mode-switch-container" style={{ marginBottom: 32 }}>
          <button
            className={`mode-switch-btn ${mode === "baseline" ? "active-baseline" : ""}`}
            onClick={() => setMode("baseline")}
          >
            Baseline Mode
          </button>
          <button
            className={`mode-switch-btn ${mode === "protected" ? "active-protected" : ""}`}
            onClick={() => setMode("protected")}
          >
            Protected Mode
          </button>
        </div>

        <div style={{ height: 60, marginBottom: 24, fontSize: 14, color: "var(--text-dim)", textAlign: "left", padding: "0 16px" }}>
          {mode === "baseline"
            ? "> Mimics how most current systems behave — face-value signal trust. Tamper succeeds silently."
            : "> Detection layer active. Same tamper action triggers real-time flag + explanation."}
        </div>

        <button className="btn btn-primary" onClick={handleStartSession} style={{ width: "100%", padding: "16px 0", fontSize: 16 }}>
          Start Demo Session
        </button>
      </div>
    </div>
  );
}
