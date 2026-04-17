import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { useAppState } from "./state/useAppState";
import { getDisplayContext, isAndroid } from "./utils/device";
import { useShoppingList } from "./state/useShoppingList";
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
import HomeView from "./views/HomeView";
import PlanView from "./views/PlanView";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

// ── Styles ──────────────────────────────────────────────────────────────────

const barStyle = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  height: "56px",
  background: "#fff",
  borderTop: "1px solid #e5e0d8",
  display: "flex",
  zIndex: 100,
  overflow: "visible",
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

function homeBtnStyle(active) {
  return {
    position: "absolute",
    top: "-28px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: active ? "var(--color-primary-dark)" : "var(--color-primary)",
    border: "3px solid #fff",
    boxShadow: "0 -2px 12px rgba(0,0,0,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#fff",
    zIndex: 101,
    padding: 0,
    lineHeight: 0,
  };
}

const menuCardStyle = {
  position: "absolute",
  bottom: "calc(100% + 8px)",
  background: "#fff",
  border: "1.5px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  boxShadow: "0 -4px 20px rgba(0,0,0,0.12)",
  padding: "6px",
  minWidth: "160px",
  zIndex: 200,
};

const householdPillMenuStyle = {
  display: "block",
  width: "100%",
  padding: "8px 12px",
  background: "var(--color-primary-light)",
  border: "1.5px solid var(--color-primary)",
  borderRadius: "20px",
  color: "var(--color-primary)",
  fontWeight: 700,
  fontSize: "13px",
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "center",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  boxSizing: "border-box",
};

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

// ── Icons ────────────────────────────────────────────────────────────────────

const IconRecipes = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-8-15.03-8-15.03 0h15.03zM1.02 17h15v2h-15z" />
  </svg>
);

const IconGroup = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </svg>
);

const IconCart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h11v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H18c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 22.46 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
  </svg>
);

const IconCog = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </svg>
);

const IconHome = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

const IconPerson = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const IconPlan = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
  </svg>
);

// ── DeviceBanner ─────────────────────────────────────────────────────────────

const BANNER_DISMISS_KEY = "device_banner_dismissed";

function DeviceBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(BANNER_DISMISS_KEY) === "1"
  );

  const ctx = getDisplayContext();
  if (dismissed || ctx === "installed") return null;

  function dismiss() {
    localStorage.setItem(BANNER_DISMISS_KEY, "1");
    setDismissed(true);
  }

  let message;
  if (ctx === "desktop-browser") {
    message =
      "Best on mobile — open this page on your phone for the full experience.";
  } else if (isAndroid()) {
    message =
      "Install the app: tap \u22EE (menu) then \u201CAdd to Home Screen\u201D.";
  } else {
    message =
      "Tap Share then \u201CAdd to Home Screen\u201D to install the app.";
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 300,
        background: "var(--color-primary)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        fontSize: "13px",
        lineHeight: "1.4",
        gap: "12px",
      }}
    >
      <span>{message}</span>
      <button
        onClick={dismiss}
        style={{
          background: "none",
          border: "none",
          color: "#fff",
          fontSize: "18px",
          lineHeight: 1,
          cursor: "pointer",
          padding: "2px 4px",
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}

// ── NavBar ───────────────────────────────────────────────────────────────────

function MenuRow({ icon, label, onClick, active }) {
  return (
    <button
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        padding: "10px 12px",
        background: active ? "var(--color-primary-light)" : "none",
        border: "none",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        color: active ? "var(--color-primary)" : "#374151",
        fontFamily: "inherit",
        fontSize: "14px",
        fontWeight: active ? "600" : "400",
        textAlign: "left",
        boxSizing: "border-box",
      }}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function NavBar({
  view,
  navContext,
  onNavigate,
  activeHousehold,
  onOpenActiveHousehold,
}) {
  const [personalOpen, setPersonalOpen] = useState(false);
  const [householdOpen, setHouseholdOpen] = useState(false);

  function closeMenus() {
    setPersonalOpen(false);
    setHouseholdOpen(false);
  }

  function navigate(v, ctx) {
    onNavigate(v, ctx);
    closeMenus();
  }

  const personalActive = navContext === "personal" && view !== "home";
  const householdActive =
    (navContext === "household" && view !== "home") || view === "households";
  const homeActive = view === "home";

  return (
    <>
      {(personalOpen || householdOpen) && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          onClick={closeMenus}
        />
      )}

      <div style={{ ...barStyle, position: "fixed" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: activeHousehold ? "50%" : 0,
            width: "50%",
            height: "2px",
            background: "var(--color-primary)",
            opacity: 0.5,
          }}
        />
        {/* Personal (left) */}
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            alignItems: "stretch",
          }}
        >
          <button
            style={{ ...tabBtnStyle(personalActive), flex: 1 }}
            onClick={() => {
              setPersonalOpen((o) => !o);
              setHouseholdOpen(false);
            }}
          >
            <IconPerson />
            Personal
          </button>
          {personalOpen && (
            <div style={{ ...menuCardStyle, left: 8 }}>
              <MenuRow
                icon={<IconRecipes />}
                label="Recipes"
                onClick={() => navigate("recipes", "personal")}
                active={view === "recipes" && navContext === "personal"}
              />
              <MenuRow
                icon={<IconCart />}
                label="Shopping"
                onClick={() => navigate("shopping", "personal")}
                active={view === "shopping" && navContext === "personal"}
              />
              <MenuRow
                icon={<IconPlan />}
                label="Plan"
                onClick={() => navigate("plan", "personal")}
                active={view === "plan" && navContext === "personal"}
              />
            </div>
          )}
        </div>

        {/* Center spacer for home button */}
        <div style={{ width: 72, flexShrink: 0 }} />

        {/* Household (right) */}
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            alignItems: "stretch",
          }}
        >
          <button
            style={{ ...tabBtnStyle(householdActive), flex: 1 }}
            onClick={() => {
              if (activeHousehold) {
                setHouseholdOpen((o) => !o);
                setPersonalOpen(false);
              } else {
                navigate("households", "household");
              }
            }}
          >
            <IconGroup />
            Household
          </button>
          {householdOpen && activeHousehold && (
            <div style={{ ...menuCardStyle, right: 8 }}>
              <button
                onClick={() => {
                  onOpenActiveHousehold();
                  closeMenus();
                }}
                style={householdPillMenuStyle}
              >
                {activeHousehold.name}
              </button>
              <div
                style={{
                  height: 1,
                  background: "var(--color-border)",
                  margin: "4px 0",
                }}
              />
              <MenuRow
                icon={<IconRecipes />}
                label="Recipes"
                onClick={() => navigate("recipes", "household")}
                active={view === "recipes" && navContext === "household"}
              />
              <MenuRow
                icon={<IconCart />}
                label="Shopping"
                onClick={() => navigate("shopping", "household")}
                active={view === "shopping" && navContext === "household"}
              />
              <MenuRow
                icon={<IconPlan />}
                label="Plan"
                onClick={() => navigate("plan", "household")}
                active={view === "plan" && navContext === "household"}
              />
            </div>
          )}
        </div>

        {/* Home button — protrudes above bar */}
        <button
          style={homeBtnStyle(homeActive)}
          onClick={() => navigate("home", null)}
          aria-label="Home"
        >
          <IconHome />
        </button>
      </div>
    </>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────

function App() {
  const {
    isAuthenticated,
    token,
    handleLogin,
    handleLogout,
    view,
    navContext,
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
    selectedRecipeSharedMeta,
    currentUserId,
    openRecipe,
    openHouseholdRecipe,
    openNewRecipe,
    openEditRecipe,
    openIngredientSelect,
    backFromRecipeSubView,
    backToRecipes,
  } = useAppState();

  const effectiveContextType =
    navContext === "household" && activeHousehold ? "household" : "personal";

  const shoppingOwnerId =
    effectiveContextType === "household" ? activeHousehold.id : currentUserId;

  const shopping = useShoppingList(
    { contextType: effectiveContextType, ownerId: shoppingOwnerId },
    token
  );

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
    return (
      <>
        <DeviceBanner />
        <LoginView onLogin={handleLogin} joinPreview={joinPreview} />
      </>
    );
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

  // Recipe sub-views (no nav bar)
  if (view === "recipe_detail" && selectedRecipeId) {
    return (
      <RecipeDetailView
        recipeId={selectedRecipeId}
        onBack={backToRecipes}
        onEdit={openEditRecipe}
        onChooseIngredients={openIngredientSelect}
        inShoppingList={shopping.isRecipeInList(selectedRecipeId)}
        onToggleShoppingList={(recipe) => {
          if (shopping.isRecipeInList(recipe.id)) {
            shopping.handleRemoveRecipe(
              recipe.id,
              recipe.ingredients,
              (multiSourceItems, newItems) => shopping.writeList(newItems)
            );
          } else {
            shopping.handleAddRecipe(recipe, recipe.ingredients);
            backToRecipes();
          }
        }}
        sharedMeta={selectedRecipeSharedMeta}
        currentUserId={currentUserId}
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
        activeHouseholdId={
          navContext === "household" ? (activeHousehold?.id ?? null) : null
        }
      />
    );
  }

  if (view === "ingredient_select" && selectedRecipeId) {
    return (
      <IngredientSelectView
        recipeId={selectedRecipeId}
        onBack={backFromRecipeSubView}
        onAddToList={(recipe, ingredients) => {
          shopping.handleAddRecipe(recipe, ingredients);
          backToRecipes();
        }}
      />
    );
  }

  // Household sub-view (no nav bar)
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

  // Settings (no nav bar)
  if (view === "settings") {
    return <SettingsView onBack={closeSettings} onLogout={handleLogout} />;
  }

  // Main tab views
  return (
    <>
      <DeviceBanner />
      {view === "home" && (
        <HomeView
          shopping={shopping}
          activeHousehold={activeHousehold}
          onOpenRecipe={openRecipe}
          onOpenHouseholdRecipe={openHouseholdRecipe}
          onNavigate={switchTab}
        />
      )}
      {view === "recipes" && (
        <RecipesView
          onOpenRecipe={openRecipe}
          onNewRecipe={openNewRecipe}
          activeHousehold={navContext === "household" ? activeHousehold : null}
          onOpenHouseholdRecipe={openHouseholdRecipe}
        />
      )}
      {view === "households" && (
        <HouseholdsView
          onOpenHousehold={openHousehold}
          onJoinWithToken={handleJoinWithToken}
          onActivateHousehold={setActiveHousehold}
        />
      )}
      {view === "shopping" && (
        <ShoppingView
          shopping={shopping}
          activeHousehold={navContext === "household" ? activeHousehold : null}
          shoppingContextType={effectiveContextType}
          currentUserId={currentUserId}
        />
      )}
      {view === "plan" && <PlanView />}
      <button style={cogBtnStyle} onClick={openSettings} aria-label="Settings">
        <IconCog />
      </button>
      <NavBar
        view={view}
        navContext={navContext}
        onNavigate={switchTab}
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
