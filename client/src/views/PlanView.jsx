import { useEffect, useState } from "react";
import { apiFetch } from "../utils/apiFetch";
import { formatQty } from "../utils/formatQty";
import { removeRecipeFromList, subtractQty } from "../state/useShoppingList";
import Avatar from "../components/Avatar";

// ── Styles ─────────────────────────────────────────────────────────────────────

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
    justifyContent: "space-between",
    padding: "14px 16px 14px 16px",
    background: "#fff",
    borderBottom: "1px solid var(--color-border)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: "17px",
    fontWeight: "700",
    margin: 0,
  },
  calBtn: {
    padding: "6px 12px",
    fontSize: "13px",
    fontWeight: "600",
    background: "none",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontFamily: "inherit",
    color: "#374151",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  section: {
    padding: "16px 16px 8px",
  },
  sectionLabel: {
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#9ca3af",
    margin: "0 0 10px",
  },
  binScroll: {
    display: "flex",
    gap: "10px",
    overflowX: "auto",
    paddingBottom: "4px",
    WebkitOverflowScrolling: "touch",
  },
  binCard: {
    flexShrink: 0,
    background: "#fff",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "12px 14px",
    cursor: "pointer",
    minWidth: "140px",
    maxWidth: "180px",
  },
  binCardTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#111",
    margin: "0 0 4px",
    wordBreak: "break-word",
  },
  binCardExpiry: {
    fontSize: "11px",
    color: "#9ca3af",
    margin: 0,
  },
  emptyBin: {
    fontSize: "14px",
    color: "#9ca3af",
    fontStyle: "italic",
  },
  weekGrid: {
    padding: "0 16px",
  },
  dayRow: {
    borderBottom: "1px solid var(--color-border)",
    padding: "12px 0",
  },
  dayHeader: {
    display: "flex",
    alignItems: "baseline",
    gap: "6px",
    marginBottom: "6px",
  },
  dayName: (isToday) => ({
    fontSize: "12px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: isToday ? "var(--color-primary)" : "#6b7280",
  }),
  dayDate: (isToday) => ({
    fontSize: "13px",
    fontWeight: isToday ? "700" : "400",
    color: isToday ? "var(--color-primary)" : "#374151",
  }),
  mealCard: {
    background: "#fff",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "8px 12px",
    marginBottom: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mealCardLeft: {
    flex: 1,
    minWidth: 0,
  },
  mealCardName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#111",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  mealCardRecipes: {
    fontSize: "12px",
    color: "#6b7280",
    margin: "2px 0 0",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  mealCardChevron: {
    color: "#9ca3af",
    fontSize: "18px",
    marginLeft: "8px",
    flexShrink: 0,
  },
  emptyDay: {
    fontSize: "13px",
    color: "#d1d5db",
    fontStyle: "italic",
  },
  // ── Overlay / modal ─────────────────────────────────────────────────────────
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    zIndex: 200,
    display: "flex",
    alignItems: "flex-end",
  },
  sheet: {
    background: "#fff",
    borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
    width: "100%",
    maxHeight: "92dvh",
    overflowY: "auto",
    padding: "20px 20px 36px",
  },
  sheetHandle: {
    width: "36px",
    height: "4px",
    background: "#e5e0d8",
    borderRadius: "2px",
    margin: "0 auto 16px",
  },
  sheetTitle: {
    fontSize: "17px",
    fontWeight: "700",
    margin: "0 0 16px",
  },
  fieldLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: "0 0 5px",
  },
  textInput: {
    width: "100%",
    fontSize: "16px",
    padding: "10px 12px",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    fontFamily: "inherit",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: "14px",
  },
  dateInput: {
    width: "100%",
    fontSize: "16px",
    padding: "10px 12px",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    fontFamily: "inherit",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: "14px",
  },
  recipeBlock: {
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    marginBottom: "10px",
    overflow: "hidden",
  },
  recipeBlockHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    background: "#f9fafb",
    borderBottom: "1px solid var(--color-border)",
  },
  recipeBlockName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#111",
  },
  removeRecipeBtn: {
    background: "none",
    border: "none",
    color: "#9ca3af",
    fontSize: "16px",
    cursor: "pointer",
    padding: "2px 4px",
    lineHeight: 1,
    fontFamily: "inherit",
  },
  shoppingChoiceRow: {
    display: "flex",
    gap: "6px",
    padding: "10px 12px",
  },
  choicePill: (active) => ({
    flex: 1,
    padding: "7px 4px",
    fontSize: "12px",
    fontWeight: "600",
    background: active ? "var(--color-primary)" : "#f3f4f6",
    color: active ? "#fff" : "#374151",
    border: "none",
    borderRadius: "20px",
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "center",
  }),
  addFromBinBtn: {
    width: "100%",
    padding: "10px",
    fontSize: "14px",
    fontWeight: "600",
    background: "#f3f4f6",
    color: "#374151",
    border: "1.5px dashed var(--color-border)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontFamily: "inherit",
    marginBottom: "14px",
  },
  membersRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "14px",
  },
  memberChip: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px 6px 6px",
    border: `1.5px solid ${active ? "var(--color-primary)" : "var(--color-border)"}`,
    borderRadius: "20px",
    background: active ? "var(--color-primary-light)" : "#fff",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: active ? "600" : "400",
    color: active ? "var(--color-primary)" : "#374151",
    fontFamily: "inherit",
  }),
  persistentRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "6px",
  },
  persistentLabel: {
    fontSize: "14px",
    color: "#374151",
    flex: 1,
  },
  persistentHelper: {
    fontSize: "12px",
    color: "#9ca3af",
    margin: "0 0 16px",
    lineHeight: 1.4,
  },
  toggle: (active) => ({
    width: "42px",
    height: "24px",
    borderRadius: "12px",
    background: active ? "var(--color-primary)" : "#d1d5db",
    border: "none",
    cursor: "pointer",
    position: "relative",
    flexShrink: 0,
    padding: 0,
    transition: "background 0.15s",
  }),
  toggleThumb: (active) => ({
    position: "absolute",
    top: "3px",
    left: active ? "21px" : "3px",
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    background: "#fff",
    transition: "left 0.15s",
  }),
  confirmBtn: (enabled) => ({
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    background: enabled ? "var(--color-primary)" : "#d1d5db",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-md)",
    cursor: enabled ? "pointer" : "default",
    fontFamily: "inherit",
    marginTop: "8px",
  }),
  cancelBtn: {
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
    marginTop: "8px",
  },
  dangerBtn: {
    width: "100%",
    padding: "13px",
    fontSize: "15px",
    fontWeight: "600",
    background: "#fff",
    color: "var(--color-danger)",
    border: "1.5px solid var(--color-danger)",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: "8px",
  },
  divider: {
    height: "1px",
    background: "var(--color-border)",
    margin: "16px 0",
  },
  // ── Ingredient select overlay ────────────────────────────────────────────────
  ingPage: {
    position: "fixed",
    inset: 0,
    background: "var(--color-bg)",
    zIndex: 300,
    display: "flex",
    flexDirection: "column",
  },
  ingHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 20px",
    borderBottom: "1px solid var(--color-border)",
    background: "#fff",
    position: "sticky",
    top: 0,
  },
  ingBackBtn: {
    background: "none",
    border: "none",
    padding: "4px 0",
    fontSize: "16px",
    color: "var(--color-primary)",
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
  },
  ingHeaderInfo: {
    flex: 1,
    minWidth: 0,
  },
  ingHeaderLabel: {
    fontSize: "12px",
    color: "#6b7280",
    margin: "0 0 2px",
  },
  ingHeaderTitle: {
    fontSize: "17px",
    fontWeight: "700",
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  ingBody: {
    flex: 1,
    padding: "12px 0",
    overflowY: "auto",
  },
  ingRow: {
    display: "flex",
    alignItems: "center",
    padding: "13px 20px",
    gap: "14px",
    borderBottom: "1px solid var(--color-border)",
    background: "#fff",
    cursor: "pointer",
  },
  ingCheckbox: (checked) => ({
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
  ingCheckmark: {
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
  ingQty: {
    color: "var(--color-primary)",
    fontWeight: "500",
    fontSize: "15px",
  },
  ingName: {
    fontSize: "15px",
    color: "#111",
  },
  ingFooter: {
    padding: "16px 20px",
    borderTop: "1px solid var(--color-border)",
    background: "#fff",
  },
  ingAddBtn: (enabled) => ({
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    background: enabled ? "var(--color-primary)" : "#d1d5db",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-md)",
    cursor: enabled ? "pointer" : "default",
    fontFamily: "inherit",
  }),
  // ── Prompt bottom sheet ──────────────────────────────────────────────────────
  promptBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    zIndex: 400,
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
  // ── Calendar overlay ─────────────────────────────────────────────────────────
  calOverlay: {
    position: "fixed",
    inset: 0,
    background: "#fff",
    zIndex: 200,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  },
  calHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    borderBottom: "1px solid var(--color-border)",
    position: "sticky",
    top: 0,
    background: "#fff",
    zIndex: 10,
  },
  calNav: {
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    color: "#374151",
    padding: "4px 8px",
    fontFamily: "inherit",
  },
  calMonthLabel: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#111",
  },
  calCloseBtn: {
    padding: "6px 12px",
    fontSize: "13px",
    fontWeight: "600",
    background: "none",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontFamily: "inherit",
    color: "#374151",
  },
  calGrid: {
    padding: "0 12px 16px",
  },
  calWeekHeader: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    marginBottom: "4px",
  },
  calWeekDay: {
    textAlign: "center",
    fontSize: "11px",
    fontWeight: "700",
    color: "#9ca3af",
    padding: "8px 0",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  calDaysGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "2px",
  },
  calCell: (isToday, hasDate, hasMeals) => ({
    aspectRatio: "1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    cursor: hasDate ? "pointer" : "default",
    background: isToday ? "var(--color-primary)" : "transparent",
    position: "relative",
  }),
  calCellNum: (isToday, isThisMonth) => ({
    fontSize: "14px",
    fontWeight: isToday ? "700" : "400",
    color: isToday ? "#fff" : isThisMonth ? "#111" : "#d1d5db",
  }),
  calDot: {
    width: "4px",
    height: "4px",
    borderRadius: "50%",
    background: "var(--color-primary)",
    marginTop: "2px",
  },
  calDotToday: {
    width: "4px",
    height: "4px",
    borderRadius: "50%",
    background: "#fff",
    marginTop: "2px",
  },
  calSelectedDate: {
    padding: "14px 16px 8px",
    borderTop: "1px solid var(--color-border)",
  },
  calSelectedLabel: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#6b7280",
    margin: "0 0 10px",
  },
  // ── Toolbar row (below header) ───────────────────────────────────────────────
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    borderBottom: "1px solid var(--color-border)",
    background: "#fff",
  },
  newMealBtn: {
    padding: "7px 14px",
    fontSize: "13px",
    fontWeight: "600",
    background: "var(--color-primary)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  // ── Recipe picker overlay ────────────────────────────────────────────────────
  recipePickerSearchWrap: {
    padding: "12px 16px",
    borderBottom: "1px solid var(--color-border)",
    background: "#fff",
    position: "sticky",
    top: 0,
  },
  recipePickerSearch: {
    width: "100%",
    fontSize: "16px",
    padding: "10px 12px",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    fontFamily: "inherit",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  },
  recipePickerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    borderBottom: "1px solid var(--color-border)",
    background: "#fff",
    cursor: "pointer",
  },
  recipePickerName: {
    fontSize: "15px",
    color: "#111",
    flex: 1,
    marginRight: "10px",
  },
  binBadge: {
    fontSize: "11px",
    fontWeight: "600",
    color: "var(--color-primary)",
    background: "var(--color-primary-light)",
    padding: "2px 7px",
    borderRadius: "10px",
    flexShrink: 0,
  },
};

// ── Utilities ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return dateStr(new Date());
}

function daysUntil(isoStr) {
  const diff = Math.ceil(
    (new Date(isoStr) - new Date(todayStr())) / (1000 * 60 * 60 * 24)
  );
  return diff;
}

function formatExpiry(isoStr) {
  const d = daysUntil(isoStr.slice(0, 10));
  if (d <= 0) return "expires today";
  if (d === 1) return "1 day left";
  return `${d} days left`;
}

function buildWeek() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

function initForm(recipe) {
  return {
    recipes: [recipe],
    name: recipe.recipe.title,
    date: todayStr(),
    assignedTo: [],
    persistent: false,
    shoppingChoices: { [recipe.recipe_id]: "all" },
    selectedIngredients: {},
  };
}

function initEmptyForm() {
  return {
    recipes: [],
    name: "",
    date: todayStr(),
    assignedTo: [],
    persistent: false,
    shoppingChoices: {},
    selectedIngredients: {},
  };
}

function initEditForm(meal) {
  const choices = {};
  meal.recipes.forEach((r) => {
    choices[r.id] = "none";
  });
  return {
    name: meal.name,
    date: meal.planned_date,
    assignedTo: [...meal.assigned_to],
    persistent: meal.persistent,
    recipes: meal.recipes.map((r) => ({ recipe_id: r.id, recipe: r })),
    shoppingChoices: choices,
    selectedIngredients: {},
  };
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PlanView({
  mealPlan,
  shopping,
  activeHousehold,
  currentUserId,
  navContext,
}) {
  const { bin, meals, createMeal, updateMeal, deleteMeal } = mealPlan;
  const isHousehold = navContext === "household" && !!activeHousehold;

  const [members, setMembers] = useState([]);
  const [allRecipes, setAllRecipes] = useState([]);
  const [createForm, setCreateForm] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editMeal, setEditMeal] = useState(null);
  const [ingStep, setIngStep] = useState(null);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [recipePickerFormType, setRecipePickerFormType] = useState("create");
  const [showCalendar, setShowCalendar] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [calSelectedDate, setCalSelectedDate] = useState(null);
  const [mealDeleteState, setMealDeleteState] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isHousehold || !activeHousehold) return;
    apiFetch(`/households/${activeHousehold.id}`)
      .then((d) => setMembers(d.members || []))
      .catch(() => {});
  }, [isHousehold, activeHousehold]);

  useEffect(() => {
    apiFetch("/recipes")
      .then((d) => setAllRecipes(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  function getMemberAlias(uid) {
    const m = members.find((m) => m.user_id === uid);
    return m?.alias || m?.email || "Member";
  }

  // ── Create meal flow ─────────────────────────────────────────────────────────

  function openCreate(binEntry) {
    setCreateForm(initForm(binEntry));
  }

  function openCreateManual() {
    setCreateForm(initEmptyForm());
  }

  function closeCreate() {
    setCreateForm(null);
    setIngStep(null);
    setShowRecipePicker(false);
  }

  function setCreateField(field, value) {
    setCreateForm((f) => ({ ...f, [field]: value }));
  }

  function setChoice(formSetter, recipeId, choice) {
    formSetter((f) => ({
      ...f,
      shoppingChoices: { ...f.shoppingChoices, [recipeId]: choice },
    }));
  }

  function openIngStep(recipe, formType) {
    const existing =
      formType === "create"
        ? createForm?.selectedIngredients?.[recipe.recipe_id]
        : editForm?.selectedIngredients?.[recipe.recipe_id];
    const allIndices = new Set(
      (recipe.recipe.ingredients || []).map((_, i) => i)
    );
    setIngStep({
      recipe,
      formType,
      selected: existing ?? allIndices,
    });
  }

  function closeIngStep(selectedIndices) {
    if (!ingStep) return;
    const { recipe, formType } = ingStep;
    const setter = formType === "create" ? setCreateForm : setEditForm;
    setter((f) => ({
      ...f,
      selectedIngredients: {
        ...f.selectedIngredients,
        [recipe.recipe_id]: selectedIndices,
      },
    }));
    setIngStep(null);
  }

  function addRecipeToForm(recipe, formType) {
    const entry = { recipe_id: recipe.id, recipe };
    const setter = formType === "create" ? setCreateForm : setEditForm;
    setter((f) => {
      if (f.recipes.some((r) => r.recipe_id === recipe.id)) return f;
      return {
        ...f,
        recipes: [...f.recipes, entry],
        shoppingChoices: { ...f.shoppingChoices, [recipe.id]: "all" },
      };
    });
    setShowRecipePicker(false);
  }

  function removeRecipeFromForm(recipeId, formType) {
    const setter = formType === "create" ? setCreateForm : setEditForm;
    setter((f) => {
      const recipes = f.recipes.filter((r) => r.recipe_id !== recipeId);
      const choices = { ...f.shoppingChoices };
      delete choices[recipeId];
      return { ...f, recipes, shoppingChoices: choices };
    });
  }

  async function applyShoppingChoices(form) {
    for (const r of form.recipes) {
      const choice = form.shoppingChoices[r.recipe_id] || "none";
      if (choice === "all") {
        await shopping.handleAddRecipe(r.recipe, r.recipe.ingredients);
      } else if (choice === "select") {
        const sel = form.selectedIngredients[r.recipe_id];
        if (sel && sel.size > 0) {
          const ings = r.recipe.ingredients.filter((_, i) => sel.has(i));
          await shopping.handleAddRecipe(r.recipe, ings);
        }
      }
    }
  }

  async function handleConfirmCreate() {
    if (!createForm || saving) return;
    setSaving(true);
    try {
      await applyShoppingChoices(createForm);
      await createMeal({
        name: createForm.name,
        planned_date: createForm.date,
        recipe_ids: createForm.recipes.map((r) => r.recipe_id),
        assigned_to: createForm.assignedTo,
        persistent: createForm.persistent,
      });
      closeCreate();
    } finally {
      setSaving(false);
    }
  }

  // ── Edit meal flow ───────────────────────────────────────────────────────────

  function openEdit(meal) {
    setEditMeal(meal);
    setEditForm(initEditForm(meal));
  }

  function closeEdit() {
    setEditMeal(null);
    setEditForm(null);
    setIngStep(null);
    setShowRecipePicker(false);
  }

  function setEditField(field, value) {
    setEditForm((f) => ({ ...f, [field]: value }));
  }

  async function handleConfirmEdit() {
    if (!editMeal || !editForm || saving) return;
    setSaving(true);
    try {
      await applyShoppingChoices(editForm);
      await updateMeal(editMeal.id, {
        name: editForm.name,
        planned_date: editForm.date,
        recipe_ids: editForm.recipes.map((r) => r.recipe_id),
        assigned_to: editForm.assignedTo,
        persistent: editForm.persistent,
      });
      closeEdit();
    } finally {
      setSaving(false);
    }
  }

  // ── Meal delete flow (with shopping removal prompts) ─────────────────────────

  function startMealDelete(meal) {
    let workingItems = [...shopping.items];
    const promptQueue = [];

    for (const recipe of meal.recipes) {
      const { newItems, multiSourceItems } = removeRecipeFromList(
        workingItems,
        recipe.id,
        recipe.ingredients
      );
      workingItems = newItems;
      promptQueue.push(...multiSourceItems);
    }

    if (promptQueue.length === 0) {
      shopping.writeList(workingItems);
      deleteMeal(meal.id);
      closeEdit();
    } else {
      setMealDeleteState({
        meal,
        pendingItems: workingItems,
        allMultiSource: promptQueue,
        currentIndex: 0,
      });
    }
  }

  function resolveMealDeletePrompt(choice) {
    const { pendingItems, allMultiSource, currentIndex, meal } =
      mealDeleteState;
    const { item, recipeQty, recipeUnit } = allMultiSource[currentIndex];

    let resolved = [...pendingItems];
    const idx = resolved.findIndex((i) => i.id === item.id);

    if (idx !== -1) {
      if (choice === "subtract") {
        const newQtys = subtractQty(
          resolved[idx].quantities,
          recipeQty,
          recipeUnit
        );
        if (newQtys.length === 0) {
          resolved.splice(idx, 1);
        } else {
          resolved[idx] = { ...resolved[idx], quantities: newQtys };
        }
      } else if (choice === "remove") {
        resolved.splice(idx, 1);
      }
    }

    if (currentIndex + 1 >= allMultiSource.length) {
      shopping.writeList(resolved);
      deleteMeal(meal.id);
      closeEdit();
      setMealDeleteState(null);
    } else {
      setMealDeleteState((prev) => ({
        ...prev,
        pendingItems: resolved,
        currentIndex: currentIndex + 1,
      }));
    }
  }

  // ── Calendar helpers ─────────────────────────────────────────────────────────

  const today = new Date();
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(today.getMonth() - 1);

  function canNavPrev() {
    const prev = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1);
    return (
      prev >= new Date(oneMonthAgo.getFullYear(), oneMonthAgo.getMonth(), 1)
    );
  }

  function mealsOnDate(d) {
    const ds = dateStr(d);
    return meals.filter((m) => m.planned_date === ds);
  }

  // ── Render helpers ───────────────────────────────────────────────────────────

  function renderToggle(active, onToggle) {
    return (
      <button style={s.toggle(active)} onClick={onToggle} type="button">
        <div style={s.toggleThumb(active)} />
      </button>
    );
  }

  function renderMemberChips(form, setter) {
    if (!isHousehold || members.length === 0) return null;
    return (
      <div>
        <p style={s.fieldLabel}>Assigned to</p>
        <div style={s.membersRow}>
          {members.map((m) => {
            const active = form.assignedTo.includes(m.user_id);
            return (
              <button
                key={m.user_id}
                style={s.memberChip(active)}
                onClick={() => {
                  setter((f) => ({
                    ...f,
                    assignedTo: active
                      ? f.assignedTo.filter((id) => id !== m.user_id)
                      : [...f.assignedTo, m.user_id],
                  }));
                }}
              >
                <Avatar
                  letter={m.avatar_letter}
                  color={m.avatar_color}
                  size={20}
                />
                {m.alias || m.email}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderRecipeBlock(entry, form, formType) {
    const rid = entry.recipe_id;
    const choice = form.shoppingChoices[rid] || "none";
    const canRemove = form.recipes.length > 1;
    return (
      <div key={rid} style={s.recipeBlock}>
        <div style={s.recipeBlockHeader}>
          <span style={s.recipeBlockName}>{entry.recipe.title}</span>
          {canRemove && (
            <button
              style={s.removeRecipeBtn}
              onClick={() => removeRecipeFromForm(rid, formType)}
              aria-label="Remove recipe"
            >
              ×
            </button>
          )}
        </div>
        <div style={s.shoppingChoiceRow}>
          <button
            style={s.choicePill(choice === "all")}
            onClick={() =>
              setChoice(
                formType === "create" ? setCreateForm : setEditForm,
                rid,
                "all"
              )
            }
          >
            Add all
          </button>
          <button
            style={s.choicePill(choice === "select")}
            onClick={() => {
              setChoice(
                formType === "create" ? setCreateForm : setEditForm,
                rid,
                "select"
              );
              openIngStep(entry, formType);
            }}
          >
            Choose…
          </button>
          <button
            style={s.choicePill(choice === "none")}
            onClick={() =>
              setChoice(
                formType === "create" ? setCreateForm : setEditForm,
                rid,
                "none"
              )
            }
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  function renderFormBody(form, formType) {
    const setter = formType === "create" ? setCreateForm : setEditForm;
    const setField = formType === "create" ? setCreateField : setEditField;

    return (
      <>
        <p style={s.fieldLabel}>Meal name</p>
        <input
          style={s.textInput}
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="e.g. Sunday Dinner"
        />

        <p style={s.fieldLabel}>Date</p>
        <input
          type="date"
          style={s.dateInput}
          value={form.date}
          onChange={(e) => setField("date", e.target.value)}
        />

        <p style={s.fieldLabel}>Recipes</p>
        {form.recipes.map((r) => renderRecipeBlock(r, form, formType))}

        <button
          style={s.addFromBinBtn}
          onClick={() => {
            setRecipePickerFormType(formType);
            setShowRecipePicker(true);
          }}
        >
          + Add a recipe
        </button>

        {renderMemberChips(form, setter)}

        <div style={s.persistentRow}>
          <span style={s.persistentLabel}>Keep meal forever</span>
          {renderToggle(form.persistent, () =>
            setField("persistent", !form.persistent)
          )}
        </div>
        <p style={s.persistentHelper}>
          Unchecked meals will be erased one month after their scheduled date.
        </p>
      </>
    );
  }

  // ── 7-day view ───────────────────────────────────────────────────────────────

  const week = buildWeek();
  const todayDateStr = todayStr();

  // ── Calendar grid ────────────────────────────────────────────────────────────

  const calCells = buildMonthGrid(calMonth.getFullYear(), calMonth.getMonth());

  // Fetch meals for calendar range when calendar opens
  useEffect(() => {
    if (!showCalendar) return;
    const y = calMonth.getFullYear();
    const m = calMonth.getMonth();
    const start = dateStr(new Date(y, m, 1));
    // Also fetch one month back for calendar navigation
    const back = new Date(y, m - 1, 1);
    mealPlan.fetchMeals(
      dateStr(new Date(back.getFullYear(), back.getMonth(), 1)),
      dateStr(new Date(y, m + 1, 0))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCalendar, calMonth]);

  const calSelectedMeals = calSelectedDate ? mealsOnDate(calSelectedDate) : [];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <p style={s.headerTitle}>Plan</p>
      </div>

      {/* Toolbar */}
      <div style={s.toolbar}>
        <button style={s.newMealBtn} onClick={openCreateManual}>
          + New meal
        </button>
        <button style={s.calBtn} onClick={() => setShowCalendar(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
          </svg>
          Calendar
        </button>
      </div>

      {/* Bin */}
      <div style={s.section}>
        <p style={s.sectionLabel}>Ready to plan</p>
        {bin.length === 0 ? (
          <p style={s.emptyBin}>
            Add recipes to your shopping list to see them here.
          </p>
        ) : (
          <div style={s.binScroll}>
            {bin.map((entry) => (
              <div
                key={entry.id}
                style={s.binCard}
                onClick={() => openCreate(entry)}
              >
                <p style={s.binCardTitle}>{entry.recipe.title}</p>
                <p style={s.binCardExpiry}>{formatExpiry(entry.expires_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7-day view */}
      <div style={{ ...s.section, paddingBottom: 0 }}>
        <p style={s.sectionLabel}>This week</p>
      </div>
      <div style={s.weekGrid}>
        {week.map((day) => {
          const ds = dateStr(day);
          const isToday = ds === todayDateStr;
          const dayMeals = mealsOnDate(day);
          return (
            <div key={ds} style={s.dayRow}>
              <div style={s.dayHeader}>
                <span style={s.dayName(isToday)}>
                  {DAY_NAMES[day.getDay()]}
                </span>
                <span style={s.dayDate(isToday)}>
                  {day.getMonth() + 1}/{day.getDate()}
                </span>
              </div>
              {dayMeals.length === 0 ? (
                <p style={s.emptyDay}>No meals planned</p>
              ) : (
                dayMeals.map((meal) => (
                  <div
                    key={meal.id}
                    style={s.mealCard}
                    onClick={() => openEdit(meal)}
                  >
                    <div style={s.mealCardLeft}>
                      <p style={s.mealCardName}>{meal.name}</p>
                      <p style={s.mealCardRecipes}>
                        {meal.recipes.map((r) => r.title).join(", ")}
                      </p>
                    </div>
                    {isHousehold && meal.assigned_to.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          gap: "4px",
                          marginRight: "4px",
                        }}
                      >
                        {meal.assigned_to.slice(0, 3).map((uid) => {
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
                    <span style={s.mealCardChevron}>›</span>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* ── Create meal modal ──────────────────────────────────────────────── */}
      {createForm && !ingStep && (
        <div style={s.backdrop} onClick={closeCreate}>
          <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={s.sheetHandle} />
            <p style={s.sheetTitle}>Plan a meal</p>
            {renderFormBody(createForm, "create")}
            <button
              style={s.confirmBtn(!saving && createForm.name.trim())}
              onClick={handleConfirmCreate}
              disabled={saving || !createForm.name.trim()}
            >
              {saving ? "Saving…" : "Plan Meal"}
            </button>
            <button style={s.cancelBtn} onClick={closeCreate}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Edit meal modal ────────────────────────────────────────────────── */}
      {editForm && editMeal && !ingStep && (
        <div style={s.backdrop} onClick={closeEdit}>
          <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={s.sheetHandle} />
            <p style={s.sheetTitle}>Edit meal</p>
            {renderFormBody(editForm, "edit")}
            <button
              style={s.confirmBtn(!saving && editForm.name.trim())}
              onClick={handleConfirmEdit}
              disabled={saving || !editForm.name.trim()}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <div style={s.divider} />
            <button
              style={s.dangerBtn}
              onClick={() => startMealDelete(editMeal)}
            >
              Delete meal
            </button>
            <button style={s.cancelBtn} onClick={closeEdit}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Recipe picker overlay ─────────────────────────────────────────── */}
      {showRecipePicker && (
        <RecipePickerOverlay
          allRecipes={allRecipes}
          binRecipeIds={new Set(bin.map((b) => b.recipe_id))}
          inFormIds={
            new Set(
              (recipePickerFormType === "create"
                ? createForm
                : editForm
              )?.recipes.map((r) => r.recipe_id) ?? []
            )
          }
          onBack={() => setShowRecipePicker(false)}
          onSelect={(recipe) => addRecipeToForm(recipe, recipePickerFormType)}
        />
      )}

      {/* ── Ingredient select overlay ──────────────────────────────────────── */}
      {ingStep && (
        <IngredientSelectOverlay
          recipe={ingStep.recipe.recipe}
          initialSelected={ingStep.selected}
          onBack={() => setIngStep(null)}
          onConfirm={(selectedSet) => closeIngStep(selectedSet)}
        />
      )}

      {/* ── Meal delete shopping removal prompt ───────────────────────────── */}
      {mealDeleteState &&
        (() => {
          const { allMultiSource, currentIndex } = mealDeleteState;
          const entry = allMultiSource[currentIndex];
          return (
            <div
              style={s.promptBackdrop}
              onClick={() => setMealDeleteState(null)}
            >
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
                  onClick={() => resolveMealDeletePrompt("subtract")}
                >
                  Remove this recipe&rsquo;s qty contribution
                </button>
                <button
                  style={s.promptBtn(false)}
                  onClick={() => resolveMealDeletePrompt("keep")}
                >
                  Keep the current qty as-is
                </button>
                <button
                  style={s.promptBtn(true)}
                  onClick={() => resolveMealDeletePrompt("remove")}
                >
                  Remove this ingredient entirely
                </button>
                <button
                  style={s.promptCancelBtn}
                  onClick={() => setMealDeleteState(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        })()}

      {/* ── Calendar overlay ──────────────────────────────────────────────── */}
      {showCalendar && (
        <div style={s.calOverlay}>
          <div style={s.calHeader}>
            <button
              style={s.calNav}
              onClick={() => {
                if (!canNavPrev()) return;
                setCalMonth(
                  (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1)
                );
                setCalSelectedDate(null);
              }}
              disabled={!canNavPrev()}
              aria-label="Previous month"
            >
              ‹
            </button>
            <span style={s.calMonthLabel}>
              {MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}
            </span>
            <button
              style={s.calNav}
              onClick={() => {
                setCalMonth(
                  (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1)
                );
                setCalSelectedDate(null);
              }}
              aria-label="Next month"
            >
              ›
            </button>
            <button
              style={s.calCloseBtn}
              onClick={() => setShowCalendar(false)}
            >
              Close
            </button>
          </div>

          <div style={s.calGrid}>
            <div style={s.calWeekHeader}>
              {DAY_NAMES.map((d) => (
                <div key={d} style={s.calWeekDay}>
                  {d}
                </div>
              ))}
            </div>
            <div style={s.calDaysGrid}>
              {calCells.map((cell, i) => {
                if (!cell) return <div key={`empty-${i}`} />;
                const ds = dateStr(cell);
                const isToday = ds === todayDateStr;
                const hasMeals = meals.some((m) => m.planned_date === ds);
                const isSelected =
                  calSelectedDate && dateStr(calSelectedDate) === ds;
                return (
                  <div
                    key={ds}
                    style={{
                      ...s.calCell(isToday, true, hasMeals),
                      outline: isSelected
                        ? "2px solid var(--color-primary)"
                        : "none",
                    }}
                    onClick={() => setCalSelectedDate(isSelected ? null : cell)}
                  >
                    <span
                      style={s.calCellNum(
                        isToday,
                        cell.getMonth() === calMonth.getMonth()
                      )}
                    >
                      {cell.getDate()}
                    </span>
                    {hasMeals && (
                      <div style={isToday ? s.calDotToday : s.calDot} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {calSelectedDate && (
            <div style={s.calSelectedDate}>
              <p style={s.calSelectedLabel}>
                {MONTH_NAMES[calSelectedDate.getMonth()]}{" "}
                {calSelectedDate.getDate()}
              </p>
              {calSelectedMeals.length === 0 ? (
                <p style={{ color: "#9ca3af", fontSize: "14px", margin: 0 }}>
                  No meals on this day.
                </p>
              ) : (
                calSelectedMeals.map((meal) => (
                  <div
                    key={meal.id}
                    style={{ ...s.mealCard, marginBottom: "8px" }}
                    onClick={() => {
                      setShowCalendar(false);
                      openEdit(meal);
                    }}
                  >
                    <div style={s.mealCardLeft}>
                      <p style={s.mealCardName}>{meal.name}</p>
                      <p style={s.mealCardRecipes}>
                        {meal.recipes.map((r) => r.title).join(", ")}
                      </p>
                    </div>
                    <span style={s.mealCardChevron}>›</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── RecipePickerOverlay ────────────────────────────────────────────────────────

function RecipePickerOverlay({
  allRecipes,
  binRecipeIds,
  inFormIds,
  onBack,
  onSelect,
}) {
  const [search, setSearch] = useState("");
  const filtered = allRecipes.filter(
    (r) => !search || r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={s.ingPage}>
      <div style={s.ingHeader}>
        <button style={s.ingBackBtn} onClick={onBack}>
          ‹ Back
        </button>
        <div style={s.ingHeaderInfo}>
          <p style={s.ingHeaderTitle}>Add a recipe</p>
        </div>
      </div>

      <div style={s.recipePickerSearchWrap}>
        <input
          style={s.recipePickerSearch}
          placeholder="Search recipes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      <div style={s.ingBody}>
        {filtered.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              color: "#6b7280",
              padding: "48px 20px",
              fontSize: "15px",
            }}
          >
            No recipes found.
          </p>
        ) : (
          filtered.map((recipe) => {
            const alreadyAdded = inFormIds.has(recipe.id);
            return (
              <div
                key={recipe.id}
                style={{
                  ...s.recipePickerRow,
                  opacity: alreadyAdded ? 0.4 : 1,
                  pointerEvents: alreadyAdded ? "none" : "auto",
                }}
                onClick={() => onSelect(recipe)}
              >
                <span style={s.recipePickerName}>{recipe.title}</span>
                {binRecipeIds.has(recipe.id) && (
                  <span style={s.binBadge}>In bin</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── IngredientSelectOverlay ────────────────────────────────────────────────────

function IngredientSelectOverlay({
  recipe,
  initialSelected,
  onBack,
  onConfirm,
}) {
  const [selected, setSelected] = useState(() => {
    if (initialSelected) return new Set(initialSelected);
    return new Set((recipe.ingredients || []).map((_, i) => i));
  });

  function toggle(i) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const ingredients = recipe.ingredients || [];

  return (
    <div style={s.ingPage}>
      <div style={s.ingHeader}>
        <button style={s.ingBackBtn} onClick={onBack}>
          ‹ Back
        </button>
        <div style={s.ingHeaderInfo}>
          <p style={s.ingHeaderLabel}>Choose Ingredients</p>
          <p style={s.ingHeaderTitle}>{recipe.title}</p>
        </div>
      </div>

      <div style={s.ingBody}>
        {ingredients.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              color: "#6b7280",
              padding: "48px 20px",
              fontSize: "15px",
            }}
          >
            No ingredients in this recipe.
          </p>
        ) : (
          ingredients.map((ing, i) => {
            const checked = selected.has(i);
            const qtyStr = formatQty(ing.qty);
            const unitStr = ing.unit ? ` ${ing.unit}` : "";
            return (
              <div key={i} style={s.ingRow} onClick={() => toggle(i)}>
                <div style={s.ingCheckbox(checked)}>
                  {checked && <span style={s.ingCheckmark}>✓</span>}
                </div>
                <div style={s.ingInfo}>
                  <span style={s.ingQty}>
                    {qtyStr}
                    {unitStr}
                  </span>
                  <span style={s.ingName}>{ing.name}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {ingredients.length > 0 && (
        <div style={s.ingFooter}>
          <button
            style={s.ingAddBtn(selected.size > 0)}
            onClick={() => selected.size > 0 && onConfirm(selected)}
          >
            {selected.size > 0
              ? `Add ${selected.size} to Shopping List`
              : "Select ingredients to add"}
          </button>
        </div>
      )}
    </div>
  );
}
