import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../utils/apiFetch";
import { normalizeIngredientName } from "../utils/normalizeIngredientName";
import { useToast, Toast } from "../components/Toast";

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
    paddingBottom: "60px",
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
  footer: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "#fff",
    borderTop: "1px solid var(--color-border)",
    display: "flex",
    padding: "10px 20px",
    gap: "12px",
    zIndex: 10,
  },
  footerBtn: {
    flex: 1,
    padding: "10px",
    fontSize: "15px",
    fontWeight: "600",
    background: "none",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontFamily: "inherit",
    color: "#374151",
  },
};

export default function RecipesView({ onOpenRecipe, onNewRecipe }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState("recipe");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const { toast, showToast } = useToast();

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

  // ── Export ───────────────────────────────────────────────────────────────

  function handleExport() {
    if (recipes.length === 0) {
      showToast("No recipes to export");
      return;
    }
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: "nf4lm",
      recipes: recipes.map((r) => ({
        id: r.id,
        title: r.title,
        notes: r.notes,
        ingredients: r.ingredients,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().split("T")[0];
    a.download = `nf4lm-v1-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Import ───────────────────────────────────────────────────────────────

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      showToast("Invalid JSON file");
      return;
    }

    if (!Array.isArray(data.recipes)) {
      showToast("Invalid backup file");
      return;
    }

    const issues = [];
    if (!data.version) issues.push("Missing version field");
    else if (data.version !== 1)
      issues.push(`Unknown version: ${data.version}`);

    const existingTitles = new Set(
      recipes.map((r) => r.title.trim().toLowerCase())
    );
    const toImport = [];
    let skipped = 0;

    for (const r of data.recipes) {
      if (!r.title?.trim()) {
        skipped++;
        issues.push(`Skipping recipe with no title`);
        continue;
      }
      const key = r.title.trim().toLowerCase();
      if (existingTitles.has(key)) {
        skipped++;
        issues.push(`Duplicate title skipped: "${r.title.trim()}"`);
        continue;
      }
      toImport.push(r);
      existingTitles.add(key);
    }

    if (toImport.length === 0) {
      showToast(
        skipped > 0
          ? `Nothing to import (${skipped} skipped)`
          : "Nothing to import"
      );
      return;
    }

    if (issues.length > 0) {
      const msg =
        `Issues found:\n${issues.slice(0, 5).join("\n")}` +
        (issues.length > 5 ? `\n…and ${issues.length - 5} more` : "") +
        `\n\nImport ${toImport.length} recipe(s)?`;
      if (!window.confirm(msg)) return;
    }

    setImporting(true);
    let imported = 0;
    let failed = 0;
    const added = [];

    for (const r of toImport) {
      try {
        const created = await apiFetch("/recipes", {
          method: "POST",
          body: JSON.stringify({
            title: r.title.trim(),
            notes: r.notes || "",
            ingredients: r.ingredients || [],
            created_at: r.createdAt || undefined,
          }),
        });
        added.push(created);
        imported++;
      } catch {
        failed++;
      }
    }

    setRecipes((prev) => {
      const updated = [...prev, ...added];
      updated.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return updated;
    });

    setImporting(false);
    const parts = [`Imported ${imported}`];
    if (skipped > 0) parts.push(`${skipped} skipped`);
    if (failed > 0) parts.push(`${failed} failed`);
    showToast(parts.join(", "));
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

      <div style={s.footer}>
        <button
          style={s.footerBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          {importing ? "Importing…" : "Import"}
        </button>
        <button style={s.footerBtn} onClick={handleExport}>
          Export
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleImportFile}
      />

      <Toast message={toast} />
    </div>
  );
}
