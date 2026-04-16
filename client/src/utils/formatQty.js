const FRAC_MAP = {
  "1/4": "¼",
  "1/2": "½",
  "3/4": "¾",
  "1/3": "⅓",
  "2/3": "⅔",
  "1/8": "⅛",
};

export function formatQty(qty) {
  if (!qty || !qty.trim()) return "~";

  // Mixed number: "1 1/2" → "1\u202F½"
  let result = qty.replace(/(\d+)\s+(\d+\/\d+)/g, (_, whole, frac) => {
    const uni = FRAC_MAP[frac];
    return uni ? `${whole}\u202F${uni}` : `${whole} ${frac}`;
  });

  // Standalone fraction: "1/2" → "½"
  result = result.replace(
    /\b(\d+\/\d+)\b/g,
    (_, frac) => FRAC_MAP[frac] || frac
  );

  return result;
}
