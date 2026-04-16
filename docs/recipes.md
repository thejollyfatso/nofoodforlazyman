# Recipe design — nf4lm

---

## Recipe entity

- `id` — server-generated UUID
- `title` — string, required
- `notes` — string, optional
- `ingredients` — array of ingredient objects (see below)
- `created_at` — ISO 8601, set on creation only
- `updated_at` — ISO 8601, set on every save
- `copied_from_user_id` — null if original, set if saved from a household
- `copied_from_alias` — alias of original owner at time of copy, immutable

---

## Ingredient object

```json
{
  "qty": "1 1/2",
  "unit": "cups",
  "name": "flour",
  "substitutions": [
    { "qty": "1 1/2", "unit": "cups", "name": "almond flour" }
  ],
  "optional": true,
  "secret": false
}
```

- `qty` — string, empty string if not specified, displays as `~`
- `unit` — string, empty string if not specified
- `name` — string, required for save — rows with empty name are skipped
- `substitutions` — array of `{ qty, unit, name }` objects, omitted if empty.
  Substitutions do not have their own substitutions or optional flag.
- `optional` — boolean, omitted if false
- `secret` — boolean, omitted if false. When a recipe is shared into a
  household, secret ingredients are hidden from other members. Hiding logic
  is not yet implemented — flag exists in the data model for future use.

---

## Qty display

- Unicode fractions used for common values: ¼ ½ ¾ ⅓ ⅔ ⅛
- Narrow no-break space before fraction when whole part is present (e.g. 1 ½)
- Range quantities displayed as-is (e.g. "1-2", "1 to 2")
- Empty qty displays as `~` for both ingredients and substitutions

---

## Recipes list view

- Search bar at top — font size 16px (prevents iOS zoom on focus)
- Two search modes toggled by a segmented control: Recipe | Ingredient
- Recipe search: case-insensitive match on title
- Ingredient search: fuzzy match (Levenshtein distance 1), minimum 4 chars
  for fuzzy — shorter requires exact. Results split into two sections:
  "All" (matches every search term) and "Any" (matches at least one)
- Sort: alphabetical only (localeCompare)
- Recipe cards: title (bold), ingredient count (pluralized), right arrow
- Empty state when no recipes exist
- No results state when search has no matches
- Import / Export footer always visible

---

## Recipe detail view

- Header: recipe title, back button, Edit action button
- Ingredients section labeled "INGREDIENTS"
- Ingredients displayed in saved order, not sorted
- Optional ingredients show an "optional" badge
- Ingredients with substitutions show a chevron — tapping opens substitutions modal
- Ingredient display: qty in primary color, name in default text color
- Add to Shopping List button — green when recipe is in list, primary color otherwise
- Button text: "+ Add to Shopping List" / "✓ In Shopping List"
- Choose Ingredients button always present for partial adds
- Notes section (14px, pre-wrap) — only shown if notes exist, rendered below buttons
- If recipe ID not found, redirect to recipes list

---

## Recipe edit view

- Header: "New Recipe" (new) or "Edit Recipe" (existing)
- Title input, notes textarea (non-resizable, min-height 80px)
- All inputs 16px font
- Two ingredient entry modes toggled in the header: Paste Text | Manual
- Default mode is Paste Text

### Manual mode
- One row per ingredient: qty input (52px), unit input (72px), name input (flex)
- Expand button (⋯) toggles a details panel: optional toggle, range qty input,
  substitution rows
- Each substitution row: qty input, unit input, name input, remove button
- Add substitution button within the details panel
- Remove button (×) on each ingredient row
- Details panel auto-opens if ingredient has optional=true, substitutions,
  or a range qty
- Add Ingredient button appends a new row and focuses its name input
- Rows with empty name are skipped on save

### Paste Text mode
- Large textarea (min-height 180px) for pasting recipe text
- Switching Manual → Paste: serializes existing rows to text
- Switching Paste → Manual: parses textarea, toasts count of parsed ingredients
- Saving in Paste mode: parses textarea directly before saving

### Save behavior
- Title is required — empty title shows toast and does not save
- Save button shows "Saving..." and is disabled during save
- On success: navigates to recipes list
- If recipe is in shopping list, rebuilds its shopping list contribution on save

### Delete
- Only shown when editing an existing recipe
- Native confirm dialog: "Delete this recipe?"
- If recipe is in shopping list, removes its contribution before navigating away
- On success: navigates to recipes list

---

## Ingredient parser

Used in Paste Text mode and the Add Item modal on the shopping list.

- Handles bullet markers: -, –, —, •, *, · followed by space
- Handles numbered list markers: "1. " or "1) "
- Replaces unicode fractions with slash fractions before parsing
- Qty extraction order: "X to Y" range → "X-Y" range → mixed number →
  fraction → decimal → a/an → empty
- Unit matched against known units list (singular and plural forms)
- Strips "of" connector: "2 cups of flour" → name = "flour"
- Detects substitutions: "(or ...)", "sub:", "substitute:", "alt:",
  "alternative:", " or " within name. Substitutions parsed to
  { qty, unit, name } — not plain strings.
- Detects optional: "(optional)", "if desired", "if using", "optional:" prefix,
  ", optional" suffix
- Removes trailing "to taste", "or to taste", "as needed", "as required"
- Removes remaining parenthetical notes
- Filters prep descriptors (chopped, diced, etc.) from comma-split parts
- Comma splitting skips commas between digits (preserves "1,000g")
- Lines with substitution markers are not comma-split
- Returns null for lines that parse to nothing

---

## Substitutions modal

- Bottom sheet style overlay
- Max-height 70vh, scrollable
- Header: ingredient name + "Substitutions" label
- Footer: Close button (full width)
- Tapping backdrop closes modal

### In recipe detail view
- Substitutions shown as informational list
- Each row: qty unit name (qty displays as ~ if empty)

### In shopping list view
- Substitutions shown as interactive rows with circular checkboxes
- Tapping a substitution: marks item checked, sets substitutedWith,
  closes modal, shows "Using: X" toast

---

## Import / Export

### Export
- Generates JSON: `{ version: 1, exportedAt, app: "nf4lm", recipes[] }`
- Filename: `nf4lm-v1-YYYY-MM-DD.json`
- Each recipe includes: id, title, notes, ingredients, createdAt, updatedAt
- Toast "No recipes to export" if list is empty

### Import
- Reads JSON file, validates data.recipes is an array
- Validates version field — warns if missing or not 1
- Skips recipes without a non-empty title
- Deduplication by title (exact match, trimmed) — skips existing titles
- If issues found: shows confirmation dialog listing issues before proceeding
- Preserves original createdAt from backup
- Sequential POST /recipes calls — no rollback on partial failure
- Toast with count and skipped count on completion
