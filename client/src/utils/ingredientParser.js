const UNICODE_FRACS = {
  "¼": "1/4",
  "½": "1/2",
  "¾": "3/4",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};

// Ordered longest-first so multi-word units match before single-word
const KNOWN_UNITS = [
  "tablespoons",
  "tablespoon",
  "tbsp",
  "teaspoons",
  "teaspoon",
  "tsp",
  "fluid ounces",
  "fluid ounce",
  "fl oz",
  "milliliters",
  "millilitres",
  "milliliter",
  "millilitre",
  "ml",
  "liters",
  "litres",
  "liter",
  "litre",
  "kilograms",
  "kilogram",
  "kg",
  "milligrams",
  "milligram",
  "mg",
  "ounces",
  "ounce",
  "oz",
  "pounds",
  "pound",
  "lbs",
  "lb",
  "grams",
  "gram",
  "quarts",
  "quart",
  "qt",
  "gallons",
  "gallon",
  "gal",
  "pints",
  "pint",
  "pt",
  "cups",
  "cup",
  "handfuls",
  "handful",
  "bunches",
  "bunch",
  "stalks",
  "stalk",
  "sprigs",
  "sprig",
  "leaves",
  "leaf",
  "cloves",
  "clove",
  "heads",
  "head",
  "pieces",
  "piece",
  "slices",
  "slice",
  "strips",
  "strip",
  "sheets",
  "sheet",
  "sticks",
  "stick",
  "bottles",
  "bottle",
  "packages",
  "package",
  "pkg",
  "boxes",
  "box",
  "cans",
  "can",
  "jars",
  "jar",
  "bags",
  "bag",
  "drops",
  "drop",
  "dashes",
  "dash",
  "pinches",
  "pinch",
  "inches",
  "inch",
  "centimeters",
  "centimeter",
  "cm",
  "large",
  "medium",
  "small",
];

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceUnicodeFracs(s) {
  return s.replace(/[¼½¾⅓⅔⅛⅜⅝⅞]/g, (c) => UNICODE_FRACS[c] || c);
}

function splitByComma(text) {
  // Protect commas between digits (thousands separator like 1,000)
  const protected_ = text.replace(/(\d),(\d)/g, "$1\x00$2");
  return protected_
    .split(",")
    .map((p) => p.replace(/\x00/g, ",").trim())
    .filter(Boolean);
}

function extractQty(text) {
  let m;
  // X to Y range (possibly with mixed numbers on either side)
  m = text.match(/^(\d+(?:\s+\d+\/\d+)?\s+to\s+\d+(?:\s+\d+\/\d+)?)\s*/i);
  if (m) return [m[1].trim(), text.slice(m[0].length)];
  // X-Y range
  m = text.match(/^(\d+(?:\/\d+)?\s*-\s*\d+(?:\/\d+)?)\s*/);
  if (m) return [m[1].trim(), text.slice(m[0].length)];
  // Mixed number
  m = text.match(/^(\d+\s+\d+\/\d+)\s*/);
  if (m) return [m[1].trim(), text.slice(m[0].length)];
  // Fraction
  m = text.match(/^(\d+\/\d+)\s*/);
  if (m) return [m[1].trim(), text.slice(m[0].length)];
  // Integer or decimal (including thousands separator like 1,000)
  m = text.match(/^(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*/);
  if (m) return [m[1].trim(), text.slice(m[0].length)];
  // a / an
  m = text.match(/^(an?)\s+/i);
  if (m) return [m[1].trim(), text.slice(m[0].length)];
  return ["", text];
}

function extractUnit(text) {
  for (const u of KNOWN_UNITS) {
    const re = new RegExp(`^(${escapeRe(u)})(?=\\s|,|$)`, "i");
    const m = text.match(re);
    if (m) {
      let rest = text.slice(m[1].length).trim();
      rest = rest.replace(/^of\s+/i, "");
      return [u, rest];
    }
  }
  return ["", text];
}

function parseSubIngredient(raw) {
  let text = replaceUnicodeFracs(raw.trim());
  if (!text) return null;

  let qty, unit, name;
  [qty, name] = extractQty(text);
  [unit, name] = extractUnit(name);
  name = name.replace(/\([^)]*\)/g, "").trim();
  if (!name) return null;
  return { qty, unit, name };
}

export function parseIngredientLine(rawLine) {
  if (!rawLine?.trim()) return null;

  let text = rawLine.trim();

  // Remove bullet markers: -, –, —, •, *, ·
  text = text.replace(/^[-–—•*·]\s+/, "");
  // Remove numbered list markers: "1. " or "1) "
  text = text.replace(/^\d+[.)]\s+/, "");
  text = text.trim();
  if (!text) return null;

  // Replace unicode fractions with slash fractions
  text = replaceUnicodeFracs(text);

  // Detect substitution markers (used to skip comma-split)
  const hasSubMarker =
    /\(or\s/i.test(text) ||
    /(?:^|\s)(?:sub|substitute|alt|alternative):/i.test(text) ||
    / or /i.test(text);

  // Detect and remove optional indicators
  let optional = false;
  if (
    /\(optional\)/i.test(text) ||
    /,\s*optional\s*(?:,|$)/i.test(text) ||
    /\bif\s+desired\b/i.test(text) ||
    /\bif\s+using\b/i.test(text) ||
    /^optional:/i.test(text)
  ) {
    optional = true;
    text = text
      .replace(/\(optional\)/gi, "")
      .replace(/,\s*optional\s*(?=,|$)/gi, "")
      .replace(/\bif\s+desired\b/gi, "")
      .replace(/\bif\s+using\b/gi, "")
      .replace(/^optional:\s*/gi, "")
      .trim();
  }

  // Remove trailing modifiers
  text = text
    .replace(/,?\s*(to taste|or to taste|as needed|as required)\s*$/gi, "")
    .trim();

  // Extract (or ...) substitutions
  const substitutions = [];
  text = text
    .replace(/\(or\s+([^)]+)\)/gi, (_, sub) => {
      const parsed = parseSubIngredient(sub);
      if (parsed) substitutions.push(parsed);
      return "";
    })
    .trim();

  // Lines that are purely substitution pointers (sub:/alt: etc.) → skip
  if (/^(?:sub|substitute|alt|alternative):\s*/i.test(text)) return null;

  // Extract qty
  let qty, unit, name;
  [qty, name] = extractQty(text);

  // Extract unit
  [unit, name] = extractUnit(name);

  // Handle " or " in name (substitution in name text)
  if (/ or /i.test(name)) {
    const parts = name.split(/ or /i);
    name = parts[0].trim();
    for (let i = 1; i < parts.length; i++) {
      const sub = parts[i].trim();
      if (sub) {
        const parsed = parseSubIngredient(sub);
        substitutions.push(parsed || { qty: "", unit: "", name: sub });
      }
    }
  }

  // Remove remaining parenthetical notes
  name = name.replace(/\([^)]*\)/g, "").trim();

  // Comma-split (skip if substitution markers present)
  if (!hasSubMarker && name.includes(",")) {
    const parts = splitByComma(name);
    if (parts.length > 1) {
      name = parts[0].trim();
    }
  }

  name = name.trim();
  if (!name) return null;

  const result = { qty, unit, name };
  if (optional) result.optional = true;
  if (substitutions.length > 0) result.substitutions = substitutions;
  return result;
}

// Extract only qty + unit from a bare quantity string (no ingredient name required).
// Used by the shopping list qty edit field.
export function parseQtyUnit(text) {
  if (!text?.trim()) return { qty: "", unit: "" };
  let s = replaceUnicodeFracs(text.trim());
  const [qty, rest] = extractQty(s);
  const [unit] = extractUnit(rest.trim());
  return { qty, unit };
}

export function parseIngredients(text) {
  if (!text?.trim()) return [];
  return text
    .split("\n")
    .map((line) => parseIngredientLine(line))
    .filter(Boolean);
}

export function serializeIngredients(ingredients) {
  return ingredients
    .filter((i) => i.name?.trim())
    .map((i) => {
      let line = "";
      if (i.qty) line += i.qty + " ";
      if (i.unit) line += i.unit + " ";
      line += i.name;
      if (i.optional) line += " (optional)";
      if (i.substitutions?.length) {
        const subStrs = i.substitutions.map((s) => {
          let sub = "or ";
          if (s.qty) sub += s.qty + " ";
          if (s.unit) sub += s.unit + " ";
          sub += s.name;
          return `(${sub})`;
        });
        line += " " + subStrs.join(" ");
      }
      return line;
    })
    .join("\n");
}
