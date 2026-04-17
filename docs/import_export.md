# Import / Export design — nf4lm

---

## Export

- Generates JSON: `{ version: 1, exportedAt, app: "nf4lm", recipes[] }`
- Filename: `nf4lm-v1-YYYY-MM-DD.json`
- Each recipe includes: id, title, notes, ingredients, createdAt, updatedAt
- Ingredients exported in full object format including qty, unit, name,
  substitutions, optional, secret
- Toast "No recipes to export" if list is empty

---

## Import

- Reads JSON file, validates `data.recipes` is an array
- Validates version field — warns if missing or not 1
- Validates app field — expects `nf4lm`. Any other value (including `nfflm`
  and `mamas-kitchen` from older versions of this app) is treated as
  unrecognized format and surfaced in the issues dialog before proceeding.
  The recipe data may still be valid and the user can choose to import anyway.
- Skips recipes without a non-empty title
- Deduplication by title (exact match, trimmed) — skips existing titles
- If any issues found (version mismatch, unrecognized app, skipped recipes):
  shows confirmation dialog listing all issues before proceeding
- Preserves original createdAt from backup
- Sequential POST /recipes calls — no rollback on partial failure
- Toast with count and skipped count on completion

### Handling older format data

When importing files from older app versions, apply these defaults:

- `secret` flag missing on ingredients — default to `false`
- `substitutions` as plain strings (older format) — convert each string to
  `{ qty: "", unit: "", name: string }` on import
- Both conversions are silent — not listed as issues in the dialog
