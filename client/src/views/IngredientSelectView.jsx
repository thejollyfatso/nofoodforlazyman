import { useEffect, useState } from "react";
import { apiFetch } from "../utils/apiFetch";
import { formatQty } from "../utils/formatQty";

const s = {
  page: {
    minHeight: "100dvh",
    background: "var(--color-bg)",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 20px",
    borderBottom: "1px solid var(--color-border)",
    background: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    background: "none",
    border: "none",
    padding: "4px 0",
    fontSize: "16px",
    color: "var(--color-primary)",
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  headerLabel: {
    fontSize: "12px",
    color: "#6b7280",
    margin: "0 0 2px",
  },
  headerTitle: {
    fontSize: "17px",
    fontWeight: "700",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  body: {
    flex: 1,
    padding: "12px 0",
  },
  row: {
    display: "flex",
    alignItems: "center",
    padding: "13px 20px",
    gap: "14px",
    borderBottom: "1px solid var(--color-border)",
    background: "#fff",
    cursor: "pointer",
  },
  checkbox: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    border: "2px solid var(--color-border)",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
  },
  checkboxChecked: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    border: "2px solid var(--color-primary)",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--color-primary)",
  },
  checkmark: {
    color: "#fff",
    fontSize: "13px",
    fontWeight: "700",
  },
  ingInfo: {
    flex: 1,
    display: "flex",
    alignItems: "baseline",
    gap: "6px",
    flexWrap: "wrap",
  },
  qty: {
    color: "var(--color-primary)",
    fontWeight: "500",
    fontSize: "15px",
  },
  name: {
    fontSize: "15px",
    color: "#111",
  },
  footer: {
    padding: "16px 20px",
    borderTop: "1px solid var(--color-border)",
    background: "#fff",
  },
  addBtn: (hasSelected) => ({
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    background: hasSelected ? "var(--color-primary)" : "#d1d5db",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-md)",
    cursor: hasSelected ? "pointer" : "default",
    fontFamily: "inherit",
  }),
  empty: {
    textAlign: "center",
    color: "#6b7280",
    padding: "48px 20px",
    fontSize: "15px",
  },
};

export default function IngredientSelectView({
  recipeId,
  sharedMeta,
  onBack,
  onAddToList,
}) {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    const url = sharedMeta
      ? `/households/${sharedMeta.household_id}/recipes`
      : "/recipes";
    apiFetch(url)
      .then((list) => {
        const found = list.find((r) => r.id === recipeId);
        if (!found) return onBack();
        setRecipe(found);
        const allIdx = new Set((found.ingredients || []).map((_, i) => i));
        setSelected(allIdx);
      })
      .catch(() => onBack())
      .finally(() => setLoading(false));
  }, [recipeId, sharedMeta, onBack]);

  function toggleIngredient(i) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function handleAdd() {
    if (selected.size === 0) return;
    const ingredients = (recipe.ingredients || []).filter((_, i) =>
      selected.has(i)
    );
    onAddToList?.(recipe, ingredients);
  }

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={onBack}>
            ‹ Back
          </button>
        </div>
      </div>
    );
  }

  if (!recipe) return null;

  const ingredients = recipe.ingredients || [];

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>
          ‹ Back
        </button>
        <div style={s.headerInfo}>
          <p style={s.headerLabel}>Choose Ingredients</p>
          <p style={s.headerTitle}>{recipe.title}</p>
        </div>
      </div>

      <div style={s.body}>
        {ingredients.length === 0 ? (
          <p style={s.empty}>No ingredients in this recipe.</p>
        ) : (
          ingredients.map((ing, i) => {
            const checked = selected.has(i);
            const qtyStr = formatQty(ing.qty);
            const unitStr = ing.unit ? ` ${ing.unit}` : "";
            return (
              <div key={i} style={s.row} onClick={() => toggleIngredient(i)}>
                <div style={checked ? s.checkboxChecked : s.checkbox}>
                  {checked && <span style={s.checkmark}>✓</span>}
                </div>
                <div style={s.ingInfo}>
                  <span style={s.qty}>
                    {qtyStr}
                    {unitStr}
                  </span>
                  <span style={s.name}>{ing.name}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {ingredients.length > 0 && (
        <div style={s.footer}>
          <button style={s.addBtn(selected.size > 0)} onClick={handleAdd}>
            {selected.size > 0
              ? `Add ${selected.size} to Shopping List`
              : "Select ingredients to add"}
          </button>
        </div>
      )}
    </div>
  );
}
