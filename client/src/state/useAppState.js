import { useCallback, useEffect, useMemo, useState } from "react";
import { setUnauthorizedHandler } from "../utils/apiFetch";

function decodeTokenPayload(token) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function decodeTokenUserId(token) {
  return decodeTokenPayload(token)?.sub ?? null;
}

const NAV_VIEWS = ["home", "recipes", "shopping", "plan"];

export function useAppState() {
  const [token, setToken] = useState(() => localStorage.getItem("mk_token"));
  const [view, setView] = useState("home");
  const [navContext, setNavContext] = useState(() => {
    try {
      return localStorage.getItem("active_household")
        ? "household"
        : "personal";
    } catch {
      return "personal";
    }
  });
  const [selectedHouseholdId, setSelectedHouseholdId] = useState(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [selectedRecipeSharedMeta, setSelectedRecipeSharedMeta] =
    useState(null);
  const [recipeNavStack, setRecipeNavStack] = useState([]);
  const [preSettingsView, setPreSettingsView] = useState("home");
  const [activeHousehold, setActiveHouseholdState] = useState(() => {
    try {
      const saved = localStorage.getItem("active_household");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const currentUserId = useMemo(() => decodeTokenUserId(token), [token]);
  const isDemoMode = useMemo(
    () => decodeTokenPayload(token)?.demo === true,
    [token]
  );

  const openSettings = useCallback(() => {
    setView((current) => {
      setPreSettingsView(current);
      return "settings";
    });
  }, []);

  const closeSettings = useCallback(() => {
    setView(preSettingsView);
  }, [preSettingsView]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("mk_token");
    localStorage.removeItem("active_household");
    setToken(null);
    setView("home");
    setNavContext("personal");
    setSelectedHouseholdId(null);
    setSelectedRecipeId(null);
    setSelectedRecipeSharedMeta(null);
    setRecipeNavStack([]);
    setActiveHouseholdState(null);
  }, []);

  const handleLogin = useCallback((newToken) => {
    setToken(newToken);
  }, []);

  // ── Active household context ────────────────────────────────────────────

  const setActiveHousehold = useCallback((household) => {
    try {
      localStorage.setItem("active_household", JSON.stringify(household));
    } catch {}
    setActiveHouseholdState(household);
    setNavContext("household");
    setSelectedRecipeId(null);
    setSelectedRecipeSharedMeta(null);
    setRecipeNavStack([]);
    setView("recipes");
  }, []);

  const clearActiveHousehold = useCallback(() => {
    localStorage.removeItem("active_household");
    setNavContext("personal");
    setActiveHouseholdState(null);
    setSelectedRecipeSharedMeta(null);
    setView("home");
  }, []);

  const switchContextToPersonal = useCallback(() => {
    localStorage.removeItem("active_household");
    setActiveHouseholdState(null);
    setSelectedRecipeSharedMeta(null);
    setNavContext("personal");
    setView((v) => (NAV_VIEWS.includes(v) ? v : "home"));
  }, []);

  const switchContextToHousehold = useCallback((household) => {
    try {
      localStorage.setItem("active_household", JSON.stringify(household));
    } catch {}
    setActiveHouseholdState(household);
    setSelectedRecipeId(null);
    setSelectedRecipeSharedMeta(null);
    setRecipeNavStack([]);
    setNavContext("household");
    setView((v) => (NAV_VIEWS.includes(v) ? v : "home"));
  }, []);

  // ── Household navigation ────────────────────────────────────────────────

  const openHousehold = useCallback((id) => {
    setSelectedHouseholdId(id);
    setView("household_detail");
  }, []);

  const closeHousehold = useCallback(() => {
    setSelectedHouseholdId(null);
    setView("households");
  }, []);

  // ── Recipe navigation ───────────────────────────────────────────────────

  const openRecipe = useCallback((id) => {
    setSelectedRecipeId(id);
    setSelectedRecipeSharedMeta(null);
    setView("recipe_detail");
  }, []);

  const openHouseholdRecipe = useCallback((id, sharedMeta) => {
    setSelectedRecipeId(id);
    setSelectedRecipeSharedMeta(sharedMeta);
    setView("recipe_detail");
  }, []);

  const openNewRecipe = useCallback(() => {
    setSelectedRecipeId(null);
    setSelectedRecipeSharedMeta(null);
    setView("recipe_edit");
  }, []);

  const openEditRecipe = useCallback((id) => {
    setSelectedRecipeId(id);
    setRecipeNavStack((s) => [...s, "recipe_detail"]);
    setView("recipe_edit");
  }, []);

  const openIngredientSelect = useCallback((id) => {
    setSelectedRecipeId(id);
    setRecipeNavStack((s) => [...s, "recipe_detail"]);
    setView("ingredient_select");
  }, []);

  const backFromRecipeSubView = useCallback(() => {
    setRecipeNavStack((prev) => {
      const next = [...prev];
      const target = next.pop() || "recipes";
      setView(target);
      return next;
    });
  }, []);

  const backToRecipes = useCallback(() => {
    setSelectedRecipeId(null);
    setSelectedRecipeSharedMeta(null);
    setRecipeNavStack([]);
    setView("recipes");
  }, []);

  // ── Tab switch ──────────────────────────────────────────────────────────

  const switchTab = useCallback((tab, context) => {
    if (context != null) setNavContext(context);
    if (tab === "recipes") {
      setSelectedRecipeId(null);
      setSelectedRecipeSharedMeta(null);
      setRecipeNavStack([]);
      setView("recipes");
    } else if (tab === "households") {
      setSelectedHouseholdId(null);
      setView("households");
    } else if (tab === "home") {
      setView("home");
    } else {
      setView(tab);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleLogout);
    return () => setUnauthorizedHandler(null);
  }, [handleLogout]);

  return {
    token,
    isAuthenticated: !!token,
    currentUserId,
    isDemoMode,
    handleLogin,
    handleLogout,
    view,
    navContext,
    switchTab,
    openSettings,
    closeSettings,
    // Active household context
    activeHousehold,
    setActiveHousehold,
    clearActiveHousehold,
    switchContextToPersonal,
    switchContextToHousehold,
    // Households
    selectedHouseholdId,
    openHousehold,
    closeHousehold,
    // Recipes
    selectedRecipeId,
    selectedRecipeSharedMeta,
    openRecipe,
    openHouseholdRecipe,
    openNewRecipe,
    openEditRecipe,
    openIngredientSelect,
    backFromRecipeSubView,
    backToRecipes,
  };
}
