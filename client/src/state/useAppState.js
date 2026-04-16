import { useCallback, useEffect, useState } from "react";
import { setUnauthorizedHandler } from "../utils/apiFetch";

export function useAppState() {
  const [token, setToken] = useState(() => localStorage.getItem("mk_token"));
  const [view, setView] = useState("recipes");
  const [selectedHouseholdId, setSelectedHouseholdId] = useState(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [recipeNavStack, setRecipeNavStack] = useState([]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("mk_token");
    setToken(null);
    setView("recipes");
    setSelectedHouseholdId(null);
    setSelectedRecipeId(null);
    setRecipeNavStack([]);
  }, []);

  const handleLogin = useCallback((newToken) => {
    setToken(newToken);
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
    setView("recipe_detail");
  }, []);

  const openNewRecipe = useCallback(() => {
    setSelectedRecipeId(null);
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
    setRecipeNavStack([]);
    setView("recipes");
  }, []);

  // ── Tab switch ──────────────────────────────────────────────────────────

  const switchTab = useCallback((tab) => {
    if (tab === "recipes") {
      setSelectedRecipeId(null);
      setRecipeNavStack([]);
      setView("recipes");
    } else {
      setSelectedHouseholdId(null);
      setView("households");
    }
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
    switchTab,
    // Households
    selectedHouseholdId,
    openHousehold,
    closeHousehold,
    // Recipes
    selectedRecipeId,
    openRecipe,
    openNewRecipe,
    openEditRecipe,
    openIngredientSelect,
    backFromRecipeSubView,
    backToRecipes,
  };
}
