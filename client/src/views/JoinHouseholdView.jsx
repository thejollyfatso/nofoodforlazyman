import { useState } from "react";
import { apiFetch } from "../utils/apiFetch";
import Avatar from "../components/Avatar";

const AVATAR_COLORS = [
  "#E8623A",
  "#6366F1",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#3B82F6",
  "#EF4444",
  "#14B8A6",
  "#F97316",
];

const s = {
  page: {
    minHeight: "100dvh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "var(--color-bg)",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    background: "#fff",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "28px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  heading: { fontSize: "22px", fontWeight: "700", margin: 0 },
  sub: { fontSize: "15px", color: "#6b7280", margin: "4px 0 0" },
  householdName: { color: "#1a1a1a", fontWeight: "600" },
  label: {
    fontSize: "13px",
    fontWeight: "500",
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
  avatarRow: { display: "flex", alignItems: "center", gap: "12px" },
  joinBtn: {
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
  cancelBtn: {
    width: "100%",
    padding: "12px",
    fontSize: "15px",
    fontWeight: "600",
    background: "#fff",
    color: "#374151",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
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
};

export default function JoinHouseholdView({
  token,
  householdPreview,
  onJoined,
  onCancel,
}) {
  const [alias, setAlias] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

  const householdName = householdPreview?.household_name ?? "a household";
  const avatarLetter = alias.trim() ? alias.trim()[0].toUpperCase() : "?";

  async function handleJoin(e) {
    e.preventDefault();
    setJoining(true);
    setError(null);
    try {
      const household = await apiFetch(`/households/join/${token}`, {
        method: "POST",
        body: JSON.stringify({
          alias: alias.trim() || null,
          avatar_letter: avatarLetter,
          avatar_color: avatarColor,
        }),
      });
      onJoined(household);
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div>
          <h1 style={s.heading}>You&apos;re invited!</h1>
          <p style={s.sub}>
            You&apos;ve been invited to join{" "}
            <span style={s.householdName}>{householdName}</span>.
          </p>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <form
          onSubmit={handleJoin}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div>
            <label style={s.label}>
              Your alias in this household (optional)
            </label>
            <input
              style={s.input}
              type="text"
              placeholder="Nickname or full name"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label style={s.label}>Your avatar</label>
            <div style={s.avatarRow}>
              <Avatar letter={avatarLetter} color={avatarColor} size={40} />
              <div style={s.colorRow}>
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    style={s.colorDot(c, c === avatarColor)}
                    onClick={() => setAvatarColor(c)}
                    aria-label={`Avatar colour ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <button type="submit" style={s.joinBtn} disabled={joining}>
            {joining ? "Joining…" : "Join household"}
          </button>
        </form>

        <button style={s.cancelBtn} onClick={onCancel}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
