import { useEffect, useState } from "react";
import { apiFetch } from "../utils/apiFetch";
import Avatar from "../components/Avatar";

const AVATAR_COLORS = [
  "#E8623A", "#6366F1", "#10B981", "#F59E0B", "#EC4899",
  "#8B5CF6", "#3B82F6", "#EF4444", "#14B8A6", "#F97316",
];

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
    justifyContent: "space-between",
    padding: "20px 20px 0",
  },
  title: { fontSize: "22px", fontWeight: "700", margin: 0 },
  signOut: {
    background: "none",
    border: "none",
    padding: "8px 0",
    fontSize: "14px",
    color: "var(--color-primary)",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  body: { padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" },
  card: {
    background: "#fff",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    cursor: "pointer",
  },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: { fontSize: "17px", fontWeight: "600", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cardMeta: { fontSize: "13px", color: "#6b7280", margin: "2px 0 0" },
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
    marginTop: "4px",
  },
  // Create form
  formCard: {
    background: "#fff",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  formTitle: { fontSize: "16px", fontWeight: "600", margin: 0 },
  label: { fontSize: "13px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "6px" },
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
  colorRow: { display: "flex", gap: "10px", flexWrap: "wrap" },
  colorDot: (color, selected) => ({
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: color,
    border: selected ? "3px solid #1a1a1a" : "3px solid transparent",
    cursor: "pointer",
    flexShrink: 0,
  }),
  formActions: { display: "flex", gap: "10px" },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    fontSize: "15px",
    fontWeight: "600",
    background: "#fff",
    color: "#374151",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  submitBtn: {
    flex: 2,
    padding: "12px",
    fontSize: "15px",
    fontWeight: "600",
    background: "var(--color-primary)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  error: {
    fontSize: "14px",
    color: "var(--color-danger)",
    background: "#fef2f2",
    borderRadius: "var(--radius-sm)",
    padding: "10px 14px",
  },
  empty: { textAlign: "center", color: "#6b7280", padding: "40px 0 20px", fontSize: "15px" },
  chevron: { color: "#9ca3af", fontSize: "20px", flexShrink: 0 },
  avatarPreview: { display: "flex", alignItems: "center", gap: "12px" },
};

export default function HouseholdsView({ onOpenHousehold, onLogout }) {
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [householdName, setHouseholdName] = useState("");
  const [alias, setAlias] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    apiFetch("/households")
      .then(setHouseholds)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function avatarLetter(aliasStr) {
    const trimmed = (aliasStr || "").trim();
    return trimmed ? trimmed[0].toUpperCase() : "?";
  }

  async function handleCreate(e) {
    e.preventDefault();
    const name = householdName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError(null);
    try {
      const household = await apiFetch("/households", {
        method: "POST",
        body: JSON.stringify({
          name,
          alias: alias.trim() || null,
          avatar_letter: avatarLetter(alias),
          avatar_color: avatarColor,
        }),
      });
      setHouseholds((prev) => [household, ...prev]);
      setShowCreate(false);
      resetForm();
      onOpenHousehold(household.id);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setHouseholdName("");
    setAlias("");
    setAvatarColor(AVATAR_COLORS[0]);
    setCreateError(null);
  }

  function handleCancelCreate() {
    setShowCreate(false);
    resetForm();
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Households</h1>
        <button style={s.signOut} onClick={onLogout}>Sign out</button>
      </div>

      <div style={s.body}>
        {error && <div style={s.error}>{error}</div>}

        {!loading && !showCreate && (
          <button style={s.addBtn} onClick={() => setShowCreate(true)}>
            + New household
          </button>
        )}

        {showCreate && (
          <form style={s.formCard} onSubmit={handleCreate}>
            <p style={s.formTitle}>Create household</p>

            {createError && <div style={s.error}>{createError}</div>}

            <div>
              <label style={s.label}>Household name</label>
              <input
                style={s.input}
                type="text"
                placeholder="e.g. The DeLeon Family"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div>
              <label style={s.label}>Your alias in this household (optional)</label>
              <input
                style={s.input}
                type="text"
                placeholder="Nickname or full name"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
              />
            </div>

            <div>
              <label style={s.label}>Your avatar</label>
              <div style={s.avatarPreview}>
                <Avatar letter={avatarLetter(alias)} color={avatarColor} size={40} />
                <div style={s.colorRow}>
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      style={s.colorDot(c, c === avatarColor)}
                      onClick={() => setAvatarColor(c)}
                      aria-label={`Avatar color ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div style={s.formActions}>
              <button type="button" style={s.cancelBtn} onClick={handleCancelCreate}>
                Cancel
              </button>
              <button type="submit" style={s.submitBtn} disabled={creating}>
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        )}

        {loading && (
          <p style={{ color: "#6b7280", textAlign: "center", padding: "32px 0" }}>
            Loading…
          </p>
        )}

        {!loading && households.length === 0 && !showCreate && (
          <p style={s.empty}>No households yet. Create one to get started.</p>
        )}

        {households.map((h) => (
          <div key={h.id} style={s.card} onClick={() => onOpenHousehold(h.id)}>
            <Avatar
              letter={h.avatar_letter || avatarLetter(h.alias)}
              color={h.avatar_color}
              size={44}
            />
            <div style={s.cardInfo}>
              <p style={s.cardName}>{h.name}</p>
              <p style={s.cardMeta}>
                {h.member_count} {h.member_count === 1 ? "member" : "members"} ·{" "}
                {h.role === "owner" ? "Owner" : "Member"}
              </p>
            </div>
            <span style={s.chevron}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
