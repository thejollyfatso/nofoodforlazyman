import { useEffect, useState } from "react";
import { apiFetch } from "../utils/apiFetch";
import { formatQty } from "../utils/formatQty";
import SubstitutionsModal from "../components/SubstitutionsModal";
import Avatar from "../components/Avatar";

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
  headerTitle: {
    flex: 1,
    fontSize: "17px",
    fontWeight: "700",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  editBtn: {
    background: "none",
    border: "none",
    padding: "4px 0",
    fontSize: "16px",
    color: "var(--color-primary)",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: "600",
    flexShrink: 0,
  },
  body: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  sharerRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sharerName: {
    fontSize: "13px",
    color: "#6b7280",
  },
  sectionLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    margin: "0 0 10px",
  },
  ingredientRow: {
    display: "flex",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid var(--color-border)",
    gap: "10px",
  },
  ingredientLeft: {
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
    flexShrink: 0,
  },
  name: {
    fontSize: "15px",
    color: "#111",
  },
  optionalBadge: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#6b7280",
    background: "#f3f4f6",
    borderRadius: "4px",
    padding: "1px 5px",
    flexShrink: 0,
  },
  secretBadge: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#7c3aed",
    background: "#ede9fe",
    borderRadius: "4px",
    padding: "1px 5px",
    flexShrink: 0,
  },
  subChevron: {
    background: "none",
    border: "none",
    padding: "4px 8px",
    fontSize: "18px",
    color: "#9ca3af",
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  addListBtn: (inList) => ({
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    background: inList ? "var(--color-in-list)" : "var(--color-primary)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontFamily: "inherit",
    width: "100%",
  }),
  chooseBtn: {
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    background: "#fff",
    color: "#374151",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontFamily: "inherit",
    width: "100%",
  },
  ownerSection: {
    background: "#fff",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  obfuscateRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "15px",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    accentColor: "var(--color-primary)",
    cursor: "pointer",
  },
  unshareBtn: {
    padding: "11px",
    fontSize: "14px",
    fontWeight: "600",
    background: "none",
    color: "var(--color-danger)",
    border: "1.5px solid var(--color-danger)",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontFamily: "inherit",
    width: "100%",
  },
  notes: {
    fontSize: "14px",
    color: "#374151",
    whiteSpace: "pre-wrap",
    lineHeight: "1.6",
    margin: 0,
  },
  notesSection: {},
  loading: {
    textAlign: "center",
    color: "#6b7280",
    padding: "48px 0",
    fontSize: "15px",
  },
};

export default function RecipeDetailView({
  recipeId,
  onBack,
  onEdit,
  onChooseIngredients,
  inShoppingList,
  onToggleShoppingList,
  sharedMeta,
  currentUserId,
}) {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subModal, setSubModal] = useState(null);
  const [obfuscate, setObfuscate] = useState(false);
  const [obfuscateSaving, setObfuscateSaving] = useState(false);

  const isHousehold = !!sharedMeta;
  const isOwner =
    isHousehold && currentUserId === sharedMeta?.shared_by?.user_id;

  useEffect(() => {
    let cancelled = false;
    const url = isHousehold
      ? `/households/${sharedMeta.household_id}/recipes`
      : "/recipes";

    apiFetch(url)
      .then((list) => {
        if (cancelled) return;
        const found = list.find((r) => r.id === recipeId);
        if (!found) onBack();
        else {
          setRecipe(found);
          if (isHousehold) setObfuscate(!!found.obfuscate_secrets);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) onBack();
      });
    return () => {
      cancelled = true;
    };
  }, [recipeId, onBack, isHousehold, sharedMeta]);

  async function handleObfuscateToggle(checked) {
    setObfuscate(checked);
    setObfuscateSaving(true);
    try {
      await apiFetch(
        `/households/${sharedMeta.household_id}/recipes/${recipeId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ obfuscate_secrets: checked }),
        }
      );
    } catch {
      setObfuscate(!checked);
    } finally {
      setObfuscateSaving(false);
    }
  }

  async function handleUnshare() {
    if (!window.confirm("Remove this recipe from the household?")) return;
    try {
      await apiFetch(
        `/households/${sharedMeta.household_id}/recipes/${recipeId}`,
        { method: "DELETE" }
      );
      onBack();
    } catch {
      // silently ignore; back anyway
      onBack();
    }
  }

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={onBack}>
            ‹ Back
          </button>
        </div>
        <p style={s.loading}>Loading…</p>
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
        {isHousehold && sharedMeta.shared_by && (
          <Avatar
            letter={sharedMeta.shared_by.avatar_letter}
            color={sharedMeta.shared_by.avatar_color}
            size={28}
          />
        )}
        <p style={s.headerTitle}>{recipe.title}</p>
        {!isHousehold || isOwner ? (
          <button style={s.editBtn} onClick={() => onEdit(recipe.id)}>
            Edit
          </button>
        ) : null}
      </div>

      <div style={s.body}>
        {isHousehold && sharedMeta.shared_by && (
          <div style={s.sharerRow}>
            <span style={s.sharerName}>{sharedMeta.shared_by.alias || ""}</span>
          </div>
        )}

        {ingredients.length > 0 && (
          <div>
            <p style={s.sectionLabel}>Ingredients</p>
            {ingredients.map((ing, i) => {
              const qtyStr = formatQty(ing.qty);
              const unitStr = ing.unit ? ` ${ing.unit}` : "";
              const hasSubs = ing.substitutions?.length > 0;
              return (
                <div key={i} style={s.ingredientRow}>
                  <div style={s.ingredientLeft}>
                    <span style={s.qty}>
                      {qtyStr}
                      {unitStr}
                    </span>
                    <span style={s.name}>{ing.name}</span>
                    {ing.optional && (
                      <span style={s.optionalBadge}>optional</span>
                    )}
                    {ing.secret && <span style={s.secretBadge}>secret</span>}
                  </div>
                  {hasSubs && (
                    <button
                      style={s.subChevron}
                      onClick={() => setSubModal(ing)}
                      aria-label="View substitutions"
                    >
                      ›
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {ingredients.length === 0 && (
          <p style={{ color: "#9ca3af", fontSize: "15px" }}>
            No ingredients added yet.
          </p>
        )}

        <div style={s.actions}>
          <button
            style={s.addListBtn(!!inShoppingList)}
            onClick={() => onToggleShoppingList?.(recipe)}
          >
            {inShoppingList ? "✓ In Shopping List" : "+ Add to Shopping List"}
          </button>
          <button
            style={s.chooseBtn}
            onClick={() => onChooseIngredients?.(recipe.id)}
          >
            Choose Ingredients
          </button>
        </div>

        {isHousehold && isOwner && (
          <div style={s.ownerSection}>
            <label style={s.obfuscateRow}>
              <input
                type="checkbox"
                style={s.checkbox}
                checked={obfuscate}
                disabled={obfuscateSaving}
                onChange={(e) => handleObfuscateToggle(e.target.checked)}
              />
              Hide secret ingredients from other members
            </label>
            <button style={s.unshareBtn} onClick={handleUnshare}>
              Remove from household
            </button>
          </div>
        )}

        {recipe.notes?.trim() && (
          <div style={s.notesSection}>
            <p style={s.sectionLabel}>Notes</p>
            <p style={s.notes}>{recipe.notes}</p>
          </div>
        )}
      </div>

      {subModal && (
        <SubstitutionsModal
          ingredient={subModal}
          onClose={() => setSubModal(null)}
        />
      )}
    </div>
  );
}
