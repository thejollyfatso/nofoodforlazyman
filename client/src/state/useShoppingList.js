import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../utils/apiFetch";
import { normalizeIngredientName } from "../utils/normalizeIngredientName";
import { levenshtein } from "../utils/levenshtein";
import { parseIngredientLine } from "../utils/ingredientParser";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

// ── Pure helpers ──────────────────────────────────────────────────────────────

function parseNum(s) {
  if (!s) return 0;
  const parts = s.trim().split(/\s+/);
  let total = 0;
  for (const p of parts) {
    if (p.includes("/")) {
      const [n, d] = p.split("/").map(Number);
      total += n / d;
    } else {
      total += parseFloat(p) || 0;
    }
  }
  return total;
}

const FRAC_PAIRS = [
  [3 / 4, "3/4"],
  [2 / 3, "2/3"],
  [1 / 2, "1/2"],
  [1 / 3, "1/3"],
  [1 / 4, "1/4"],
  [1 / 8, "1/8"],
];

function formatNum(n) {
  if (n === 0) return "0";
  const whole = Math.floor(n);
  const frac = n - whole;
  if (frac < 0.01) return String(whole);
  for (const [val, str] of FRAC_PAIRS) {
    if (Math.abs(frac - val) < 0.01) return whole ? `${whole} ${str}` : str;
  }
  return n.toFixed(2).replace(/\.?0+$/, "");
}

// ── Unit normalization ────────────────────────────────────────────────────────

const UNIT_CANON = {
  tbsp: "tablespoon",
  tbsps: "tablespoon",
  tablespoons: "tablespoon",
  tsp: "teaspoon",
  tsps: "teaspoon",
  teaspoons: "teaspoon",
  lb: "pound",
  lbs: "pound",
  pounds: "pound",
  oz: "ounce",
  ozs: "ounce",
  ounces: "ounce",
  "fl oz": "fl oz",
  "fluid ounce": "fl oz",
  "fluid ounces": "fl oz",
  g: "gram",
  grams: "gram",
  kg: "kilogram",
  kgs: "kilogram",
  kilograms: "kilogram",
  mg: "milligram",
  mgs: "milligram",
  milligrams: "milligram",
  ml: "milliliter",
  mls: "milliliter",
  milliliters: "milliliter",
  millilitres: "milliliter",
  millilitre: "milliliter",
  liters: "liter",
  litres: "liter",
  litre: "liter",
  pt: "pint",
  pts: "pint",
  pints: "pint",
  qt: "quart",
  qts: "quart",
  quarts: "quart",
  gal: "gallon",
  gals: "gallon",
  gallons: "gallon",
  pkg: "package",
  pkgs: "package",
  packages: "package",
  cups: "cup",
  cloves: "clove",
  handfuls: "handful",
  bunches: "bunch",
  stalks: "stalk",
  sprigs: "sprig",
  leaves: "leaf",
  heads: "head",
  pieces: "piece",
  slices: "slice",
  strips: "strip",
  sheets: "sheet",
  sticks: "stick",
  bottles: "bottle",
  boxes: "box",
  cans: "can",
  jars: "jar",
  bags: "bag",
  drops: "drop",
  dashes: "dash",
  pinches: "pinch",
};

function normalizeUnit(unit) {
  if (!unit) return "";
  const lower = unit.toLowerCase().trim();
  if (UNIT_CANON[lower] !== undefined) return UNIT_CANON[lower];
  if (lower.endsWith("s") && lower.length > 2) return lower.slice(0, -1);
  return lower;
}

function unitsMatch(a, b) {
  const na = normalizeUnit(a);
  const nb = normalizeUnit(b);
  if (na === nb) return true;
  if (na.length >= 4 && nb.length >= 4) return levenshtein(na, nb) <= 1;
  return false;
}

// ── Pure merging helpers ──────────────────────────────────────────────────────

function findMatch(items, normalizedName) {
  const exact = items.find((i) => i.normalized_name === normalizedName);
  if (exact) return exact;
  if (normalizedName.length >= 4) {
    return (
      items.find(
        (i) =>
          i.normalized_name.length >= 4 &&
          levenshtein(i.normalized_name, normalizedName) <= 1
      ) ?? null
    );
  }
  return null;
}

function mergeQuantities(existing, newQty, newUnit) {
  if (!newQty && !newUnit) return existing;
  // Handle range quantities: take upper bound (e.g. "1-2" → "2", "1 to 2" → "2")
  let qty = newQty || "";
  const rangeMatch = qty.match(/(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) qty = rangeMatch[2];
  const unit = newUnit || "";
  // Same unit (normalized) → sum quantities numerically
  const idx = existing.findIndex((e) => unitsMatch(e.unit, unit));
  if (idx !== -1) {
    const sum = parseNum(existing[idx].qty) + parseNum(qty);
    return existing.map((e, i) =>
      i === idx ? { qty: formatNum(sum), unit: e.unit } : e
    );
  }
  return [...existing, { qty, unit }];
}

function mergeSubstitutions(existing, incoming) {
  const result = [...existing];
  for (const sub of incoming || []) {
    if (!result.some((e) => e.name === sub.name)) {
      result.push(sub);
    }
  }
  return result;
}

export function mergeIngredientsIntoList(existingItems, recipe, ingredients) {
  const items = existingItems.map((i) => ({ ...i }));
  let newCount = 0;

  for (const ing of ingredients) {
    if (!ing.name?.trim()) continue;
    const norm = normalizeIngredientName(ing.name);
    const match = findMatch(items, norm);

    if (match) {
      const idx = items.findIndex((i) => i.id === match.id);
      items[idx] = {
        ...match,
        quantities: mergeQuantities(match.quantities, ing.qty, ing.unit),
        source_recipes:
          recipe && !match.source_recipes.includes(recipe.id)
            ? [...match.source_recipes, recipe.id]
            : match.source_recipes,
        substitutions: mergeSubstitutions(
          match.substitutions,
          ing.substitutions
        ),
        optional: match.optional && (ing.optional ?? false),
      };
    } else {
      const qty = ing.qty || "";
      const unit = ing.unit || "";
      items.push({
        id: crypto.randomUUID(),
        name: ing.name,
        normalized_name: norm,
        quantities: qty || unit ? [{ qty, unit }] : [],
        checked: false,
        checked_by: null,
        source_recipes: recipe ? [recipe.id] : [],
        optional: ing.optional ?? false,
        secret: ing.secret ?? false,
        assigned_to: [],
        substitutions: ing.substitutions ?? [],
        substituted_with: null,
        item_order: existingItems.length + newCount,
      });
      newCount++;
    }
  }

  return items;
}

export function removeRecipeFromList(items, recipeId, recipeIngredients) {
  const newItems = [];
  const multiSourceItems = [];

  // Track which item IDs we've already processed for multi-source prompt
  const promptedIds = new Set();

  for (const item of items) {
    if (!item.source_recipes.includes(recipeId)) {
      newItems.push(item);
      continue;
    }

    const remaining = item.source_recipes.filter((id) => id !== recipeId);

    const matchingIng = (recipeIngredients || []).find((ing) => {
      const norm = normalizeIngredientName(ing.name);
      return findMatch([item], norm)?.id === item.id;
    });

    if (remaining.length === 0) {
      const afterSubtract = subtractQty(
        item.quantities,
        matchingIng?.qty || "",
        matchingIng?.unit || ""
      );
      if (afterSubtract.length === 0) continue; // clean removal, no manual edits
      // Qty was manually edited — prompt user, keep current qty in pending list
      if (!promptedIds.has(item.id)) {
        promptedIds.add(item.id);
        multiSourceItems.push({
          item: { ...item },
          recipeId,
          recipeQty: matchingIng?.qty || "",
          recipeUnit: matchingIng?.unit || "",
        });
      }
      newItems.push({ ...item, source_recipes: [] });
      continue;
    }

    // Multiple sources, no manual additions → auto-subtract contribution
    const afterSubtract = subtractQty(
      item.quantities,
      matchingIng?.qty || "",
      matchingIng?.unit || ""
    );
    newItems.push({
      ...item,
      source_recipes: remaining,
      quantities: afterSubtract,
    });
  }

  return { newItems, multiSourceItems };
}

export function subtractQty(quantities, ingredientQty, ingredientUnit) {
  if (!ingredientQty && !ingredientUnit) return quantities;

  const unit = ingredientUnit || "";
  const subtractAmt = parseNum(ingredientQty);
  const result = [];

  for (const entry of quantities) {
    if (!unitsMatch(entry.unit, unit)) {
      result.push(entry);
      continue;
    }
    const current = parseNum(entry.qty);
    const remaining = current - subtractAmt;
    if (remaining > 0) {
      result.push({ qty: formatNum(remaining), unit: entry.unit });
    }
    // If remaining <= 0, drop this entry
  }

  return result;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useShoppingList({ contextType, ownerId }, token) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const esRef = useRef(null);

  const basePath =
    contextType === "household"
      ? `/households/${ownerId}/shopping`
      : "/shopping";

  const addedRecipeIds = useMemo(
    () => new Set(items.flatMap((i) => i.source_recipes)),
    [items]
  );

  const fetchList = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const data = await apiFetch(basePath);
      setItems(data.items);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [basePath, ownerId]);

  // Fetch on mount / context change
  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // SSE subscription
  useEffect(() => {
    if (!ownerId || !token) return;

    const params =
      contextType === "household"
        ? `?token=${encodeURIComponent(token)}&household_id=${ownerId}`
        : `?token=${encodeURIComponent(token)}`;

    const es = new EventSource(`${BASE_URL}/events${params}`);
    esRef.current = es;
    es.addEventListener("shopping_changed", fetchList);
    es.onerror = () => {};

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [contextType, ownerId, token, fetchList]);

  async function writeList(newItems, operation = null) {
    setItems(newItems);
    try {
      const body = { items: newItems };
      if (operation) body.operation = operation;
      const data = await apiFetch(basePath, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setItems(data.items);
      setError(null);
    } catch (e) {
      setError(e.message);
      await fetchList();
    }
  }

  async function patchItem(itemId, patch) {
    const data = await apiFetch(`${basePath}/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setItems((prev) => prev.map((i) => (i.id === itemId ? data : i)));
    return data;
  }

  function isRecipeInList(recipeId) {
    return addedRecipeIds.has(recipeId);
  }

  async function handleAddRecipe(recipe, ingredients) {
    const newItems = mergeIngredientsIntoList(items, recipe, ingredients);
    await writeList(newItems);
  }

  // onNeedPrompt(multiSourceItems) is called when items have multiple sources.
  // The caller (ShoppingView) shows the prompt; the returned resolve function
  // should be called with the final resolved items array.
  function handleRemoveRecipe(recipeId, recipeIngredients, onNeedPrompt) {
    const { newItems, multiSourceItems } = removeRecipeFromList(
      items,
      recipeId,
      recipeIngredients
    );

    if (multiSourceItems.length > 0) {
      onNeedPrompt(multiSourceItems, newItems);
    } else {
      writeList(newItems);
    }
  }

  async function handleAddManualItem(rawText) {
    const parsed = parseIngredientLine(rawText);
    if (!parsed || !parsed.name?.trim()) return;
    const newItems = mergeIngredientsIntoList(items, null, [parsed]);
    await writeList(newItems);
  }

  async function handleCheckItem(itemId, checked) {
    await patchItem(itemId, { checked });
  }

  async function handleSubstitute(itemId, subName) {
    await patchItem(itemId, { substituted_with: subName });
  }

  async function handleEditQty(itemId, newQtyStr) {
    const parsed = parseIngredientLine(newQtyStr);
    const quantities =
      parsed?.qty || parsed?.unit
        ? [{ qty: parsed?.qty || "", unit: parsed?.unit || "" }]
        : [];
    const newItems = items.map((i) =>
      i.id === itemId ? { ...i, quantities } : i
    );
    await writeList(newItems);
  }

  async function handleClearDone() {
    await writeList(
      items.filter((i) => !i.checked),
      "clear_done"
    );
  }

  async function handleClearAll() {
    await writeList([]);
  }

  async function handleAssignItem(itemId, userIds) {
    const newItems = items.map((i) =>
      i.id === itemId ? { ...i, assigned_to: userIds } : i
    );
    await writeList(newItems);
  }

  return {
    items,
    loading,
    error,
    addedRecipeIds,
    fetchList,
    writeList,
    isRecipeInList,
    handleAddRecipe,
    handleRemoveRecipe,
    handleAddManualItem,
    handleCheckItem,
    handleSubstitute,
    handleEditQty,
    handleClearDone,
    handleClearAll,
    handleAssignItem,
  };
}
