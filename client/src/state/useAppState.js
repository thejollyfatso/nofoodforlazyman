import { useCallback, useEffect, useState } from "react";
import { setUnauthorizedHandler } from "../utils/apiFetch";

export function useAppState() {
  const [token, setToken] = useState(() => localStorage.getItem("mk_token"));
  const [view, setView] = useState("households");
  const [selectedHouseholdId, setSelectedHouseholdId] = useState(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("mk_token");
    setToken(null);
    setView("households");
    setSelectedHouseholdId(null);
  }, []);

  const handleLogin = useCallback((newToken) => {
    setToken(newToken);
  }, []);

  const openHousehold = useCallback((id) => {
    setSelectedHouseholdId(id);
    setView("household_detail");
  }, []);

  const closeHousehold = useCallback(() => {
    setSelectedHouseholdId(null);
    setView("households");
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleLogout);
    return () => setUnauthorizedHandler(null);
  }, [handleLogout]);

  return {
    token,
    isAuthenticated: !!token,
    handleLogin,
    handleLogout,
    view,
    selectedHouseholdId,
    openHousehold,
    closeHousehold,
  };
}
