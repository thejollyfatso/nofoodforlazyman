import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { useAppState } from "./state/useAppState";
import LoginView from "./views/LoginView";
import HouseholdsView from "./views/HouseholdsView";
import HouseholdDetailView from "./views/HouseholdDetailView";
import JoinHouseholdView from "./views/JoinHouseholdView";
import RecipesView from "./views/RecipesView";
import RecipeDetailView from "./views/RecipeDetailView";
import RecipeEditView from "./views/RecipeEditView";
import IngredientSelectView from "./views/IngredientSelectView";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

const TAB_BAR_VIEWS = new Set(["recipes", "households"]);

const tabBarStyle = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  height: "56px",
  background: "#fff",
  borderTop: "1px solid #e5e0d8",
  display: "flex",
  zIndex: 100,
};

function tabBtnStyle(active) {
  return {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    color: active ? "var(--color-primary)" : "#9ca3af",
    fontSize: "11px",
    fontWeight: active ? "700" : "500",
    padding: "6px 0",
  };
}

function TabBar({ activeTab, onSwitch }) {
  return (
    <div style={tabBarStyle}>
      <button
        style={tabBtnStyle(activeTab === "recipes")}
        onClick={() => onSwitch("recipes")}
      >
        <span style={{ fontSize: "20px", lineHeight: 1 }}>📋</span>
        Recipes
      </button>
      <button
        style={tabBtnStyle(activeTab === "households")}
        onClick={() => onSwitch("households")}
      >
        <span style={{ fontSize: "20px", lineHeight: 1 }}>🏠</span>
        Households
      </button>
    </div>
  );
}

function App() {
  const {
    isAuthenticated,
    handleLogin,
    handleLogout,
    view,
    switchTab,
    selectedHouseholdId,
    openHousehold,
    closeHousehold,
    selectedRecipeId,
    openRecipe,
    openNewRecipe,
    openEditRecipe,
    openIngredientSelect,
    backFromRecipeSubView,
    backToRecipes,
  } = useAppState();

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

  // Recipe sub-views (no tab bar)
  if (view === "recipe_detail" && selectedRecipeId) {
    return (
      <RecipeDetailView
        recipeId={selectedRecipeId}
        onBack={backToRecipes}
        onEdit={openEditRecipe}
        onChooseIngredients={openIngredientSelect}
        inShoppingList={false}
        onToggleShoppingList={null}
      />
    );
  }

  if (view === "recipe_edit") {
    return (
      <RecipeEditView
        recipeId={selectedRecipeId}
        onBack={selectedRecipeId ? backFromRecipeSubView : backToRecipes}
        onSaved={backToRecipes}
        onDeleted={backToRecipes}
      />
    );
  }

  if (view === "ingredient_select" && selectedRecipeId) {
    return (
      <IngredientSelectView
        recipeId={selectedRecipeId}
        onBack={backFromRecipeSubView}
        onAddToList={null}
      />
    );
  }

  // Household sub-view (no tab bar)
  if (view === "household_detail" && selectedHouseholdId) {
    return (
      <HouseholdDetailView
        householdId={selectedHouseholdId}
        onBack={closeHousehold}
      />
    );
  }

  // Main tab views
  const activeTab = view === "households" ? "households" : "recipes";

  return (
    <>
      {view === "recipes" && (
        <RecipesView onOpenRecipe={openRecipe} onNewRecipe={openNewRecipe} />
      )}
      {view === "households" && (
        <HouseholdsView
          onOpenHousehold={openHousehold}
          onLogout={handleLogout}
          onJoinWithToken={handleJoinWithToken}
        />
      )}
      <TabBar activeTab={activeTab} onSwitch={switchTab} />
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
