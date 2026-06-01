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
  bookHeaderRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "14px",
  },
  bookTitle: {
    flex: 1,
    fontSize: "20px",
    fontWeight: "700",
    margin: 0,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  iconBtn: {
    background: "none",
    border: "none",
    padding: "6px",
    cursor: "pointer",
    color: "#6b7280",
    lineHeight: 0,
    flexShrink: 0,
  },
  removeFromBookBtn: {
    background: "none",
    border: "none",
    padding: "4px 8px",
    fontSize: "18px",
    color: "#9ca3af",
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
    lineHeight: 1,
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
    background: "#f0fdf4",
    border: "1.5px solid var(--color-in-list)",
    borderRadius: "var(--radius-md)",
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
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
  selectAllRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "2px",
  },
  selectAllBtn: {
    flex: 1,
    background: "none",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "inherit",
    color: "#374151",
  },
  pickerSectionLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    padding: "8px 0 4px",
  },
  // New/edit book modal
  inputLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "4px",
    display: "block",
  },
  textInput: {
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
  modalFooter: {
    padding: "12px 20px",
    borderTop: "1px solid var(--color-border)",
    display: "flex",
    gap: "8px",
  },
  saveBtn: {
    flex: 1,
    background: "var(--color-primary)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-md)",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  cancelBtn: {
    flex: 1,
    background: "#fff",
    color: "#374151",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  deleteBookBtn: {
    width: "100%",
    background: "none",
    color: "var(--color-danger)",
    border: "1.5px solid var(--color-danger)",
    borderRadius: "var(--radius-md)",
    padding: "11px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: "4px",
  },
};

const IconBook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H6V4h2v8l2.5-1.5L13 12V4h5v16z" />
  </svg>
);

const IconEdit = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
);

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

  // Books / Recipes toggle — session-persisted
  const [contentMode, setContentMode] = useState(
    () => sessionStorage.getItem("recipes_content_mode") || "recipes"
  );

  // Personal books state
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(false);

  // Household books state
  const [householdBooks, setHouseholdBooks] = useState([]);
  const [householdBooksLoading, setHouseholdBooksLoading] = useState(false);

  // Selected book (drill-in view)
  const [selectedBook, setSelectedBook] = useState(null);

  // Book form modal
  const [bookModal, setBookModal] = useState(null); // null | { mode: "new" | "edit", book? }
  const [bookName, setBookName] = useState("");
  const [bookDesc, setBookDesc] = useState("");
  const [bookSaving, setBookSaving] = useState(false);

  // Remove-from-book loading state
  const [removingFromBook, setRemovingFromBook] = useState(null);

  // Share picker state
  const [showSharePicker, setShowSharePicker] = useState(false);
  const [personalRecipes, setPersonalRecipes] = useState([]);
  const [personalBooks, setPersonalBooks] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [sharingId, setSharingId] = useState(null);
  const [unsharingId, setUnsharingId] = useState(null);
  const [sharedIds, setSharedIds] = useState(new Set());
  const [sharedBookIds, setSharedBookIds] = useState(new Set());
  const [sharingBookId, setSharingBookId] = useState(null);
  const [unsharingBookId, setUnsharingBookId] = useState(null);

  function switchContentMode(mode) {
    setContentMode(mode);
    sessionStorage.setItem("recipes_content_mode", mode);
    setSelectedBook(null);
    setQuery("");
  }

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

  function fetchBooks() {
    setBooksLoading(true);
    apiFetch("/recipe-books")
      .then(setBooks)
      .catch(() => {})
      .finally(() => setBooksLoading(false));
  }

  function fetchHouseholdBooks() {
    if (!activeHousehold) return;
    setHouseholdBooksLoading(true);
    apiFetch(`/households/${activeHousehold.id}/books`)
      .then((data) => {
        setHouseholdBooks(data);
        setSharedBookIds(new Set(data.map((b) => b.id)));
      })
      .catch(() => {})
      .finally(() => setHouseholdBooksLoading(false));
  }

  useEffect(() => {
    setQuery("");
    setSelectedBook(null);
    fetchRecipes();
    fetchBooks();
    if (activeHousehold) fetchHouseholdBooks();
    else setHouseholdBooks([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHousehold]);

  async function openSharePicker() {
    setShowSharePicker(true);
    setPickerLoading(true);
    try {
      const [recipeList, bookList] = await Promise.all([
        apiFetch("/recipes"),
        apiFetch("/recipe-books"),
      ]);
      setPersonalRecipes(recipeList);
      setPersonalBooks(bookList);
    } catch {
      setPersonalRecipes([]);
      setPersonalBooks([]);
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

  async function handleUnshare(recipe) {
    if (!sharedIds.has(recipe.id)) return;
    setUnsharingId(recipe.id);
    try {
      await apiFetch(`/households/${activeHousehold.id}/recipes/${recipe.id}`, {
        method: "DELETE",
      });
      setSharedIds((prev) => {
        const next = new Set(prev);
        next.delete(recipe.id);
        return next;
      });
      fetchRecipes();
    } catch {
      // ignore
    } finally {
      setUnsharingId(null);
    }
  }

  async function handleShareBook(book) {
    if (sharedBookIds.has(book.id)) return;
    setSharingBookId(book.id);
    try {
      await apiFetch(`/households/${activeHousehold.id}/books/${book.id}`, {
        method: "POST",
      });
      setSharedBookIds((prev) => new Set([...prev, book.id]));
      fetchHouseholdBooks();
    } catch {
      // ignore
    } finally {
      setSharingBookId(null);
    }
  }

  async function handleUnshareBook(book) {
    if (!sharedBookIds.has(book.id)) return;
    setUnsharingBookId(book.id);
    try {
      await apiFetch(`/households/${activeHousehold.id}/books/${book.id}`, {
        method: "DELETE",
      });
      setSharedBookIds((prev) => {
        const next = new Set(prev);
        next.delete(book.id);
        return next;
      });
      fetchHouseholdBooks();
    } catch {
      // ignore
    } finally {
      setUnsharingBookId(null);
    }
  }

  async function handleSelectAll() {
    const unshared = personalRecipes.filter((r) => !sharedIds.has(r.id));
    for (const r of unshared) await handleShare(r);
  }

  async function handleDeselectAll() {
    const shared = personalRecipes.filter((r) => sharedIds.has(r.id));
    for (const r of shared) await handleUnshare(r);
  }

  async function handleSelectAllBooks() {
    const unshared = personalBooks.filter((b) => !sharedBookIds.has(b.id));
    for (const b of unshared) await handleShareBook(b);
  }

  async function handleDeselectAllBooks() {
    const shared = personalBooks.filter((b) => sharedBookIds.has(b.id));
    for (const b of shared) await handleUnshareBook(b);
  }

  // Book management
  function openNewBookModal() {
    setBookName("");
    setBookDesc("");
    setBookModal({ mode: "new" });
  }

  function openEditBookModal(book) {
    setBookName(book.name);
    setBookDesc(book.description || "");
    setBookModal({ mode: "edit", book });
  }

  async function handleSaveBook() {
    const name = bookName.trim();
    if (!name) return;
    setBookSaving(true);
    try {
      if (bookModal.mode === "new") {
        await apiFetch("/recipe-books", {
          method: "POST",
          body: JSON.stringify({ name, description: bookDesc }),
        });
      } else {
        const updated = await apiFetch(`/recipe-books/${bookModal.book.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name, description: bookDesc }),
        });
        if (selectedBook?.id === bookModal.book.id) {
          setSelectedBook((prev) => ({
            ...prev,
            name: updated.name,
            description: updated.description,
          }));
        }
      }
      fetchBooks();
      setBookModal(null);
    } catch {
      // ignore
    } finally {
      setBookSaving(false);
    }
  }

  async function handleDeleteBook(book) {
    if (
      !window.confirm(
        `Delete "${book.name}"? Recipes in this book will not be deleted.`
      )
    )
      return;
    try {
      await apiFetch(`/recipe-books/${book.id}`, { method: "DELETE" });
      fetchBooks();
      if (selectedBook?.id === book.id) setSelectedBook(null);
      setBookModal(null);
    } catch {
      // ignore
    }
  }

  async function handleRemoveRecipeFromBook(recipeId) {
    if (!selectedBook) return;
    setRemovingFromBook(recipeId);
    try {
      await apiFetch(`/recipe-books/${selectedBook.id}/recipes/${recipeId}`, {
        method: "DELETE",
      });
      setSelectedBook((prev) => ({
        ...prev,
        recipes: (prev.recipes || []).filter((r) => r.id !== recipeId),
        recipe_ids: (prev.recipe_ids || []).filter((id) => id !== recipeId),
        recipe_count: Math.max(0, (prev.recipe_count || 1) - 1),
      }));
      fetchBooks();
    } catch {
      // ignore
    } finally {
      setRemovingFromBook(null);
    }
  }

  function openBook(book) {
    if (activeHousehold) {
      setSelectedBook(book);
      return;
    }
    apiFetch(`/recipe-books/${book.id}`)
      .then((data) => setSelectedBook(data))
      .catch(() => {});
  }

  function pluralIngredients(n) {
    return `${n} ingredient${n === 1 ? "" : "s"}`;
  }

  function pluralRecipes(n) {
    return `${n} recipe${n === 1 ? "" : "s"}`;
  }

  // ── Filter / search ──────────────────────────────────────────────────────────

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

  // ── Render helpers ───────────────────────────────────────────────────────────

  function RecipeCard({ recipe, sharedBy, showRemoveFromBook }) {
    const n = (recipe.ingredients || []).length;
    function handleClick() {
      if (activeHousehold && sharedBy) {
        onOpenHouseholdRecipe(recipe.id, {
          shared_by: sharedBy,
          obfuscate_secrets: recipe.obfuscate_secrets ?? false,
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
        {showRemoveFromBook ? (
          <button
            style={s.removeFromBookBtn}
            disabled={removingFromBook === recipe.id}
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveRecipeFromBook(recipe.id);
            }}
            aria-label="Remove from book"
          >
            ×
          </button>
        ) : (
          <span style={s.chevron}>›</span>
        )}
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
            <RecipeCard key={r.id} recipe={r} sharedBy={r.shared_by} />
          ))}
        </div>
      );
    }
    return sections;
  }

  function renderGroupedBooks(bookList) {
    const groups = new Map();
    for (const b of bookList) {
      const uid = b.shared_by?.user_id || "__personal";
      if (!groups.has(uid)) groups.set(uid, { member: b.shared_by, books: [] });
      groups.get(uid).books.push(b);
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
          {group.books.map((b) => (
            <BookCard key={b.id} book={b} sharedBy={b.shared_by} />
          ))}
        </div>
      );
    }
    return sections;
  }

  function BookCard({ book, sharedBy, showEdit }) {
    return (
      <div style={s.card} onClick={() => openBook(book)}>
        {sharedBy ? (
          <Avatar
            letter={sharedBy.avatar_letter}
            color={sharedBy.avatar_color}
            size={32}
          />
        ) : (
          <span style={{ color: "var(--color-primary)", flexShrink: 0 }}>
            <IconBook />
          </span>
        )}
        <div style={s.cardInfo}>
          <p style={s.cardTitle}>{book.name}</p>
          <p style={s.cardMeta}>{pluralRecipes(book.recipe_count ?? 0)}</p>
          {book.description ? (
            <p style={{ ...s.cardMeta, fontStyle: "italic" }}>
              {book.description}
            </p>
          ) : null}
        </div>
        {showEdit ? (
          <button
            style={s.iconBtn}
            onClick={(e) => {
              e.stopPropagation();
              openEditBookModal(book);
            }}
            aria-label="Edit book"
          >
            <IconEdit />
          </button>
        ) : null}
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
      return sorted.map((r) => (
        <RecipeCard key={r.id} recipe={r} sharedBy={r.shared_by} />
      ));
    }

    if (searchMode === "recipe") {
      const { sorted } = filtered;
      if (sorted.length === 0) {
        return <p style={s.empty}>{`No recipes match "${q}".`}</p>;
      }
      if (activeHousehold && groupView) return renderGrouped(sorted);
      return sorted.map((r) => (
        <RecipeCard key={r.id} recipe={r} sharedBy={r.shared_by} />
      ));
    }

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
              <RecipeCard key={r.id} recipe={r} sharedBy={r.shared_by} />
            ))}
          </>
        )}
        {matchAny.length > 0 && (
          <>
            <p style={s.sectionLabel}>Any</p>
            {matchAny.map((r) => (
              <RecipeCard key={r.id} recipe={r} sharedBy={r.shared_by} />
            ))}
          </>
        )}
      </>
    );
  }

  // ── Book detail view (inside a selected book) ────────────────────────────────

  function renderBookDetail() {
    if (!selectedBook) return null;
    const isHhBook = !!activeHousehold;
    const bookRecipes = selectedBook.recipes || [];
    const sharedBy = selectedBook.shared_by;

    const q = query.trim();
    let displayRecipes = bookRecipes;
    if (q) {
      const ql = q.toLowerCase();
      displayRecipes = bookRecipes.filter((r) =>
        r.title.toLowerCase().includes(ql)
      );
    }
    displayRecipes = [...displayRecipes].sort((a, b) =>
      a.title.localeCompare(b.title)
    );

    return (
      <div style={s.page}>
        <div style={s.header}>
          <div style={s.bookHeaderRow}>
            <button style={s.backBtn} onClick={() => setSelectedBook(null)}>
              ‹ Books
            </button>
            {sharedBy && (
              <Avatar
                letter={sharedBy.avatar_letter}
                color={sharedBy.avatar_color}
                size={28}
              />
            )}
            <p style={s.bookTitle}>{selectedBook.name}</p>
            {!isHhBook && (
              <button
                style={s.iconBtn}
                onClick={() => openEditBookModal(selectedBook)}
                aria-label="Edit book"
              >
                <IconEdit />
              </button>
            )}
          </div>
          <div style={s.searchRow}>
            <input
              style={s.searchInput}
              type="search"
              placeholder="Search recipes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div style={s.body}>
          {displayRecipes.length === 0 && !q && (
            <p style={s.empty}>
              {isHhBook
                ? "No recipes in this book."
                : "No recipes in this book yet. Add them from recipe detail view."}
            </p>
          )}
          {displayRecipes.length === 0 && q && (
            <p style={s.empty}>{`No recipes match "${q}".`}</p>
          )}
          {displayRecipes.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              sharedBy={isHhBook ? sharedBy : null}
              showRemoveFromBook={!isHhBook}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Books list view ──────────────────────────────────────────────────────────

  function renderBooksMode() {
    if (selectedBook) return renderBookDetail();

    if (activeHousehold) {
      // Household books mode
      const isLoading = householdBooksLoading;
      const list = householdBooks;
      return (
        <div style={s.page}>
          <div style={s.header}>
            <div style={s.titleRow}>
              <p style={s.title}>{activeHousehold.name}</p>
            </div>
            <div style={{ marginBottom: "8px" }}>
              <div style={s.segmented}>
                <button
                  style={s.segBtn(contentMode === "books")}
                  onClick={() => switchContentMode("books")}
                >
                  Books
                </button>
                <button
                  style={s.segBtn(contentMode === "recipes")}
                  onClick={() => switchContentMode("recipes")}
                >
                  Recipes
                </button>
              </div>
            </div>
          </div>
          <div style={s.body}>
            {!isLoading && (
              <button style={s.shareBtn} onClick={openSharePicker}>
                Share a Recipe or Book
              </button>
            )}
            <div style={s.segmented}>
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
            {isLoading && (
              <p
                style={{
                  color: "#6b7280",
                  textAlign: "center",
                  padding: "32px 0",
                }}
              >
                Loading…
              </p>
            )}
            {!isLoading && list.length === 0 && (
              <p style={s.empty}>
                No books shared yet. Tap &quot;Share a Recipe or Book&quot; to
                add one.
              </p>
            )}
            {!isLoading &&
              list.length > 0 &&
              (groupView
                ? renderGroupedBooks(list)
                : list.map((b) => (
                    <BookCard key={b.id} book={b} sharedBy={b.shared_by} />
                  )))}
          </div>
        </div>
      );
    }

    // Personal books mode
    return (
      <div style={s.page}>
        <div style={s.header}>
          <div style={s.titleRow}>
            <p style={s.title}>Recipes</p>
          </div>
          <div style={{ marginBottom: "8px" }}>
            <div style={s.segmented}>
              <button
                style={s.segBtn(contentMode === "books")}
                onClick={() => switchContentMode("books")}
              >
                Books
              </button>
              <button
                style={s.segBtn(contentMode === "recipes")}
                onClick={() => switchContentMode("recipes")}
              >
                Recipes
              </button>
            </div>
          </div>
        </div>
        <div style={s.body}>
          {!booksLoading && (
            <button style={s.addBtn} onClick={openNewBookModal}>
              + New Book
            </button>
          )}
          {booksLoading && (
            <p
              style={{
                color: "#6b7280",
                textAlign: "center",
                padding: "32px 0",
              }}
            >
              Loading…
            </p>
          )}
          {!booksLoading && books.length === 0 && (
            <p style={s.empty}>No books yet. Tap + to create one.</p>
          )}
          {!booksLoading &&
            books.map((b) => (
              <BookCard key={b.id} book={b} sharedBy={null} showEdit />
            ))}
        </div>
      </div>
    );
  }

  // ── Main recipes view ────────────────────────────────────────────────────────

  const title = activeHousehold ? activeHousehold.name : "Recipes";

  if (contentMode === "books") return renderBooksMode();

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.titleRow}>
          <p style={s.title}>{title}</p>
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
        <div style={{ marginBottom: "8px" }}>
          <div style={s.segmented}>
            <button
              style={s.segBtn(contentMode === "books")}
              onClick={() => switchContentMode("books")}
            >
              Books
            </button>
            <button
              style={s.segBtn(contentMode === "recipes")}
              onClick={() => switchContentMode("recipes")}
            >
              Recipes
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
                Share a Recipe or Book
              </button>
            )}
          </>
        )}
        {activeHousehold && (
          <div style={s.segmented}>
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
        {renderList()}
      </div>

      {/* Share picker modal */}
      {showSharePicker && (
        <div style={s.modalBackdrop} onClick={() => setShowSharePicker(false)}>
          <div style={s.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <p style={s.modalTitle}>Share to Household</p>
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
              {!pickerLoading && (
                <>
                  {/* Recipes section */}
                  <p style={s.pickerSectionLabel}>Recipes</p>
                  {personalRecipes.length > 0 && (
                    <div style={s.selectAllRow}>
                      <button style={s.selectAllBtn} onClick={handleSelectAll}>
                        Select All
                      </button>
                      <button
                        style={{
                          ...s.selectAllBtn,
                          color: "var(--color-danger)",
                        }}
                        onClick={handleDeselectAll}
                      >
                        Deselect All
                      </button>
                    </div>
                  )}
                  {personalRecipes.length === 0 && (
                    <p style={{ color: "#6b7280", fontSize: "14px" }}>
                      No personal recipes yet.
                    </p>
                  )}
                  {[...personalRecipes]
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
                          onClick={() =>
                            alreadyShared ? handleUnshare(r) : handleShare(r)
                          }
                        >
                          <p style={s.pickerTitle}>{r.title}</p>
                          {alreadyShared && unsharingId !== r.id && (
                            <span style={s.sharedBadge}>Shared ×</span>
                          )}
                          {isSharing && (
                            <span
                              style={{ fontSize: "13px", color: "#6b7280" }}
                            >
                              Sharing…
                            </span>
                          )}
                          {unsharingId === r.id && (
                            <span
                              style={{ fontSize: "13px", color: "#6b7280" }}
                            >
                              Removing…
                            </span>
                          )}
                        </div>
                      );
                    })}

                  {/* Books section */}
                  <p style={{ ...s.pickerSectionLabel, marginTop: "8px" }}>
                    Books
                  </p>
                  {personalBooks.length > 0 && (
                    <div style={s.selectAllRow}>
                      <button
                        style={s.selectAllBtn}
                        onClick={handleSelectAllBooks}
                      >
                        Select All
                      </button>
                      <button
                        style={{
                          ...s.selectAllBtn,
                          color: "var(--color-danger)",
                        }}
                        onClick={handleDeselectAllBooks}
                      >
                        Deselect All
                      </button>
                    </div>
                  )}
                  {personalBooks.length === 0 && (
                    <p style={{ color: "#6b7280", fontSize: "14px" }}>
                      No books yet.
                    </p>
                  )}
                  {[...personalBooks]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((b) => {
                      const alreadyShared = sharedBookIds.has(b.id);
                      const isSharingBook = sharingBookId === b.id;
                      return (
                        <div
                          key={b.id}
                          style={
                            alreadyShared ? s.pickerCardShared : s.pickerCard
                          }
                          onClick={() =>
                            alreadyShared
                              ? handleUnshareBook(b)
                              : handleShareBook(b)
                          }
                        >
                          <span
                            style={{
                              color: alreadyShared
                                ? "var(--color-in-list)"
                                : "var(--color-primary)",
                              flexShrink: 0,
                            }}
                          >
                            <IconBook />
                          </span>
                          <p style={s.pickerTitle}>{b.name}</p>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#9ca3af",
                              flexShrink: 0,
                            }}
                          >
                            {pluralRecipes(b.recipe_count ?? 0)}
                          </span>
                          {alreadyShared && unsharingBookId !== b.id && (
                            <span style={s.sharedBadge}>Shared ×</span>
                          )}
                          {isSharingBook && (
                            <span
                              style={{ fontSize: "13px", color: "#6b7280" }}
                            >
                              Sharing…
                            </span>
                          )}
                          {unsharingBookId === b.id && (
                            <span
                              style={{ fontSize: "13px", color: "#6b7280" }}
                            >
                              Removing…
                            </span>
                          )}
                        </div>
                      );
                    })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New/edit book modal */}
      {bookModal && (
        <div style={s.modalBackdrop} onClick={() => setBookModal(null)}>
          <div style={s.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <p style={s.modalTitle}>
                {bookModal.mode === "new" ? "New Book" : "Edit Book"}
              </p>
              <button style={s.modalClose} onClick={() => setBookModal(null)}>
                ×
              </button>
            </div>
            <div style={s.modalBody}>
              <div>
                <label style={s.inputLabel}>Name</label>
                <input
                  style={s.textInput}
                  type="text"
                  placeholder="Book name"
                  value={bookName}
                  onChange={(e) => setBookName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label style={s.inputLabel}>Description (optional)</label>
                <input
                  style={s.textInput}
                  type="text"
                  placeholder="e.g. Weeknight dinners"
                  value={bookDesc}
                  onChange={(e) => setBookDesc(e.target.value)}
                />
              </div>
              {bookModal.mode === "edit" && (
                <button
                  style={s.deleteBookBtn}
                  onClick={() => handleDeleteBook(bookModal.book)}
                >
                  Delete Book
                </button>
              )}
            </div>
            <div style={s.modalFooter}>
              <button style={s.cancelBtn} onClick={() => setBookModal(null)}>
                Cancel
              </button>
              <button
                style={s.saveBtn}
                disabled={bookSaving || !bookName.trim()}
                onClick={handleSaveBook}
              >
                {bookSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
