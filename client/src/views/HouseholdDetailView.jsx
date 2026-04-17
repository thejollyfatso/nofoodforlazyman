import { useEffect, useMemo, useState } from "react";
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
    background: "var(--color-bg)",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 20px",
  },
  backBtn: {
    background: "none",
    border: "none",
    padding: "4px 0",
    fontSize: "17px",
    color: "var(--color-primary)",
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
  },
  headerName: {
    fontSize: "20px",
    fontWeight: "700",
    margin: 0,
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  editNameBtn: {
    background: "none",
    border: "none",
    padding: "6px",
    fontSize: "18px",
    cursor: "pointer",
    color: "#9ca3af",
    flexShrink: 0,
  },
  editNameInput: {
    flex: 1,
    fontSize: "18px",
    fontWeight: "700",
    border: "1.5px solid var(--color-primary)",
    borderRadius: "var(--radius-sm)",
    padding: "4px 8px",
    fontFamily: "inherit",
    outline: "none",
  },
  body: {
    padding: "0 20px 32px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  section: {
    background: "#fff",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
  },
  sectionHeader: {
    padding: "12px 16px",
    borderBottom: "1px solid var(--color-border)",
    fontSize: "13px",
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  memberRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderBottom: "1px solid var(--color-border)",
  },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: {
    fontSize: "15px",
    fontWeight: "500",
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  memberEmail: {
    fontSize: "12px",
    color: "#9ca3af",
    margin: "2px 0 0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  roleBadge: (role) => ({
    fontSize: "11px",
    fontWeight: "600",
    padding: "2px 8px",
    borderRadius: "99px",
    background: role === "owner" ? "var(--color-primary-light)" : "#f3f4f6",
    color: role === "owner" ? "var(--color-primary-dark)" : "#6b7280",
    flexShrink: 0,
  }),
  memberActions: { display: "flex", gap: "8px", flexShrink: 0 },
  iconBtn: (danger) => ({
    background: "none",
    border: "none",
    padding: "6px 8px",
    fontSize: "15px",
    cursor: "pointer",
    color: danger ? "var(--color-danger)" : "#9ca3af",
    fontFamily: "inherit",
  }),
  // My profile / edit section
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
  colorRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "8px",
  },
  colorDot: (color, selected) => ({
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: color,
    border: selected ? "3px solid #1a1a1a" : "3px solid transparent",
    cursor: "pointer",
    flexShrink: 0,
  }),
  saveBtn: {
    marginTop: "12px",
    width: "100%",
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
  // Action buttons
  actionBtn: (danger) => ({
    width: "100%",
    padding: "14px",
    fontSize: "15px",
    fontWeight: "600",
    background: danger ? "#fff" : "#fff",
    color: danger ? "var(--color-danger)" : "#374151",
    border: `1.5px solid ${danger ? "var(--color-danger)" : "var(--color-border)"}`,
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "center",
  }),
  inviteBox: {
    background: "#f9fafb",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 12px",
    fontSize: "13px",
    wordBreak: "break-all",
    color: "#374151",
    marginTop: "8px",
  },
  copyBtn: {
    marginTop: "8px",
    width: "100%",
    padding: "10px",
    fontSize: "14px",
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
  sectionPad: { padding: "16px" },
  avatarRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
  },
};

function displayName(member) {
  return member.alias || member.email;
}

function avatarLetter(member) {
  if (member.avatar_letter) return member.avatar_letter;
  const name = member.alias || member.email || "?";
  return name[0].toUpperCase();
}

function decodeUserId() {
  try {
    const token = localStorage.getItem("mk_token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.sub ?? null;
    }
  } catch {
    // ignore
  }
  return null;
}

export default function HouseholdDetailView({
  householdId,
  onBack,
  activeHousehold,
  onActivate,
  onDeactivate,
}) {
  // Decode user id once — the token doesn't change while this view is mounted.
  const myUserId = useMemo(() => decodeUserId(), []);

  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit household name
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  // My profile edit
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileAlias, setProfileAlias] = useState("");
  const [profileColor, setProfileColor] = useState(AVATAR_COLORS[0]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);

  // Invite
  const [inviteToken, setInviteToken] = useState(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  // Confirm overlay state
  const [confirm, setConfirm] = useState(null); // { message, onConfirm }

  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    apiFetch(`/households/${householdId}`)
      .then((data) => {
        setHousehold(data);
        const me = data.members.find((m) => m.user_id === myUserId);
        if (me) {
          setProfileAlias(me.alias || "");
          setProfileColor(me.avatar_color || AVATAR_COLORS[0]);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [householdId, myUserId]);

  function myMember() {
    if (!household || !myUserId) return null;
    return household.members.find((m) => m.user_id === myUserId) || null;
  }

  async function handleSaveName(e) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    setSavingName(true);
    try {
      const updated = await apiFetch(`/households/${householdId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setHousehold(updated);
      setEditingName(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSavingName(false);
    }
  }

  function startEditName() {
    setNameInput(household.name);
    setEditingName(true);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    const letter = profileAlias.trim()
      ? profileAlias.trim()[0].toUpperCase()
      : "?";
    try {
      const updated = await apiFetch(`/households/${householdId}/members/me`, {
        method: "PATCH",
        body: JSON.stringify({
          alias: profileAlias.trim() || null,
          avatar_letter: letter,
          avatar_color: profileColor,
        }),
      });
      setHousehold(updated);
      setEditingProfile(false);
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleGenerateInvite() {
    setGeneratingInvite(true);
    setActionError(null);
    try {
      const data = await apiFetch(`/households/${householdId}/invite`, {
        method: "POST",
      });
      setInviteToken(data.token);
      setCopied(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setGeneratingInvite(false);
    }
  }

  function inviteUrl() {
    return `${window.location.origin}?join=${inviteToken}`;
  }

  function handleCopyInvite() {
    navigator.clipboard.writeText(inviteUrl()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleRemoveMember(userId) {
    setActionError(null);
    try {
      await apiFetch(`/households/${householdId}/members/${userId}`, {
        method: "DELETE",
      });
      setHousehold((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.user_id !== userId),
      }));
    } catch (err) {
      setActionError(err.message);
    }
    setConfirm(null);
  }

  async function handleTransfer(userId) {
    setActionError(null);
    try {
      const updated = await apiFetch(`/households/${householdId}/transfer`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      });
      setHousehold(updated);
    } catch (err) {
      setActionError(err.message);
    }
    setConfirm(null);
  }

  async function handleLeave() {
    setActionError(null);
    try {
      await apiFetch(`/households/${householdId}/leave`, { method: "POST" });
      if (activeHousehold?.id === householdId) onDeactivate();
      onBack();
    } catch (err) {
      setActionError(err.message);
    }
    setConfirm(null);
  }

  async function handleDelete() {
    setActionError(null);
    try {
      await apiFetch(`/households/${householdId}`, { method: "DELETE" });
      if (activeHousehold?.id === householdId) onDeactivate();
      onBack();
    } catch (err) {
      setActionError(err.message);
    }
    setConfirm(null);
  }

  function askConfirm(message, onConfirmFn) {
    setConfirm({ message, onConfirm: onConfirmFn });
  }

  if (loading) {
    return (
      <div
        style={{ ...s.page, alignItems: "center", justifyContent: "center" }}
      >
        <p style={{ color: "#6b7280" }}>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={onBack}>
            ‹ Back
          </button>
        </div>
        <div style={{ padding: "0 20px" }}>
          <div style={s.error}>{error}</div>
        </div>
      </div>
    );
  }

  const isOwner = household.my_role === "owner";
  const me = myMember();

  return (
    <div style={s.page}>
      {/* Confirm overlay */}
      {confirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 100,
            padding: "0 0 32px",
          }}
          onClick={() => setConfirm(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "var(--radius-lg)",
              padding: "24px 20px",
              width: "100%",
              maxWidth: "480px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ margin: 0, fontSize: "16px", fontWeight: "500" }}>
              {confirm.message}
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                style={{
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
                }}
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                style={{
                  flex: 1,
                  padding: "12px",
                  fontSize: "15px",
                  fontWeight: "600",
                  background: "var(--color-danger)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
                onClick={confirm.onConfirm}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>
          ‹ Back
        </button>
        {editingName ? (
          <form
            style={{
              display: "flex",
              flex: 1,
              gap: "8px",
              alignItems: "center",
            }}
            onSubmit={handleSaveName}
          >
            <input
              style={s.editNameInput}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              autoFocus
              required
            />
            <button
              type="submit"
              style={{
                ...s.backBtn,
                color: "var(--color-primary)",
                fontWeight: "600",
              }}
              disabled={savingName}
            >
              {savingName ? "…" : "Save"}
            </button>
            <button
              type="button"
              style={{ ...s.backBtn, color: "#9ca3af" }}
              onClick={() => setEditingName(false)}
            >
              ✕
            </button>
          </form>
        ) : (
          <>
            <h1 style={s.headerName}>{household.name}</h1>
            {isOwner && (
              <button
                style={s.editNameBtn}
                onClick={startEditName}
                title="Edit name"
              >
                ✎
              </button>
            )}
          </>
        )}
      </div>

      <div style={s.body}>
        {actionError && <div style={s.error}>{actionError}</div>}

        {/* Use / Stop using */}
        {activeHousehold?.id === householdId ? (
          <button
            style={{
              width: "100%",
              padding: "12px",
              background: "var(--color-primary-light)",
              border: "1.5px solid var(--color-primary)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-primary)",
              fontFamily: "inherit",
              fontWeight: 600,
              fontSize: "15px",
              cursor: "pointer",
              marginBottom: "4px",
            }}
            onClick={onDeactivate}
          >
            Stop using this household
          </button>
        ) : (
          <button
            style={{
              width: "100%",
              padding: "12px",
              background: "var(--color-primary)",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: "#fff",
              fontFamily: "inherit",
              fontWeight: 600,
              fontSize: "15px",
              cursor: "pointer",
              marginBottom: "4px",
            }}
            onClick={() =>
              onActivate({ id: householdId, name: household.name })
            }
          >
            Use this household
          </button>
        )}

        {/* Members list */}
        <div style={s.section}>
          <div style={s.sectionHeader}>Members</div>
          {household.members.map((member, i) => {
            const isMe = member.user_id === myUserId;
            const isLast = i === household.members.length - 1;
            return (
              <div
                key={member.user_id}
                style={{
                  ...s.memberRow,
                  borderBottom: isLast
                    ? "none"
                    : "1px solid var(--color-border)",
                }}
              >
                <Avatar
                  letter={avatarLetter(member)}
                  color={member.avatar_color || AVATAR_COLORS[0]}
                  size={40}
                />
                <div style={s.memberInfo}>
                  <p style={s.memberName}>
                    {displayName(member)}
                    {isMe ? " (you)" : ""}
                  </p>
                  {member.alias && <p style={s.memberEmail}>{member.email}</p>}
                </div>
                <span style={s.roleBadge(member.role)}>
                  {member.role === "owner" ? "Owner" : "Member"}
                </span>
                {isOwner && !isMe && (
                  <div style={s.memberActions}>
                    <button
                      style={s.iconBtn(false)}
                      title="Transfer ownership"
                      onClick={() =>
                        askConfirm(
                          `Transfer ownership to ${displayName(member)}?`,
                          () => handleTransfer(member.user_id)
                        )
                      }
                    >
                      ⇄
                    </button>
                    <button
                      style={s.iconBtn(true)}
                      title="Remove member"
                      onClick={() =>
                        askConfirm(
                          `Remove ${displayName(member)} from this household?`,
                          () => handleRemoveMember(member.user_id)
                        )
                      }
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* My profile */}
        <div style={s.section}>
          <div style={s.sectionHeader}>My profile in this household</div>
          <div style={s.sectionPad}>
            {!editingProfile ? (
              <div
                style={{ display: "flex", alignItems: "center", gap: "14px" }}
              >
                <Avatar
                  letter={me ? avatarLetter(me) : "?"}
                  color={me?.avatar_color || AVATAR_COLORS[0]}
                  size={48}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: "500", fontSize: "15px" }}>
                    {me?.alias || (
                      <span style={{ color: "#9ca3af" }}>No alias set</span>
                    )}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "12px",
                      color: "#9ca3af",
                    }}
                  >
                    Tap Edit to update your alias and avatar
                  </p>
                </div>
                <button
                  style={{
                    ...s.iconBtn(false),
                    color: "var(--color-primary)",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                  onClick={() => {
                    setProfileAlias(me?.alias || "");
                    setProfileColor(me?.avatar_color || AVATAR_COLORS[0]);
                    setEditingProfile(true);
                  }}
                >
                  Edit
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSaveProfile}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {profileError && <div style={s.error}>{profileError}</div>}
                <div>
                  <label style={s.label}>Alias</label>
                  <input
                    style={s.input}
                    type="text"
                    placeholder="Nickname or full name"
                    value={profileAlias}
                    onChange={(e) => setProfileAlias(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label style={s.label}>Avatar colour</label>
                  <div style={s.avatarRow}>
                    <Avatar
                      letter={
                        profileAlias.trim()
                          ? profileAlias.trim()[0].toUpperCase()
                          : "?"
                      }
                      color={profileColor}
                      size={40}
                    />
                    <div style={s.colorRow}>
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          style={s.colorDot(c, c === profileColor)}
                          onClick={() => setProfileColor(c)}
                          aria-label={`Avatar colour ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: "11px",
                      fontSize: "15px",
                      fontWeight: "600",
                      background: "#fff",
                      color: "#374151",
                      border: "1.5px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                    onClick={() => setEditingProfile(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ flex: 2, ...s.saveBtn, marginTop: 0 }}
                    disabled={savingProfile}
                  >
                    {savingProfile ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Owner actions */}
        {isOwner && (
          <div style={s.section}>
            <div style={s.sectionHeader}>Invite</div>
            <div style={s.sectionPad}>
              <button
                style={s.saveBtn}
                onClick={handleGenerateInvite}
                disabled={generatingInvite}
              >
                {generatingInvite ? "Generating…" : "Generate invite link"}
              </button>
              {inviteToken && (
                <>
                  <div style={s.inviteBox}>{inviteUrl()}</div>
                  <button style={s.copyBtn} onClick={handleCopyInvite}>
                    {copied ? "Copied!" : "Copy link"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Danger zone */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {!isOwner && (
            <button
              style={s.actionBtn(true)}
              onClick={() => askConfirm("Leave this household?", handleLeave)}
            >
              Leave household
            </button>
          )}
          {isOwner && (
            <button
              style={s.actionBtn(true)}
              onClick={() =>
                askConfirm(
                  "Delete this household? This cannot be undone.",
                  handleDelete
                )
              }
            >
              Delete household
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
