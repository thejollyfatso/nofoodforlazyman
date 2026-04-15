import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function checkHealth() {
    setLoading(true);
    setStatus(null);
    try {
      const base = import.meta.env.VITE_API_URL ?? "";
      const res = await fetch(`${base}/health`);
      const data = await res.json();
      setStatus({ ok: res.ok, data });
    } catch {
      setStatus({ ok: false, data: { error: "Request failed" } });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial",
        padding: "24px",
      }}
    >
      <div>!No Food for Lazy Man!</div>
      <button
        onClick={checkHealth}
        disabled={loading}
        style={{
          marginTop: "12px",
          padding: "10px 20px",
          background: loading ? "#C4512F" : "#E8623A",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontSize: "16px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Checking…" : "Health Check"}
      </button>
      {status && (
        <div
          style={{
            marginTop: "12px",
            fontSize: "14px",
            color: status.ok ? "#10B981" : "#EF4444",
          }}
        >
          {JSON.stringify(status.data)}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
