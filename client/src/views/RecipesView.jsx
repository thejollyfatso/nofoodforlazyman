import { useEffect, useState } from "react";
import { apiFetch } from "../utils/apiFetch";
import { normalizeIngredientName } from "../utils/normalizeIngredientName";
import Avatar from "../components/Avatar";

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
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "14px",
  },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
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
  shareBtn: {
    background: "#fff",
    color: "var(--color-primary)",
    border: "1.5px solid var(--color-primary)",
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
  groupHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 0 4px",
  },
  groupName: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#374151",
  },
  // Share picker modal
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    zIndex: 200,
    display: "flex",
    alignItems: "flex-end",
  },
  modalSheet: {
    background: "#fff",
    borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
    width: "100%",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  modalHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid var(--color-border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: "16px",
    fontWeight: "700",
    margin: 0,
  },
  modalClose: {
    background: "none",
    border: "none",
    fontSize: "22px",
    cursor: "pointer",
    color: "#6b7280",
    fontFamily: "inherit",
    padding: "0 4px",
    lineHeight: 1,
  },
  modalBody: {
    overflowY: "auto",
    padding: "12px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  pickerCard: {
    background: "#fff",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
  },
  pickerCardShared: {
    background: "#f3f4f6",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    opacity: 0.55,
  },
  pickerTitle: {
    flex: 1,
    fontSize: "15px",
    fontWeight: "600",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  sharedBadge: {
    fontSize: "11px",
    fontWeight: "600",
    color: "var(--color-in-list)",
    background: "#d1fae5",
    borderRadius: "4px",
    padding: "2px 6px",
    flexShrink: 0,
  },
};

export default function RecipesView({
  onOpenRecipe,
  onNewRecipe,
  activeHousehold,
  onOpenHouseholdRecipe,
}) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState("recipe");
  const [groupView, setGroupView] = useState(true);

  // Share picker state
  const [showSharePicker, setShowSharePicker] = useState(false);
  const [personalRecipes, setPersonalRecipes] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [sharingId, setSharingId] = useState(null);
  const [sharedIds, setSharedIds] = useState(new Set());

  function fetchRecipes() {
    setLoading(true);
    const url = activeHousehold
      ? `/households/${activeHousehold.id}/recipes`
      : "/recipes";
    apiFetch(url)
      .then((data) => {
        setRecipes(data);
        if (activeHousehold) {
          setSharedIds(new Set(data.map((r) => r.id)));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setQuery("");
    fetchRecipes();
  }, [activeHousehold]);

  async function openSharePicker() {
    setShowSharePicker(true);
    setPickerLoading(true);
    try {
      const list = await apiFetch("/recipes");
      setPersonalRecipes(list);
    } catch {
      setPersonalRecipes([]);
    } finally {
      setPickerLoading(false);
    }
  }

  async function handleShare(recipe) {
    if (sharedIds.has(recipe.id)) return;
    setSharingId(recipe.id);
    try {
      await apiFetch(`/households/${activeHousehold.id}/recipes/${recipe.id}`, {
        method: "POST",
      });
      setSharedIds((prev) => new Set([...prev, recipe.id]));
      fetchRecipes();
    } catch {
      // ignore
    } finally {
      setSharingId(null);
    }
  }

  function pluralIngredients(n) {
    return `${n} ingredient${n === 1 ? "" : "s"}`;
  }

  // ── Filter / search ──────────────────────────────────────────────────────

  function filterRecipes(list) {
    const q = query.trim();
    if (!q)
      return {
        sorted: [...list].sort((a, b) => a.title.localeCompare(b.title)),
      };

    if (searchMode === "recipe") {
      const ql = q.toLowerCase();
      const sorted = list
        .filter((r) => r.title.toLowerCase().includes(ql))
        .sort((a, b) => a.title.localeCompare(b.title));
      return { sorted };
    }

    // Ingredient search
    const terms = q.split(/\s+/).filter(Boolean);
    const matchAll = [];
    const matchAny = [];

    for (const r of list) {
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

  // ── Render helpers ───────────────────────────────────────────────────────

  function RecipeCard({ recipe }) {
    const n = (recipe.ingredients || []).length;
    const sharedBy = recipe.shared_by;
    function handleClick() {
      if (activeHousehold && sharedBy) {
        onOpenHouseholdRecipe(recipe.id, {
          shared_by: sharedBy,
          obfuscate_secrets: recipe.obfuscate_secrets,
          household_id: activeHousehold.id,
        });
      } else {
        onOpenRecipe(recipe.id);
      }
    }
    return (
      <div style={s.card} onClick={handleClick}>
        {sharedBy && (
          <Avatar
            letter={sharedBy.avatar_letter}
            color={sharedBy.avatar_color}
            size={32}
          />
        )}
        <div style={s.cardInfo}>
          <p style={s.cardTitle}>{recipe.title}</p>
          <p style={s.cardMeta}>{pluralIngredients(n)}</p>
        </div>
        <span style={s.chevron}>›</span>
      </div>
    );
  }

  function renderGrouped(list) {
    const groups = new Map();
    for (const r of list) {
      const uid = r.shared_by?.user_id || "__personal";
      if (!groups.has(uid))
        groups.set(uid, { member: r.shared_by, recipes: [] });
      groups.get(uid).recipes.push(r);
    }
    const sections = [];
    for (const [, group] of groups) {
      const m = group.member;
      const name = m?.alias || "";
      sections.push(
        <div key={m?.user_id || "__personal"}>
          <div style={s.groupHeader}>
            {m && (
              <Avatar
                letter={m.avatar_letter}
                color={m.avatar_color}
                size={24}
              />
            )}
            {name && <span style={s.groupName}>{name}</span>}
          </div>
          {group.recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      );
    }
    return sections;
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
    const filtered = filterRecipes(recipes);

    if (!q) {
      const { sorted } = filtered;
      if (sorted.length === 0) {
        if (activeHousehold) {
          return (
            <p style={s.empty}>
              No recipes shared yet. Tap &quot;Share a Recipe&quot; to add one.
            </p>
          );
        }
        return <p style={s.empty}>No recipes yet. Tap + to add one.</p>;
      }
      if (activeHousehold && groupView) return renderGrouped(sorted);
      return sorted.map((r) => <RecipeCard key={r.id} recipe={r} />);
    }

    if (searchMode === "recipe") {
      const { sorted } = filtered;
      if (sorted.length === 0) {
        return <p style={s.empty}>{`No recipes match "${q}".`}</p>;
      }
      if (activeHousehold && groupView) return renderGrouped(sorted);
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

  const title = activeHousehold ? activeHousehold.name : "Recipes";

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.titleRow}>
          <p style={s.title}>{title}</p>
          {activeHousehold && (
            <div style={{ marginLeft: "auto", ...s.segmented }}>
              <button
                style={s.segBtn(groupView)}
                onClick={() => setGroupView(true)}
              >
                Grouped
              </button>
              <button
                style={s.segBtn(!groupView)}
                onClick={() => setGroupView(false)}
              >
                Mixed
              </button>
            </div>
          )}
        </div>
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
          <>
            <button style={s.addBtn} onClick={onNewRecipe}>
              + New Recipe
            </button>
            {activeHousehold && (
              <button style={s.shareBtn} onClick={openSharePicker}>
                Share a Recipe
              </button>
            )}
          </>
        )}
        {renderList()}
      </div>

      {showSharePicker && (
        <div style={s.modalBackdrop} onClick={() => setShowSharePicker(false)}>
          <div style={s.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <p style={s.modalTitle}>Share a Recipe</p>
              <button
                style={s.modalClose}
                onClick={() => setShowSharePicker(false)}
              >
                ×
              </button>
            </div>
            <div style={s.modalBody}>
              {pickerLoading && (
                <p style={{ color: "#6b7280", textAlign: "center" }}>
                  Loading…
                </p>
              )}
              {!pickerLoading && personalRecipes.length === 0 && (
                <p style={{ color: "#6b7280", textAlign: "center" }}>
                  No personal recipes yet.
                </p>
              )}
              {!pickerLoading &&
                [...personalRecipes]
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map((r) => {
                    const alreadyShared = sharedIds.has(r.id);
                    const isSharing = sharingId === r.id;
                    return (
                      <div
                        key={r.id}
                        style={
                          alreadyShared ? s.pickerCardShared : s.pickerCard
                        }
                        onClick={() => !alreadyShared && handleShare(r)}
                      >
                        <p style={s.pickerTitle}>{r.title}</p>
                        {alreadyShared && (
                          <span style={s.sharedBadge}>Shared</span>
                        )}
                        {isSharing && (
                          <span style={{ fontSize: "13px", color: "#6b7280" }}>
                            Sharing…
                          </span>
                        )}
                      </div>
                    );
                  })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
