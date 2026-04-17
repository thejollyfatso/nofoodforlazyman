# Recipe sharing design — nf4lm

---

## Overview

Users can share recipes from their personal masterlist into households they
belong to. Shared recipes are references — edits to the original propagate
to the household view immediately. Non-owners have read-only access.

---

## Sharing & unsharing

- Any member can share any recipe from their personal masterlist into a household
- Any member can unshare their own recipes at any time
- When a recipe is unshared:
  - Removed from the household recipe list
  - Removed from the household shopping list if present
  - Removed from the meal plan and meal plan bin if present
  - No trace remains in any household context

---

## Household recipe list view

- Shows all shared recipes from all members
- Toggle between grouped view (grouped by member) and mixed view (all together)
- Same search behavior as personal recipe list: title search and ingredient
  search with fuzzy matching, All / Any split
- Each recipe card shows the sharer's avatar alongside the recipe title
  in both grouped and mixed views

---

## Household recipe detail view

- Identical to personal recipe detail view
- Sharer's avatar appears next to the recipe title
- Non-owners see the recipe read-only — no Edit button
- Secret ingredients: visibility depends on the sharing owner's obfuscation
  setting (see below)

---

## Secret ingredients

Each shared recipe has an obfuscation setting controlled by the sharing owner:

- **Obfuscation off (default):** all ingredients including secret ones are
  visible to all household members
- **Obfuscation on:** secret ingredients are hidden from non-owners entirely.
  The owner always sees their own secret ingredients regardless of setting.

### Secret ingredients on the shopping list

- When any member adds a shared recipe to the shopping list and obfuscation
  is on, secret ingredients are added to the list but only visible to the
  sharing owner
- Secret items are visually marked with a symbol in the shopping list so the
  owner can identify them at a glance
- When the ingredient assignment feature is implemented, secret ingredients
  will be auto-assigned persistently to the owner
- Non-owners do not see secret items in the list at all — not even a placeholder

---

## Write access

- Non-owners cannot edit shared recipes
- Any member (including non-owners) can add a shared recipe to the household
  shopping list
- Any member can use Choose Ingredients for partial adds of a shared recipe

---

## Data model

### New tables

```sql
CREATE TABLE IF NOT EXISTS household_recipes (
  household_id TEXT NOT NULL REFERENCES households(id),
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  shared_by_user_id TEXT NOT NULL REFERENCES users(id),
  shared_at TEXT NOT NULL,
  obfuscate_secrets INTEGER DEFAULT 0,
  PRIMARY KEY (household_id, recipe_id)
);
```

### Notes
- `obfuscate_secrets` is per household_recipe row — the same recipe shared
  into two different households can have different obfuscation settings
- Secret ingredient visibility is enforced server-side — secret ingredients
  are stripped from responses for non-owners when obfuscation is on
- The `secret` flag lives on the ingredient object inside the recipe's
  ingredients JSON column (see docs/recipes.md)
