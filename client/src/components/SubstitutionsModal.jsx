import { useEffect } from "react";
import { formatQty } from "../utils/formatQty";

const s = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    zIndex: 500,
    display: "flex",
    alignItems: "flex-end",
  },
  sheet: {
    background: "#fff",
    borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
    width: "100%",
    maxHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    padding: "20px 20px 14px",
    borderBottom: "1px solid var(--color-border)",
    flexShrink: 0,
  },
  headerLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    margin: "0 0 4px",
  },
  headerName: {
    fontSize: "17px",
    fontWeight: "700",
    margin: 0,
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 0",
  },
  row: {
    padding: "12px 20px",
    fontSize: "15px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
  },
  rowInfo: (interactive) => ({
    display: "flex",
    alignItems: "baseline",
    gap: "6px",
    flex: interactive ? 1 : undefined,
  }),
  qty: {
    color: "var(--color-primary)",
    fontWeight: "500",
    flexShrink: 0,
  },
  name: {
    color: "#111",
  },
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
  }),
  checkmark: {
    color: "#fff",
    fontSize: "13px",
    fontWeight: "700",
  },
  footer: {
    padding: "14px 20px",
    borderTop: "1px solid var(--color-border)",
    flexShrink: 0,
  },
  closeBtn: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    background: "var(--color-primary)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontFamily: "inherit",
  },
};

export default function SubstitutionsModal({
  ingredient,
  onClose,
  interactive = false,
  onSelectSubstitution,
  selectedSubstitutionName = null,
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!ingredient) return null;

  const subs = ingredient.substitutions || [];

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <p style={s.headerLabel}>Substitutions</p>
          <p style={s.headerName}>{ingredient.name}</p>
        </div>
        <div style={s.list}>
          {subs.map((sub, i) => {
            const qtyStr = formatQty(sub.qty);
            const unitStr = sub.unit ? ` ${sub.unit}` : "";
            const isSelected = selectedSubstitutionName === sub.name;
            return (
              <div
                key={i}
                style={s.row}
                onClick={
                  interactive ? () => onSelectSubstitution?.(sub) : undefined
                }
              >
                {interactive && (
                  <div style={s.checkbox(isSelected)}>
                    {isSelected && <span style={s.checkmark}>✓</span>}
                  </div>
                )}
                <div style={s.rowInfo(interactive)}>
                  <span style={s.qty}>
                    {qtyStr}
                    {unitStr}
                  </span>
                  <span style={s.name}>{sub.name}</span>
                </div>
              </div>
            );
          })}
        </div>
        {!interactive && (
          <div style={s.footer}>
            <button style={s.closeBtn} onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
