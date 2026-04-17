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
import SettingsView from "./views/SettingsView";
import ShoppingView from "./views/ShoppingView";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

const TAB_BAR_VIEWS = new Set(["recipes", "households", "shopping"]);

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

const IconRecipes = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-8-15.03-8-15.03 0h15.03zM1.02 17h15v2h-15z" />
  </svg>
);

const IconGroup = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </svg>
);

const IconCart = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h11v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H18c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 22.46 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
  </svg>
);

const IconCog = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </svg>
);

function TabBar({
  activeTab,
  onSwitch,
  activeHousehold,
  onOpenActiveHousehold,
}) {
  return (
    <div style={tabBarStyle}>
      <button
        style={tabBtnStyle(activeTab === "recipes")}
        onClick={() => onSwitch("recipes")}
      >
        <IconRecipes />
        Recipes
      </button>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {activeHousehold ? (
          <button
            onClick={onOpenActiveHousehold}
            style={{
              background: "var(--color-primary-light)",
              border: "2px solid var(--color-primary)",
              borderRadius: "20px",
              color: "var(--color-primary)",
              fontWeight: 700,
              fontSize: "12px",
              padding: "5px 14px",
              width: "calc(100% - 12px)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              cursor: "pointer",
              fontFamily: "inherit",
              lineHeight: 1.3,
            }}
          >
            {activeHousehold.name}
          </button>
        ) : (
          <button
            style={tabBtnStyle(activeTab === "households")}
            onClick={() => onSwitch("households")}
          >
            <IconGroup />
            Households
          </button>
        )}
      </div>

      <button
        style={tabBtnStyle(activeTab === "shopping")}
        onClick={() => onSwitch("shopping")}
      >
        <IconCart />
        Shopping
      </button>
    </div>
  );
}

const cogBtnStyle = {
  position: "fixed",
  top: "12px",
  right: "16px",
  zIndex: 200,
  background: "none",
  border: "none",
  padding: "8px",
  cursor: "pointer",
  color: "#6b7280",
  lineHeight: 0,
};

function App() {
  const {
    isAuthenticated,
    handleLogin,
    handleLogout,
    view,
    switchTab,
    openSettings,
    closeSettings,
    activeHousehold,
    setActiveHousehold,
    clearActiveHousehold,
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
        activeHousehold={activeHousehold}
        onActivate={setActiveHousehold}
        onDeactivate={clearActiveHousehold}
      />
    );
  }

  // Settings (no tab bar)
  if (view === "settings") {
    return <SettingsView onBack={closeSettings} onLogout={handleLogout} />;
  }

  // Main tab views
  return (
    <>
      {view === "recipes" && (
        <RecipesView onOpenRecipe={openRecipe} onNewRecipe={openNewRecipe} />
      )}
      {view === "households" && (
        <HouseholdsView
          onOpenHousehold={openHousehold}
          onJoinWithToken={handleJoinWithToken}
          onActivateHousehold={setActiveHousehold}
        />
      )}
      {view === "shopping" && <ShoppingView />}
      <button style={cogBtnStyle} onClick={openSettings} aria-label="Settings">
        <IconCog />
      </button>
      <TabBar
        activeTab={view}
        onSwitch={switchTab}
        activeHousehold={activeHousehold}
        onOpenActiveHousehold={() => openHousehold(activeHousehold.id)}
      />
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
