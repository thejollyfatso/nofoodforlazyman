import { useEffect, useState } from "react";
import { apiFetch } from "../utils/apiFetch";
import { formatQty } from "../utils/formatQty";

const RECIPE_GREETINGS = [
  "cook it again...",
  "let's get cooking...",
  "what's for dinner?",
  "hungry?",
  "time to cook something good.",
  "what are we making today?",
];

const SHOPPING_GREETINGS = [
  "check the list...",
  "what do we need?",
  "ready to shop?",
  "don't forget anything.",
  "heading to the store?",
  "stock up...",
];

const RECIPE_GREETING =
  RECIPE_GREETINGS[Math.floor(Math.random() * RECIPE_GREETINGS.length)];
const SHOPPING_GREETING =
  SHOPPING_GREETINGS[Math.floor(Math.random() * SHOPPING_GREETINGS.length)];

function pickRandom(arr, n) {
  const copy = [...arr];
  const result = [];
  while (result.length < n && copy.length > 0) {
    const i = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(i, 1)[0]);
  }
  return result;
}

function SectionHeading({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        display: "block",
        marginBottom: "12px",
      }}
    >
      <h2
        style={{
          fontSize: "22px",
          fontWeight: "800",
          color: "#1f2937",
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {label}
      </h2>
    </button>
  );
}

function RecipeCard({ recipe, onOpen }) {
  const ingCount = recipe.ingredients?.length ?? 0;
  return (
    <button
      onClick={() => onOpen(recipe)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        background: "#fff",
        border: "1.5px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "inherit",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          fontSize: "15px",
          fontWeight: "600",
          color: "#1f2937",
          lineHeight: 1.3,
        }}
      >
        {recipe.title}
      </span>
      {ingCount > 0 && (
        <span style={{ fontSize: "13px", color: "#9ca3af" }}>
          {ingCount} ingredient{ingCount !== 1 ? "s" : ""}
        </span>
      )}
    </button>
  );
}

function ShoppingPreview({ items, navContext, onNavigate }) {
  const total = items.length;
  const checked = items.filter((i) => i.checked).length;
  const allDone = total > 0 && checked === total;
  const hasItems = total > 0;

  let icon, headline, sub, accent;

  if (!hasItems) {
    icon = "🛒";
    headline = "Your list is empty.";
    sub = "Add recipes or items to get started.";
    accent = "#9ca3af";
  } else if (allDone) {
    icon = "✅";
    headline = "All done!";
    sub = `${total} item${total !== 1 ? "s" : ""} checked off. Ready to clear.`;
    accent = "var(--color-in-list)";
  } else {
    icon = "📋";
    headline = `${total - checked} item${total - checked !== 1 ? "s" : ""} left`;
    sub =
      checked > 0
        ? `${checked} of ${total} checked.`
        : `${total} item${total !== 1 ? "s" : ""} on your list.`;
    accent = "var(--color-primary)";
  }

  const preview = items.filter((i) => !i.checked).slice(0, 3);
  const remaining = items.filter((i) => !i.checked).length - 3;

  return (
    <button
      onClick={() => onNavigate("shopping", navContext)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        background: "#fff",
        border: "1.5px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "16px",
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "inherit",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "22px", lineHeight: 1 }}>{icon}</span>
        <div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: accent }}>
            {headline}
          </div>
          <div style={{ fontSize: "13px", color: "#9ca3af", marginTop: "1px" }}>
            {sub}
          </div>
        </div>
      </div>
      {preview.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {preview.map((item) => {
            const qtyStr = item.quantities
              ?.map((q) => formatQty(q.qty, q.unit))
              .filter(Boolean)
              .join(", ");
            return (
              <div
                key={item.id}
                style={{
                  fontSize: "13px",
                  color: "#4b5563",
                  display: "flex",
                  gap: "6px",
                }}
              >
                <span style={{ color: "var(--color-border)" }}>·</span>
                <span>
                  {item.name}
                  {qtyStr ? (
                    <span style={{ color: "#9ca3af" }}> — {qtyStr}</span>
                  ) : null}
                </span>
              </div>
            );
          })}
          {remaining > 0 && (
            <div
              style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}
            >
              +{remaining} more
            </div>
          )}
        </div>
      )}
    </button>
  );
}

export default function HomeView({
  shopping,
  activeHousehold,
  onOpenRecipe,
  onOpenHouseholdRecipe,
  onNavigate,
}) {
  const [recipes, setRecipes] = useState([]);
  const [preview, setPreview] = useState([]);

  const recipesUrl = activeHousehold
    ? `/households/${activeHousehold.id}/recipes`
    : "/recipes";
  const navContext = activeHousehold ? "household" : "personal";

  useEffect(() => {
    let cancelled = false;
    apiFetch(recipesUrl)
      .then((data) => {
        if (cancelled) return;
        setRecipes(data);
        setPreview(pickRandom(data, 3));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [recipesUrl]);

  function handleOpenRecipe(recipe) {
    if (activeHousehold && recipe.shared_by) {
      onOpenHouseholdRecipe(recipe.id, {
        shared_by: recipe.shared_by,
        obfuscate_secrets: recipe.obfuscate_secrets,
        household_id: activeHousehold.id,
      });
    } else {
      onOpenRecipe(recipe.id);
    }
  }

  const shoppingItems = shopping?.items ?? [];

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "88px",
      }}
    >
      {/* Hero banner */}
      <div
        style={{
          background: "var(--color-primary)",
          padding: "48px 24px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <img
          src="/favicon/web-app-manifest-512x512.png"
          alt="No Food for Lazy Man"
          style={{ width: "64px", height: "64px", borderRadius: "16px" }}
        />
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            fontWeight: "700",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          No Food for Lazy Man
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "28px",
          padding: "28px 20px 0",
        }}
      >
        {/* Recipe section */}
        <section>
          <SectionHeading
            label={RECIPE_GREETING}
            onClick={() => onNavigate("recipes", navContext)}
          />
          {preview.length > 0 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {preview.map((r) => (
                <RecipeCard key={r.id} recipe={r} onOpen={handleOpenRecipe} />
              ))}
            </div>
          )}
          {recipes.length === 0 && (
            <p style={{ fontSize: "14px", color: "#9ca3af", margin: 0 }}>
              No recipes yet. Add one to get started.
            </p>
          )}
        </section>

        {/* Shopping section */}
        <section>
          <SectionHeading
            label={SHOPPING_GREETING}
            onClick={() => onNavigate("shopping", navContext)}
          />
          <ShoppingPreview
            items={shoppingItems}
            navContext={navContext}
            onNavigate={onNavigate}
          />
        </section>
      </div>
    </div>
  );
}
