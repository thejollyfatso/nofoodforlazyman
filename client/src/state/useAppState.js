import { useCallback, useEffect, useState } from "react";
import { setUnauthorizedHandler } from "../utils/apiFetch";

export function useAppState() {
  const [token, setToken] = useState(() => localStorage.getItem("mk_token"));

  const handleLogout = useCallback(() => {
    localStorage.removeItem("mk_token");
    setToken(null);
  }, []);

  const handleLogin = useCallback((newToken) => {
    setToken(newToken);
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
  };
}
