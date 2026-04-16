export function normalizeIngredientName(name) {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
}
