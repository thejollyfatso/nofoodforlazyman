import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../utils/apiFetch";
import { parseIngredients, serializeIngredients } from "../utils/ingredientParser";
import { useToast, Toast } from "../components/Toast";

let _uid = 0;
function uid() {
  return String(++_uid);
}

function isRangeQty(qty) {
  return /to|-/.test(qty || "");
}

function ingredientToRow(ing) {
  const range = isRangeQty(ing.qty);
  return {
    _id: uid(),
    qty: range ? "" : (ing.qty || ""),
    unit: ing.unit || "",
    name: ing.name || "",
    optional: !!ing.optional,
    rangeQty: range ? (ing.qty || "") : "",
    subs: (ing.substitutions || []).map((s) => ({
      _id: uid(),
      qty: s.qty || "",
      unit: s.unit || "",
      name: s.name || "",
    })),
    expanded: !!ing.optional || !!(ing.substitutions?.length) || range,
  };
}

function rowToIngredient(row) {
  if (!row.name.trim()) return null;
  const ing = {
    qty: row.rangeQty.trim() || row.qty.trim(),
    unit: row.unit.trim(),
    name: row.name.trim(),
  };
  if (row.optional) ing.optional = true;
  const subs = row.subs
    .filter((s) => s.name.trim())
    .map((s) => ({ qty: s.qty.trim(), unit: s.unit.trim(), name: s.name.trim() }));
  if (subs.length) ing.substitutions = subs;
  return ing;
}

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
  },
  headerSeg: {
    display: "flex",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    overflow: "hidden",
    flexShrink: 0,
  },
  segBtn: (active) => ({
    padding: "6px 10px",
    fontSize: "13px",
    fontWeight: "600",
    border: "none",
    background: active ? "var(--color-primary)" : "transparent",
    color: active ? "#fff" : "#374151",
    cursor: "pointer",
    fontFamily: "inherit",
  }),
  body: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    flex: 1,
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    display: "block",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "11px 13px",
    fontSize: "16px",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "11px 13px",
    fontSize: "16px",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    minHeight: "80px",
    resize: "none",
    lineHeight: "1.5",
  },
  pasteArea: {
    width: "100%",
    padding: "11px 13px",
    fontSize: "16px",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    minHeight: "180px",
    resize: "none",
    lineHeight: "1.6",
  },
  ingRow: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
  },
  ingInput: (w) => ({
    padding: "9px 10px",
    fontSize: "16px",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
    width: w,
    flexShrink: 0,
    boxSizing: "border-box",
  }),
  ingNameInput: {
    flex: 1,
    padding: "9px 10px",
    fontSize: "16px",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    background: "#fff",
    outline: "none",
    fontFamily: "inherit",
    minWidth: 0,
    boxSizing: "border-box",
  },
  expandBtn: {
    background: "none",
    border: "none",
    padding: "9px 6px",
    fontSize: "16px",
    color: "#9ca3af",
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
  },
  removeBtn: {
    background: "none",
    border: "none",
    padding: "9px 4px",
    fontSize: "18px",
    color: "var(--color-danger)",
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
    lineHeight: 1,
  },
  detailsPanel: {
    background: "#f9f8f5",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "4px",
  },
  optionalRow: {
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
  detailLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "4px",
    display: "block",
  },
  subRow: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
  },
  addSubBtn: {
    background: "none",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  addIngBtn: {
    background: "none",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "12px",
    fontSize: "15px",
    fontWeight: "600",
    color: "var(--color-primary)",
    cursor: "pointer",
    fontFamily: "inherit",
    width: "100%",
  },
  footer: {
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    borderTop: "1px solid var(--color-border)",
    background: "#fff",
  },
  saveBtn: (disabled) => ({
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    background: disabled ? "#d1d5db" : "var(--color-primary)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-md)",
    cursor: disabled ? "default" : "pointer",
    fontFamily: "inherit",
    width: "100%",
  }),
  deleteBtn: {
    padding: "12px",
    fontSize: "15px",
    fontWeight: "600",
    background: "none",
    color: "var(--color-danger)",
    border: "1.5px solid var(--color-danger)",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontFamily: "inherit",
    width: "100%",
  },
};

export default function RecipeEditView({ recipeId, onBack, onSaved, onDeleted }) {
  const isNew = !recipeId;

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState("paste");
  const [pasteText, setPasteText] = useState("");
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [focusRowId, setFocusRowId] = useState(null);
  const nameRefs = useRef({});
  const { toast, showToast } = useToast();

  // Load existing recipe
  useEffect(() => {
    if (!recipeId) return;
    apiFetch("/recipes").then((list) => {
      const r = list.find((x) => x.id === recipeId);
      if (!r) return onBack();
      setTitle(r.title || "");
      setNotes(r.notes || "");
      setRows((r.ingredients || []).map(ingredientToRow));
    });
  }, [recipeId, onBack]);

  // Focus newly added row's name input
  useEffect(() => {
    if (focusRowId && nameRefs.current[focusRowId]) {
      nameRefs.current[focusRowId].focus();
      setFocusRowId(null);
    }
  }, [focusRowId, rows]);

  // ── Mode switching ──────────────────────────────────────────────────────

  function switchToManual() {
    const parsed = pasteText.trim()
      ? parseIngredients(pasteText).map(ingredientToRow)
      : [];
    const count = parsed.length;
    setRows(parsed);
    setMode("manual");
    if (pasteText.trim()) showToast(`Parsed ${count} ingredient${count === 1 ? "" : "s"}`);
  }

  function switchToPaste() {
    const text = serializeIngredients(
      rows.map(rowToIngredient).filter(Boolean)
    );
    setPasteText(text);
    setMode("paste");
  }

  function handleModeChange(next) {
    if (next === mode) return;
    if (next === "manual") switchToManual();
    else switchToPaste();
  }

  // ── Row helpers ─────────────────────────────────────────────────────────

  function updateRow(id, updates) {
    setRows((prev) =>
      prev.map((r) => (r._id === id ? { ...r, ...updates } : r))
    );
  }

  function addRow() {
    const newRow = {
      _id: uid(),
      qty: "",
      unit: "",
      name: "",
      optional: false,
      rangeQty: "",
      subs: [],
      expanded: false,
    };
    setRows((prev) => [...prev, newRow]);
    setFocusRowId(newRow._id);
  }

  function removeRow(id) {
    setRows((prev) => prev.filter((r) => r._id !== id));
  }

  function addSub(rowId) {
    setRows((prev) =>
      prev.map((r) =>
        r._id === rowId
          ? { ...r, subs: [...r.subs, { _id: uid(), qty: "", unit: "", name: "" }] }
          : r
      )
    );
  }

  function updateSub(rowId, subId, updates) {
    setRows((prev) =>
      prev.map((r) =>
        r._id === rowId
          ? { ...r, subs: r.subs.map((s) => (s._id === subId ? { ...s, ...updates } : s)) }
          : r
      )
    );
  }

  function removeSub(rowId, subId) {
    setRows((prev) =>
      prev.map((r) =>
        r._id === rowId ? { ...r, subs: r.subs.filter((s) => s._id !== subId) } : r
      )
    );
  }

  // ── Save / Delete ───────────────────────────────────────────────────────

  async function handleSave() {
    const t = title.trim();
    if (!t) {
      showToast("Title is required");
      return;
    }

    let ingredients;
    if (mode === "paste") {
      ingredients = parseIngredients(pasteText);
    } else {
      ingredients = rows.map(rowToIngredient).filter(Boolean);
    }

    setSaving(true);
    try {
      if (isNew) {
        await apiFetch("/recipes", {
          method: "POST",
          body: JSON.stringify({ title: t, notes, ingredients }),
        });
      } else {
        await apiFetch(`/recipes/${recipeId}`, {
          method: "PATCH",
          body: JSON.stringify({ title: t, notes, ingredients }),
        });
      }
      onSaved();
    } catch (err) {
      showToast(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this recipe?")) return;
    try {
      await apiFetch(`/recipes/${recipeId}`, { method: "DELETE" });
      onDeleted();
    } catch (err) {
      showToast(err.message || "Delete failed");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  function renderIngredientRow(row) {
    return (
      <div key={row._id} style={{ marginBottom: "6px" }}>
        <div style={s.ingRow}>
          <input
            style={s.ingInput("52px")}
            type="text"
            inputMode="decimal"
            placeholder="qty"
            value={row.qty}
            onChange={(e) => updateRow(row._id, { qty: e.target.value })}
          />
          <input
            style={s.ingInput("72px")}
            type="text"
            placeholder="unit"
            value={row.unit}
            onChange={(e) => updateRow(row._id, { unit: e.target.value })}
          />
          <input
            ref={(el) => { if (el) nameRefs.current[row._id] = el; }}
            style={s.ingNameInput}
            type="text"
            placeholder="ingredient name"
            value={row.name}
            onChange={(e) => updateRow(row._id, { name: e.target.value })}
          />
          <button
            style={s.expandBtn}
            onClick={() => updateRow(row._id, { expanded: !row.expanded })}
            title="More options"
          >
            ⋯
          </button>
          <button style={s.removeBtn} onClick={() => removeRow(row._id)}>
            ×
          </button>
        </div>

        {row.expanded && (
          <div style={s.detailsPanel}>
            <label style={s.optionalRow}>
              <input
                type="checkbox"
                style={s.checkbox}
                checked={row.optional}
                onChange={(e) => updateRow(row._id, { optional: e.target.checked })}
              />
              Optional
            </label>

            <div>
              <span style={s.detailLabel}>Range qty (e.g. 1-2)</span>
              <input
                style={{ ...s.ingInput("100%"), width: "100%", boxSizing: "border-box" }}
                type="text"
                placeholder="e.g. 1-2 or 1 to 2"
                value={row.rangeQty}
                onChange={(e) => updateRow(row._id, { rangeQty: e.target.value })}
              />
            </div>

            {row.subs.length > 0 && (
              <div>
                <span style={s.detailLabel}>Substitutions</span>
                {row.subs.map((sub) => (
                  <div key={sub._id} style={{ ...s.subRow, marginBottom: "6px" }}>
                    <input
                      style={s.ingInput("52px")}
                      type="text"
                      inputMode="decimal"
                      placeholder="qty"
                      value={sub.qty}
                      onChange={(e) => updateSub(row._id, sub._id, { qty: e.target.value })}
                    />
                    <input
                      style={s.ingInput("72px")}
                      type="text"
                      placeholder="unit"
                      value={sub.unit}
                      onChange={(e) => updateSub(row._id, sub._id, { unit: e.target.value })}
                    />
                    <input
                      style={s.ingNameInput}
                      type="text"
                      placeholder="substitute name"
                      value={sub.name}
                      onChange={(e) => updateSub(row._id, sub._id, { name: e.target.value })}
                    />
                    <button
                      style={s.removeBtn}
                      onClick={() => removeSub(row._id, sub._id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button style={s.addSubBtn} onClick={() => addSub(row._id)}>
              + Add Substitution
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>
          ‹ Back
        </button>
        <p style={s.headerTitle}>{isNew ? "New Recipe" : "Edit Recipe"}</p>
        <div style={s.headerSeg}>
          <button
            style={s.segBtn(mode === "paste")}
            onClick={() => handleModeChange("paste")}
          >
            Paste Text
          </button>
          <button
            style={s.segBtn(mode === "manual")}
            onClick={() => handleModeChange("manual")}
          >
            Manual
          </button>
        </div>
      </div>

      <div style={s.body}>
        <div>
          <label style={s.label}>Title</label>
          <input
            style={s.input}
            type="text"
            placeholder="Recipe name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus={isNew}
          />
        </div>

        <div>
          <label style={s.label}>Notes</label>
          <textarea
            style={s.textarea}
            placeholder="Optional notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div>
          <label style={s.label}>Ingredients</label>
          {mode === "paste" ? (
            <textarea
              style={s.pasteArea}
              placeholder={"Paste ingredient list here…\ne.g.\n1 cup flour\n2 eggs\n1/2 tsp salt"}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
          ) : (
            <>
              {rows.map(renderIngredientRow)}
              <button style={s.addIngBtn} onClick={addRow}>
                + Add Ingredient
              </button>
            </>
          )}
        </div>
      </div>

      <div style={s.footer}>
        <button style={s.saveBtn(saving)} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        {!isNew && (
          <button style={s.deleteBtn} onClick={handleDelete}>
            Delete Recipe
          </button>
        )}
      </div>

      <Toast message={toast} />
    </div>
  );
}
