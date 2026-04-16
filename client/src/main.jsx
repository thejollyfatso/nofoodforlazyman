import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { useAppState } from "./state/useAppState";
import LoginView from "./views/LoginView";
import HouseholdsView from "./views/HouseholdsView";
import HouseholdDetailView from "./views/HouseholdDetailView";
import JoinHouseholdView from "./views/JoinHouseholdView";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

function App() {
  const {
    isAuthenticated,
    handleLogin,
    handleLogout,
    view,
    selectedHouseholdId,
    openHousehold,
    closeHousehold,
  } = useAppState();

  // Extract join token from URL once on mount
  const urlJoinToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("join");
  }, []);

  const [manualJoinToken, setManualJoinToken] = useState(null);
  const joinToken = manualJoinToken ?? urlJoinToken;

  const [joinPreview, setJoinPreview] = useState(null);
  const [joinDismissed, setJoinDismissed] = useState(false);

  useEffect(() => {
    if (!joinToken) return;
    let cancelled = false;
    fetch(`${BASE_URL}/households/invites/${joinToken}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setJoinPreview(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [joinToken]);

  function handleJoinWithToken(token) {
    setJoinDismissed(false);
    setManualJoinToken(token);
  }

  function clearJoinParam() {
    const url = new URL(window.location.href);
    url.searchParams.delete("join");
    window.history.replaceState(
      {},
      "",
      url.pathname + (url.search !== "?" ? url.search : "")
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} joinPreview={joinPreview} />;
  }

  if (joinToken && !joinDismissed) {
    return (
      <JoinHouseholdView
        token={joinToken}
        householdPreview={joinPreview}
        onJoined={(household) => {
          setJoinDismissed(true);
          setManualJoinToken(null);
          clearJoinParam();
          openHousehold(household.id);
        }}
        onCancel={() => {
          setJoinDismissed(true);
          setManualJoinToken(null);
          clearJoinParam();
        }}
      />
    );
  }

  if (view === "household_detail" && selectedHouseholdId) {
    return (
      <HouseholdDetailView
        householdId={selectedHouseholdId}
        onBack={closeHousehold}
      />
    );
  }

  return (
    <HouseholdsView
      onOpenHousehold={openHousehold}
      onLogout={handleLogout}
      onJoinWithToken={handleJoinWithToken}
    />
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
