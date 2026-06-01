import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../utils/apiFetch";
import { formatQty } from "../utils/formatQty";
import SubstitutionsModal from "../components/SubstitutionsModal";
import Avatar from "../components/Avatar";
import { subtractQty } from "../state/useShoppingList";

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: {
    minHeight: "100dvh",
    background: "var(--color-bg)",
    display: "flex",
    flexDirection: "column",
    paddingBottom: "108px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "14px 48px 14px 16px",
    background: "#fff",
    borderBottom: "1px solid var(--color-border)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: "17px",
    fontWeight: "700",
    margin: 0,
  },
  clearDoneBtn: {
    padding: "6px 10px",
    fontSize: "13px",
    fontWeight: "600",
    background: "none",
    color: "#6b7280",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
  },
  clearAllBtn: {
    padding: "6px 10px",
    fontSize: "13px",
    fontWeight: "600",
    background: "none",
    color: "var(--color-danger)",
    border: "1px solid var(--color-danger)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
  },
  addBar: {
    display: "flex",
    gap: "8px",
    padding: "10px 16px 6px",
    background: "#fff",
    borderBottom: "none",
  },
  addInput: {
    flex: 1,
    fontSize: "16px",
    padding: "10px 12px",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    fontFamily: "inherit",
    background: "#fff",
    outline: "none",
  },
  addBtn: {
    padding: "10px 16px",
    fontSize: "15px",
    fontWeight: "600",
    background: "var(--color-primary)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
  },
  addDividerBar: {
    padding: "4px 16px 10px",
    background: "#fff",
    borderBottom: "1px solid var(--color-border)",
  },
  addDividerBtn: {
    padding: "5px 10px",
    fontSize: "12px",
    fontWeight: "600",
    background: "none",
    color: "#6b7280",
    border: "1px dashed var(--color-border)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  listBody: {
    flex: 1,
  },
  doneDivider: {
    display: "flex",
    alignItems: "center",
    padding: "10px 20px",
    gap: "10px",
    color: "#9ca3af",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  doneDividerLine: {
    flex: 1,
    height: "1px",
    background: "var(--color-border)",
  },
  // User-created divider row
  sectionDividerRow: (dragOver, dragUp) => ({
    display: "flex",
    alignItems: "center",
    padding: "6px 8px 6px 16px",
    background: "#fff",
    borderTop:
      dragOver && dragUp ? "2px solid var(--color-primary)" : undefined,
    borderBottom:
      dragOver && !dragUp
        ? "2px solid var(--color-primary)"
        : "1px solid var(--color-border)",
    gap: "8px",
    cursor: "default",
  }),
  sectionDividerContent: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
  },
  sectionDividerLine: {
    flex: 1,
    height: "1px",
    background: "var(--color-border)",
  },
  sectionDividerLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
    cursor: "pointer",
    padding: "2px 0",
  },
  sectionDividerPlaceholder: {
    fontSize: "11px",
    color: "#d1d5db",
    fontStyle: "italic",
    cursor: "pointer",
    padding: "2px 0",
  },
  sectionDividerInput: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#6b7280",
    border: "1.5px solid var(--color-primary)",
    borderRadius: "4px",
    padding: "2px 6px",
    fontFamily: "inherit",
    outline: "none",
    width: "120px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  sectionDividerRemove: {
    background: "none",
    border: "none",
    padding: "4px 6px",
    fontSize: "16px",
    color: "#d1d5db",
    cursor: "pointer",
    fontFamily: "inherit",
    lineHeight: 1,
    flexShrink: 0,
  },
  dragHandle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 6px",
    cursor: "grab",
    flexShrink: 0,
    touchAction: "none",
    color: "#d1d5db",
  },
  itemRow: (checked, dragOver, dragging, dragUp) => ({
    display: "flex",
    alignItems: "flex-start",
    padding: "12px 8px 12px 16px",
    background: "#fff",
    borderTop:
      dragOver && dragUp ? "2px solid var(--color-primary)" : undefined,
    borderBottom:
      dragOver && !dragUp
        ? "2px solid var(--color-primary)"
        : "1px solid var(--color-border)",
    opacity: dragging ? 0.4 : checked ? 0.55 : 1,
    gap: "12px",
  }),
  checkbox: (checked) => ({
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    border: checked
      ? "2px solid var(--color-primary)"
      : "2px solid var(--color-border)",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: checked ? "var(--color-primary)" : "#fff",
    cursor: "pointer",
    marginTop: "1px",
  }),
  checkmark: {
    color: "#fff",
    fontSize: "13px",
    fontWeight: "700",
    lineHeight: 1,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemMain: {
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "4px 6px",
  },
  qty: (checked) => ({
    color: checked ? "var(--color-checked)" : "var(--color-primary)",
    fontWeight: "500",
    fontSize: "15px",
    flexShrink: 0,
    textDecoration: checked ? "line-through" : "none",
    cursor: "pointer",
  }),
  qtyInput: {
    fontSize: "16px",
    fontWeight: "500",
    color: "var(--color-primary)",
    border: "1.5px solid var(--color-primary)",
    borderRadius: "4px",
    padding: "0px 4px",
    width: "80px",
    fontFamily: "inherit",
    outline: "none",
  },
  itemName: (checked) => ({
    fontSize: "15px",
    color: checked ? "var(--color-checked)" : "#111",
    textDecoration: checked ? "line-through" : "none",
    wordBreak: "break-word",
  }),
  badge: {
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
  usingPill: {
    fontSize: "11px",
    fontWeight: "600",
    color: "var(--color-in-list)",
    background: "#d1fae5",
    borderRadius: "4px",
    padding: "1px 5px",
    flexShrink: 0,
  },
  pillsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
    marginTop: "4px",
  },
  recipePill: {
    fontSize: "11px",
    fontWeight: "500",
    color: "var(--color-primary)",
    background: "var(--color-primary-light)",
    borderRadius: "10px",
    padding: "2px 8px",
    flexShrink: 0,
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  checkedByLabel: {
    fontSize: "12px",
    color: "#9ca3af",
    marginTop: "3px",
  },
  assignedRow: {
    display: "flex",
    gap: "4px",
    marginTop: "4px",
    alignItems: "center",
  },
  subChevron: {
    background: "none",
    border: "none",
    padding: "4px 0 4px 8px",
    fontSize: "18px",
    color: "#9ca3af",
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
    alignSelf: "center",
  },
  emptyState: {
    textAlign: "center",
    color: "#9ca3af",
    padding: "60px 24px",
    fontSize: "15px",
    lineHeight: 1.6,
  },
  copyBar: {
    position: "fixed",
    bottom: "56px",
    left: 0,
    right: 0,
    display: "flex",
    gap: "10px",
    padding: "10px 16px",
    background: "#fff",
    borderTop: "1px solid var(--color-border)",
    zIndex: 50,
  },
  copyBtn: {
    flex: 1,
    padding: "11px",
    fontSize: "14px",
    fontWeight: "600",
    background: "#fff",
    color: "#374151",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  toast: (visible) => ({
    position: "fixed",
    bottom: "120px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#1f2937",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: "var(--radius-md)",
    fontSize: "14px",
    fontWeight: "500",
    zIndex: 600,
    opacity: visible ? 1 : 0,
    transition: "opacity 0.2s",
    pointerEvents: "none",
    whiteSpace: "nowrap",
  }),
  // Recipe removal prompt (bottom sheet)
  promptBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    zIndex: 500,
    display: "flex",
    alignItems: "flex-end",
  },
  promptSheet: {
    background: "#fff",
    borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
    width: "100%",
    padding: "20px 20px 32px",
  },
  promptTitle: {
    fontSize: "16px",
    fontWeight: "700",
    margin: "0 0 6px",
  },
  promptSubtitle: {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0 0 16px",
  },
  promptBtn: (danger) => ({
    width: "100%",
    padding: "13px",
    fontSize: "15px",
    fontWeight: "600",
    background: "#fff",
    color: danger ? "var(--color-danger)" : "#374151",
    border: "1.5px solid",
    borderColor: danger ? "var(--color-danger)" : "var(--color-border)",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontFamily: "inherit",
    marginBottom: "8px",
    textAlign: "left",
  }),
  promptCancelBtn: {
    width: "100%",
    padding: "13px",
    fontSize: "15px",
    fontWeight: "600",
    background: "#f3f4f6",
    color: "#374151",
    border: "none",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: "4px",
  },
};

// ── Drag handle SVG ───────────────────────────────────────────────────────────

function DragHandleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5" cy="4" r="1.5" />
      <circle cx="11" cy="4" r="1.5" />
      <circle cx="5" cy="8" r="1.5" />
      <circle cx="11" cy="8" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="11" cy="12" r="1.5" />
    </svg>
  );
}

// ── Toast helper ──────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState({ msg: "", visible: false });
  const timerRef = useRef(null);

  function showToast(msg, duration = 2000) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ msg, visible: true });
    timerRef.current = setTimeout(
      () => setToast({ msg: "", visible: false }),
      duration
    );
  }

  return { toast, showToast };
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ShoppingView({
  shopping,
  activeHousehold,
  shoppingContextType,
  currentUserId,
}) {
  const {
    items,
    loading,
    writeList,
    handleCheckItem,
    handleSubstitute,
    handleEditQty,
    handleClearDone,
    handleClearAll,
    handleAddManualItem,
    handleRemoveRecipe,
    handleAddDivider,
  } = shopping;

  const isHousehold = shoppingContextType === "household";

  // Household member list (for alias lookup on checked_by)
  const [members, setMembers] = useState([]);
  useEffect(() => {
    if (!isHousehold || !activeHousehold) return;
    apiFetch(`/households/${activeHousehold.id}`)
      .then((data) => setMembers(data.members || []))
      .catch(() => {});
    return () => setMembers([]);
  }, [isHousehold, activeHousehold]);

  // All recipes (for source pill titles)
  const [recipes, setRecipes] = useState([]);
  useEffect(() => {
    const path =
      isHousehold && activeHousehold
        ? `/households/${activeHousehold.id}/recipes`
        : "/recipes";
    apiFetch(path)
      .then((list) => setRecipes(list))
      .catch(() => {});
  }, [isHousehold, activeHousehold]);

  // UI state
  const [addInput, setAddInput] = useState("");
  const [subModalItem, setSubModalItem] = useState(null);
  const [editingQtyId, setEditingQtyId] = useState(null);
  const [editingQtyVal, setEditingQtyVal] = useState("");
  const [removePrompt, setRemovePrompt] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const { toast, showToast } = useToast();

  // Divider editing state
  const [editingDividerId, setEditingDividerId] = useState(null);
  const [editingDividerVal, setEditingDividerVal] = useState("");

  // Drag-and-drop state
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const dragStateRef = useRef(null); // { id, overTargetId }
  const draggingIdx = draggingId
    ? items.findIndex((i) => i.id === draggingId)
    : -1;
  const dragOverIdx = dragOverId
    ? items.findIndex((i) => i.id === dragOverId)
    : -1;
  const dragIndicatorAbove =
    draggingIdx !== -1 && dragOverIdx !== -1 && draggingIdx > dragOverIdx;

  function getMemberAlias(userId) {
    const m = members.find((m) => m.user_id === userId);
    return m?.alias || m?.email || "Someone";
  }

  function getRecipeTitle(recipeId) {
    const r = recipes.find((r) => r.id === recipeId);
    return r?.title || "recipe";
  }

  function formatItemQty(item) {
    if (!item.quantities.length) return "~";
    return item.quantities
      .map((q) => {
        const formatted = formatQty(q.qty);
        return q.unit ? `${formatted} ${q.unit}` : formatted;
      })
      .join(" + ");
  }

  async function handleAddItem() {
    const val = addInput.trim();
    if (!val) return;
    await handleAddManualItem(val);
    setAddInput("");
  }

  async function handleSubSelect(item, sub) {
    await handleSubstitute(item.id, sub.name);
    setSubModalItem(null);
    showToast(`Using: ${sub.name}`);
  }

  function startQtyEdit(item) {
    if (item.checked) return;
    setEditingQtyId(item.id);
    const raw = item.quantities
      .map((q) => (q.unit ? `${q.qty} ${q.unit}` : q.qty))
      .join(" + ");
    setEditingQtyVal(raw);
  }

  async function commitQtyEdit(itemId) {
    if (editingQtyVal.trim()) {
      await handleEditQty(itemId, editingQtyVal.trim());
    }
    setEditingQtyId(null);
    setEditingQtyVal("");
  }

  async function handleClearAllConfirm() {
    if (!window.confirm("Clear all items from the shopping list?")) return;
    await handleClearAll();
  }

  // Divider helpers
  function startDividerEdit(item) {
    setEditingDividerId(item.id);
    setEditingDividerVal(item.name || "");
  }

  async function commitDividerEdit(itemId) {
    const label = editingDividerVal.trim();
    const newItems = items.map((i) =>
      i.id === itemId
        ? { ...i, name: label, normalized_name: label.toLowerCase() }
        : i
    );
    setEditingDividerId(null);
    setEditingDividerVal("");
    await writeList(newItems);
  }

  function cancelDividerEdit() {
    setEditingDividerId(null);
    setEditingDividerVal("");
  }

  async function removeDivider(itemId) {
    await writeList(items.filter((i) => i.id !== itemId));
  }

  // Pointer-based drag-and-drop (works on iOS + desktop)
  function onHandlePointerDown(e, itemId) {
    e.preventDefault();
    dragStateRef.current = { id: itemId, overTargetId: null };
    setDraggingId(itemId);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onHandlePointerMove(e) {
    if (!dragStateRef.current) return;
    const { id: draggedId } = dragStateRef.current;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row = el?.closest("[data-item-id]");
    const targetId = row?.dataset?.itemId;
    const over = targetId && targetId !== draggedId ? targetId : null;
    dragStateRef.current.overTargetId = over;
    setDragOverId(over);
  }

  function onHandlePointerUp() {
    if (!dragStateRef.current) return;
    const { id: draggedId, overTargetId: targetId } = dragStateRef.current;
    dragStateRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
    if (targetId) executeReorder(draggedId, targetId);
  }

  function onHandlePointerCancel() {
    dragStateRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
  }

  function executeReorder(draggedId, targetId) {
    const uncheckedItems = items.filter((i) => !i.checked);
    const checkedItems = items.filter((i) => i.checked);
    const fromIdx = uncheckedItems.findIndex((i) => i.id === draggedId);
    const toIdx = uncheckedItems.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...uncheckedItems];
    const [removed] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, removed);
    const allItems = [...reordered, ...checkedItems].map((item, idx) => ({
      ...item,
      item_order: idx,
    }));
    writeList(allItems);
  }

  // Recipe removal prompt resolution
  function resolveRemovePrompt(choice) {
    if (!removePrompt) return;
    const { pendingItems, multiSourceItems, currentIndex } = removePrompt;
    const { item, recipeId, recipeQty, recipeUnit } =
      multiSourceItems[currentIndex];

    let resolvedItems = [...pendingItems];
    const idx = resolvedItems.findIndex((i) => i.id === item.id);
    if (idx === -1) {
      advancePrompt();
      return;
    }

    if (choice === "subtract") {
      const newQtys = subtractQty(
        resolvedItems[idx].quantities,
        recipeQty,
        recipeUnit
      );
      if (newQtys.length === 0) {
        resolvedItems.splice(idx, 1);
      } else {
        resolvedItems[idx] = { ...resolvedItems[idx], quantities: newQtys };
      }
    } else if (choice === "remove") {
      resolvedItems.splice(idx, 1);
    }
    // "keep" → leave as-is

    advancePrompt(resolvedItems);
  }

  function advancePrompt(updatedItems) {
    const { pendingItems, multiSourceItems, currentIndex, onWrite } =
      removePrompt || {};
    const itemsToUse = updatedItems ?? removePrompt?.pendingItems ?? [];
    const nextIndex = (currentIndex ?? 0) + 1;

    if (nextIndex >= (multiSourceItems?.length ?? 0)) {
      setRemovePrompt(null);
      onWrite?.(itemsToUse);
    } else {
      setRemovePrompt((prev) => ({
        ...prev,
        pendingItems: itemsToUse,
        currentIndex: nextIndex,
      }));
    }
  }

  function onNeedPrompt(multiSourceItems, newItems) {
    setRemovePrompt({
      pendingItems: newItems,
      multiSourceItems,
      currentIndex: 0,
      onWrite: writeList,
    });
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  function renderDivider(item) {
    const isEditing = editingDividerId === item.id;
    const isDragOver = dragOverId === item.id && draggingId !== item.id;
    const isDragging = draggingId === item.id;

    return (
      <div
        key={item.id}
        data-item-id={item.id}
        style={{
          ...s.sectionDividerRow(isDragOver, dragIndicatorAbove),
          opacity: isDragging ? 0.4 : 1,
          pointerEvents: isDragging ? "none" : undefined,
        }}
      >
        <div style={s.sectionDividerContent}>
          <div style={s.sectionDividerLine} />
          {isEditing ? (
            <input
              autoFocus
              style={s.sectionDividerInput}
              value={editingDividerVal}
              onChange={(e) => setEditingDividerVal(e.target.value)}
              onBlur={() => commitDividerEdit(item.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitDividerEdit(item.id);
                if (e.key === "Escape") cancelDividerEdit();
              }}
              placeholder="Section label"
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : item.name ? (
            <span
              style={s.sectionDividerLabel}
              onClick={() => startDividerEdit(item)}
            >
              {item.name}
            </span>
          ) : (
            <span
              style={s.sectionDividerPlaceholder}
              onClick={() => startDividerEdit(item)}
            >
              Add label
            </span>
          )}
          <div style={s.sectionDividerLine} />
        </div>

        <button
          style={s.sectionDividerRemove}
          onClick={() => removeDivider(item.id)}
          aria-label="Remove divider"
          onPointerDown={(e) => e.stopPropagation()}
        >
          ×
        </button>

        <div
          style={{
            ...s.dragHandle,
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
          onPointerDown={(e) => onHandlePointerDown(e, item.id)}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerCancel}
        >
          <DragHandleIcon />
        </div>
      </div>
    );
  }

  function renderItem(item) {
    const qtyStr = formatItemQty(item);
    const isEditing = editingQtyId === item.id;
    const isDragOver = dragOverId === item.id && draggingId !== item.id;
    const isDragging = draggingId === item.id;

    return (
      <div
        key={item.id}
        data-item-id={item.id}
        style={{
          ...s.itemRow(
            item.checked,
            isDragOver,
            isDragging,
            dragIndicatorAbove
          ),
          pointerEvents: isDragging ? "none" : undefined,
        }}
      >
        <div
          style={s.checkbox(item.checked)}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => handleCheckItem(item.id, !item.checked)}
        >
          {item.checked && <span style={s.checkmark}>✓</span>}
        </div>

        <div style={s.itemContent} onPointerDown={(e) => e.stopPropagation()}>
          <div style={s.itemMain}>
            {isEditing ? (
              <input
                autoFocus
                style={s.qtyInput}
                value={editingQtyVal}
                onChange={(e) => setEditingQtyVal(e.target.value)}
                onBlur={() => commitQtyEdit(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitQtyEdit(item.id);
                  if (e.key === "Escape") {
                    setEditingQtyId(null);
                    setEditingQtyVal("");
                  }
                }}
              />
            ) : qtyStr ? (
              <span
                style={s.qty(item.checked)}
                onClick={() => startQtyEdit(item)}
              >
                {qtyStr}
              </span>
            ) : null}

            <span style={s.itemName(item.checked)}>{item.name}</span>

            {item.optional && !item.substituted_with && (
              <span style={s.badge}>optional</span>
            )}
            {item.secret && <span style={s.secretBadge}>secret</span>}
            {item.substituted_with && (
              <span style={s.usingPill}>using: {item.substituted_with}</span>
            )}
          </div>

          {item.source_recipes.length > 0 && (
            <div style={s.pillsRow}>
              {item.source_recipes.map((rid) => {
                const recipe = recipes.find((r) => r.id === rid);
                return (
                  <button
                    key={rid}
                    style={s.recipePill}
                    onClick={() =>
                      setConfirmRemove({
                        recipeId: rid,
                        recipeTitle: recipe?.title || "recipe",
                        recipeIngredients: recipe?.ingredients || [],
                      })
                    }
                    aria-label={`Remove ${recipe?.title || "recipe"} from list`}
                  >
                    {recipe?.title || "recipe"}
                    <span style={{ opacity: 0.6, fontSize: "10px" }}>×</span>
                  </button>
                );
              })}
            </div>
          )}

          {isHousehold && item.checked && item.checked_by && (
            <p style={s.checkedByLabel}>
              Checked by {getMemberAlias(item.checked_by)}
            </p>
          )}

          {isHousehold && item.assigned_to.length > 0 && (
            <div style={s.assignedRow}>
              {item.assigned_to.map((uid) => {
                const m = members.find((m) => m.user_id === uid);
                return m ? (
                  <Avatar
                    key={uid}
                    letter={m.avatar_letter}
                    color={m.avatar_color}
                    size={20}
                  />
                ) : null;
              })}
            </div>
          )}
        </div>

        {item.substitutions.length > 0 && (
          <button
            style={s.subChevron}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setSubModalItem(item)}
            aria-label="View substitutions"
          >
            ›
          </button>
        )}

        <div
          style={{
            ...s.dragHandle,
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
          onPointerDown={(e) => onHandlePointerDown(e, item.id)}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerCancel}
        >
          <DragHandleIcon />
        </div>
      </div>
    );
  }

  const hasDoneItems = checked.length > 0;

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <p style={s.headerTitle}>Shopping</p>

        {hasDoneItems && (
          <button style={s.clearDoneBtn} onClick={handleClearDone}>
            Clear Done
          </button>
        )}
        {items.length > 0 && (
          <button style={s.clearAllBtn} onClick={handleClearAllConfirm}>
            Clear All
          </button>
        )}
      </div>

      {/* Manual add bar */}
      <div style={s.addBar}>
        <input
          style={s.addInput}
          value={addInput}
          placeholder="Add item (e.g. 2 cups flour)"
          onChange={(e) => setAddInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
        />
        <button style={s.addBtn} onClick={handleAddItem}>
          Add
        </button>
      </div>
      <div style={s.addDividerBar}>
        <button style={s.addDividerBtn} onClick={handleAddDivider}>
          + Add section divider
        </button>
      </div>

      {/* List */}
      <div style={s.listBody}>
        {loading && items.length === 0 && (
          <p
            style={{
              textAlign: "center",
              color: "#9ca3af",
              padding: "48px 20px",
              fontSize: "15px",
            }}
          >
            Loading…
          </p>
        )}

        {!loading && items.length === 0 && (
          <div style={s.emptyState}>
            <p>Your shopping list is empty.</p>
            <p style={{ fontSize: "13px", marginTop: "6px" }}>
              Add items above or add a recipe from the Recipes tab.
            </p>
          </div>
        )}

        {unchecked.map((item) =>
          item.item_type === "divider" ? renderDivider(item) : renderItem(item)
        )}

        {hasDoneItems && (
          <div style={s.doneDivider}>
            <span style={s.doneDividerLine} />
            <span>Done</span>
            <span style={s.doneDividerLine} />
          </div>
        )}

        {checked.map(renderItem)}
      </div>

      {/* Copy bar */}
      <div style={s.copyBar}>
        <button
          style={s.copyBtn}
          onClick={() => {
            const undone = items.filter(
              (i) => !i.checked && i.item_type !== "divider"
            );
            if (!undone.length) {
              showToast("Nothing to copy");
              return;
            }
            navigator.clipboard.writeText(undone.map((i) => i.name).join("\n"));
            showToast("Copied!");
          }}
        >
          Copy Names
        </button>
        <button
          style={s.copyBtn}
          onClick={() => {
            const undone = items.filter(
              (i) => !i.checked && i.item_type !== "divider"
            );
            if (!undone.length) {
              showToast("Nothing to copy");
              return;
            }
            const lines = undone.map((i) => {
              const qty = formatItemQty(i);
              return qty ? `${qty} ${i.name}` : i.name;
            });
            navigator.clipboard.writeText(lines.join("\n"));
            showToast("Copied!");
          }}
        >
          Copy with Qty
        </button>
      </div>

      {/* Substitutions modal */}
      {subModalItem && (
        <SubstitutionsModal
          ingredient={subModalItem}
          onClose={() => setSubModalItem(null)}
          interactive
          onSelectSubstitution={(sub) => handleSubSelect(subModalItem, sub)}
          selectedSubstitutionName={subModalItem.substituted_with}
        />
      )}

      {/* Recipe removal confirmation */}
      {confirmRemove && (
        <div style={s.promptBackdrop} onClick={() => setConfirmRemove(null)}>
          <div style={s.promptSheet} onClick={(e) => e.stopPropagation()}>
            <p style={s.promptTitle}>
              Remove &ldquo;{confirmRemove.recipeTitle}&rdquo;?
            </p>
            <p style={s.promptSubtitle}>
              This will remove all ingredients from this recipe from your list.
            </p>
            <button
              style={s.promptBtn(true)}
              onClick={() => {
                handleRemoveRecipe(
                  confirmRemove.recipeId,
                  confirmRemove.recipeIngredients,
                  onNeedPrompt
                );
                setConfirmRemove(null);
              }}
            >
              Remove from list
            </button>
            <button
              style={s.promptCancelBtn}
              onClick={() => setConfirmRemove(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Recipe removal prompt */}
      {removePrompt &&
        (() => {
          const { multiSourceItems, currentIndex } = removePrompt;
          const entry = multiSourceItems[currentIndex];
          return (
            <div style={s.promptBackdrop} onClick={() => setRemovePrompt(null)}>
              <div style={s.promptSheet} onClick={(e) => e.stopPropagation()}>
                <p style={s.promptTitle}>
                  &ldquo;{entry.item.name}&rdquo;{" "}
                  {entry.item.source_recipes.length > 1
                    ? "has multiple sources"
                    : "has a modified quantity"}
                </p>
                <p style={s.promptSubtitle}>
                  {entry.item.source_recipes.length > 1
                    ? "This item comes from more than one recipe. What should happen to it?"
                    : "You've added to this item beyond the recipe's amount. What should happen to it?"}
                </p>
                <button
                  style={s.promptBtn(false)}
                  onClick={() => resolveRemovePrompt("subtract")}
                >
                  Remove this recipe&rsquo;s qty contribution
                </button>
                <button
                  style={s.promptBtn(false)}
                  onClick={() => resolveRemovePrompt("keep")}
                >
                  Keep the current qty as-is
                </button>
                <button
                  style={s.promptBtn(true)}
                  onClick={() => resolveRemovePrompt("remove")}
                >
                  Remove this ingredient entirely
                </button>
                <button
                  style={s.promptCancelBtn}
                  onClick={() => setRemovePrompt(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        })()}

      {/* Toast */}
      <div style={s.toast(toast.visible)}>{toast.msg}</div>
    </div>
  );
}
