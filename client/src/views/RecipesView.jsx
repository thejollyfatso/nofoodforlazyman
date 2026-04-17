import { useEffect, useState } from "react";
import { apiFetch } from "../utils/apiFetch";
import { normalizeIngredientName } from "../utils/normalizeIngredientName";

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function matchesTerm(term, ingredientNames) {
  const t = term.toLowerCase();
  for (const name of ingredientNames) {
    const n = normalizeIngredientName(name);
    if (t.length < 4) {
      if (n === t || n.split(" ").some((w) => w === t)) return true;
    } else {
      const words = n.split(" ");
      if (words.some((w) => levenshtein(t, w) <= 1)) return true;
      if (levenshtein(t, n) <= 1) return true;
    }
  }
  return false;
}

const s = {
  page: {
    minHeight: "100dvh",
    background: "var(--color-bg)",
    display: "flex",
    flexDirection: "column",
    paddingBottom: "56px",
  },
  header: {
    padding: "20px 20px 0",
  },
  title: { fontSize: "22px", fontWeight: "700", margin: "0 0 14px" },
  searchRow: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "4px",
  },
  searchInput: {
    width: "100%",
    padding: "11px 14px",
    fontSize: "16px",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  segmented: {
    display: "flex",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    overflow: "hidden",
    background: "#fff",
  },
  segBtn: (active) => ({
    flex: 1,
    padding: "8px",
    fontSize: "14px",
    fontWeight: "600",
    border: "none",
    background: active ? "var(--color-primary)" : "transparent",
    color: active ? "#fff" : "#374151",
    cursor: "pointer",
    fontFamily: "inherit",
  }),
  body: {
    padding: "12px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    flex: 1,
  },
  addBtn: {
    background: "var(--color-primary)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-md)",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "inherit",
    width: "100%",
  },
  card: {
    background: "#fff",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
  },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTitle: {
    fontSize: "16px",
    fontWeight: "700",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cardMeta: { fontSize: "13px", color: "#6b7280", margin: "2px 0 0" },
  chevron: { color: "#9ca3af", fontSize: "20px", flexShrink: 0 },
  empty: {
    textAlign: "center",
    color: "#6b7280",
    padding: "48px 0 20px",
    fontSize: "15px",
  },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    padding: "4px 0 2px",
  },
};

export default function RecipesView({ onOpenRecipe, onNewRecipe }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState("recipe");

  useEffect(() => {
    apiFetch("/recipes")
      .then(setRecipes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function pluralIngredients(n) {
    return `${n} ingredient${n === 1 ? "" : "s"}`;
  }

  // ── Filter / search ──────────────────────────────────────────────────────

  function filterRecipes() {
    const q = query.trim();
    if (!q)
      return {
        sorted: [...recipes].sort((a, b) => a.title.localeCompare(b.title)),
      };

    if (searchMode === "recipe") {
      const ql = q.toLowerCase();
      const sorted = recipes
        .filter((r) => r.title.toLowerCase().includes(ql))
        .sort((a, b) => a.title.localeCompare(b.title));
      return { sorted };
    }

    // Ingredient search
    const terms = q.split(/\s+/).filter(Boolean);
    const matchAll = [];
    const matchAny = [];

    for (const r of recipes) {
      const names = (r.ingredients || []).map((i) => i.name);
      const allMatch = terms.every((t) => matchesTerm(t, names));
      const anyMatch = !allMatch && terms.some((t) => matchesTerm(t, names));
      if (allMatch) matchAll.push(r);
      else if (anyMatch) matchAny.push(r);
    }

    matchAll.sort((a, b) => a.title.localeCompare(b.title));
    matchAny.sort((a, b) => a.title.localeCompare(b.title));
    return { matchAll, matchAny };
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const filtered = filterRecipes();

  function RecipeCard({ recipe }) {
    const n = (recipe.ingredients || []).length;
    return (
      <div style={s.card} onClick={() => onOpenRecipe(recipe.id)}>
        <div style={s.cardInfo}>
          <p style={s.cardTitle}>{recipe.title}</p>
          <p style={s.cardMeta}>{pluralIngredients(n)}</p>
        </div>
        <span style={s.chevron}>›</span>
      </div>
    );
  }

  function renderList() {
    if (loading) {
      return (
        <p style={{ color: "#6b7280", textAlign: "center", padding: "32px 0" }}>
          Loading…
        </p>
      );
    }

    const q = query.trim();

    if (!q) {
      const { sorted } = filtered;
      if (sorted.length === 0) {
        return <p style={s.empty}>No recipes yet. Tap + to add one.</p>;
      }
      return sorted.map((r) => <RecipeCard key={r.id} recipe={r} />);
    }

    if (searchMode === "recipe") {
      const { sorted } = filtered;
      if (sorted.length === 0) {
        return <p style={s.empty}>{`No recipes match "${q}".`}</p>;
      }
      return sorted.map((r) => <RecipeCard key={r.id} recipe={r} />);
    }

    // Ingredient mode
    const { matchAll, matchAny } = filtered;
    if (matchAll.length === 0 && matchAny.length === 0) {
      return <p style={s.empty}>{`No recipes match "${q}".`}</p>;
    }
    return (
      <>
        {matchAll.length > 0 && (
          <>
            <p style={s.sectionLabel}>All</p>
            {matchAll.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </>
        )}
        {matchAny.length > 0 && (
          <>
            <p style={s.sectionLabel}>Any</p>
            {matchAny.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </>
        )}
      </>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <p style={s.title}>Recipes</p>
        <div style={s.searchRow}>
          <input
            style={s.searchInput}
            type="search"
            placeholder={
              searchMode === "recipe"
                ? "Search by recipe name…"
                : "Search by ingredient…"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div style={s.segmented}>
            <button
              style={s.segBtn(searchMode === "recipe")}
              onClick={() => setSearchMode("recipe")}
            >
              Recipe
            </button>
            <button
              style={s.segBtn(searchMode === "ingredient")}
              onClick={() => setSearchMode("ingredient")}
            >
              Ingredient
            </button>
          </div>
        </div>
      </div>

      <div style={s.body}>
        {!loading && (
          <button style={s.addBtn} onClick={onNewRecipe}>
            + New Recipe
          </button>
        )}
        {renderList()}
      </div>
    </div>
  );
}
