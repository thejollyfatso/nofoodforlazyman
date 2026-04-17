import { useState } from "react";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

const styles = {
  page: {
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: "360px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  heading: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1a1a1a",
    margin: "0 0 4px",
  },
  subtext: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: "16px",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
  },
  button: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    color: "#fff",
    background: "var(--color-primary)",
    border: "none",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  buttonDisabled: {
    background: "var(--color-primary-dark)",
    cursor: "not-allowed",
    opacity: 0.7,
  },
  error: {
    fontSize: "14px",
    color: "var(--color-danger)",
    background: "#fef2f2",
    borderRadius: "var(--radius-sm)",
    padding: "10px 14px",
  },
  inviteBanner: {
    fontSize: "14px",
    color: "var(--color-primary-dark)",
    background: "var(--color-primary-light)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 14px",
  },
  backButton: {
    background: "none",
    border: "none",
    padding: 0,
    fontSize: "14px",
    color: "var(--color-primary)",
    textDecoration: "underline",
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
  },
};

export default function LoginView({ onLogin, joinPreview }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleEmailSubmit(e) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/auth/magic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed.toLowerCase() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Failed to send code");
      }
      setStep("otp");
    } catch (err) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault();
    const trimmedCode = code.trim();
    if (!trimmedCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: trimmedCode,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Invalid code");
      }
      const data = await res.json();
      localStorage.setItem("mk_token", data.token);
      onLogin(data.token);
    } catch (err) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setStep("email");
    setCode("");
    setError(null);
  }

  const btnStyle = loading
    ? { ...styles.button, ...styles.buttonDisabled }
    : styles.button;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div>
          <h1 style={styles.heading}>No Food for Lazy Man</h1>
          <p style={styles.subtext}>
            {step === "email"
              ? "Enter your email to sign in"
              : `Check ${email} for your code`}
          </p>
        </div>

        {joinPreview && (
          <div style={styles.inviteBanner}>
            You&apos;ve been invited to join{" "}
            <strong>{joinPreview.household_name}</strong>. Sign in to accept, or
            paste the link in the app if you&apos;re already signed in on
            another device.
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        {step === "email" ? (
          <form style={styles.form} onSubmit={handleEmailSubmit}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              autoFocus
              autoComplete="email"
              required
            />
            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? "Sending…" : "Send Code"}
            </button>
          </form>
        ) : (
          <form style={styles.form} onSubmit={handleOtpSubmit}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={styles.input}
              autoFocus
              autoComplete="one-time-code"
              maxLength={6}
              required
            />
            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? "Verifying…" : "Sign In"}
            </button>
            <button
              type="button"
              style={styles.backButton}
              onClick={handleBack}
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
