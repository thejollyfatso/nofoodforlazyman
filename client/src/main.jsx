import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { useAppState } from "./state/useAppState";
import LoginView from "./views/LoginView";

function App() {
  const { isAuthenticated, handleLogin, handleLogout } = useAppState();

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div style={{ padding: "24px" }}>
      <p>Signed in. App coming soon.</p>
      <button
        onClick={handleLogout}
        style={{
          padding: "10px 20px",
          background: "var(--color-primary)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius-sm)",
          fontSize: "16px",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Sign out
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
