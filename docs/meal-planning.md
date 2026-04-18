# Meal planning design — nf4lm

---

## Overview

Meal planning consists of two parts:
- The bin: a staging area of recipes available to be planned
- The plan: meals assigned to specific dates

Both the bin and the plan are per-context — separate for personal and per-household.

---

## The bin

The bin holds recipes that have been added to the shopping list and are
available for meal planning.

### Bin entry lifecycle
- Recipe added to shopping list → entry created in bin
- Recipe removed from shopping list (any removal, including partial ingredient
  select removal) → entry removed from bin
- Shopping list Clear All → bin entries for recipes with unchecked items are
  removed from bin, same as recipe removal from shopping list
- Shopping list Clear Done → bin entries are NOT affected
- Recipe assigned to a meal in the plan → entry removed from bin
- Entry not assigned within 10 days of being added → expires and is removed
- Same recipe cannot appear in the bin twice — manual re-add required after
  expiry or removal

### Bin entry structure
```json
{
  "id": "uuid",
  "recipe_id": "string",
  "added_at": "ISO 8601",
  "expires_at": "ISO 8601"
}
```

---

## Meal structure

A meal is a named event assigned to a date. It can consist of multiple recipes.

```json
{
  "id": "uuid",
  "name": "string",
  "date": "ISO 8601 date",
  "recipes": ["recipe_id"],
  "assigned_to": ["user_id"],
  "persistent": false,
  "created_by": "user_id",
  "created_at": "ISO 8601"
}
```

- `name` — display label only, does not affect any other behavior
- `recipes` — one or more recipe IDs
- `assigned_to` — members assigned to cook. Any member can assign any member.
  No limit on assignments.
- `persistent` — if true, the meal is never automatically deleted from the DB.
  If false, the meal is deleted one month after its scheduled date.

---

## Creating a meal

- User selects a recipe from the bin
- User gives the meal a name
- User selects a date (defaults to today)
- User can add additional recipes from the bin to the same meal
- User can assign members
- For each recipe being added to the meal, user is prompted:
  - Add all ingredients to shopping list
  - Select ingredients (reuses ingredient select feature)
  - Neither
- Recipe(s) move from bin to plan on confirmation

---

## Editing a meal

- Meal name editable at any time
- Date editable at any time
- Members assignable or removable at any time
- Recipes can be added (from bin) or removed from a meal
- Persistent toggle editable at any time
- Persistent toggle shows subtle helper text:
  "Unchecked meals will be erased one month after their scheduled date."

---

## Removing a meal

- For each recipe in the meal, if that recipe has unchecked ingredients
  in the shopping list, the user is prompted with three options:
  1. Remove the recipe's qty contribution from the shopping list
  2. Keep the shopping list as-is
  3. Remove the ingredient entries entirely
  (Reuses the same prompt as recipe removal from the shopping list.
  If a qty was manually edited, default behavior from shopping-list.md applies.)
- Prompts shown one per recipe, not all at once

---

## The 7-day view

- Primary planning view
- Leftmost day is always today — the view shifts daily
- Seven columns, one per day, showing meals scheduled on each date
- Most frictionless use: plan for the coming weekdays without leaving this view
- Each day shows all meals scheduled for that date
- Tapping a meal opens its detail / edit view
- A button to expand into the full calendar view

---

## Full calendar view

- Full month calendar
- User can navigate to any month
- Shows meals on their scheduled dates
- Can go back up to one month to review past meals
- Past meals older than one month are automatically deleted unless persistent
- Used for planning further ahead or reviewing recent history

---

## Automatic cleanup

- Meals older than one month from their scheduled date are deleted silently
  unless `persistent` is true
- Cleanup happens server-side, no user-facing indication
- Persistent meals are never automatically deleted regardless of age

---

## Data model

### New tables

```sql
CREATE TABLE IF NOT EXISTS meal_plan (
  id TEXT PRIMARY KEY,
  context_type TEXT NOT NULL CHECK (context_type IN ('personal', 'household')),
  context_id TEXT NOT NULL,
  name TEXT NOT NULL,
  planned_date TEXT NOT NULL,
  persistent INTEGER DEFAULT 0,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meal_plan_recipes (
  meal_plan_id TEXT NOT NULL REFERENCES meal_plan(id),
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  PRIMARY KEY (meal_plan_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS meal_plan_members (
  meal_plan_id TEXT NOT NULL REFERENCES meal_plan(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (meal_plan_id, user_id)
);

CREATE TABLE IF NOT EXISTS meal_plan_bin (
  id TEXT PRIMARY KEY,
  context_type TEXT NOT NULL CHECK (context_type IN ('personal', 'household')),
  context_id TEXT NOT NULL,
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  added_by TEXT NOT NULL REFERENCES users(id),
  added_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
```

### Notes
- `context_type` and `context_id` together identify whether a meal or bin
  entry belongs to a personal list (context_id = user_id) or a household
  (context_id = household_id). This avoids duplicating tables for each context.
- Bin uniqueness enforced at application level: same recipe cannot appear
  twice in the same context.
