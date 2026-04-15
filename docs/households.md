# Household design — nf4lm

This document captures all design decisions made for the household feature.
Parties are a separate feature and are not covered here.

---

## Users

- Avatar: letter + color picker, stored per user
- Alias per household — set on join, editable any time after
- Alias is per household, not global (user can have different alias in each household)
- Alias falls back to email address if not set

---

## Households

- Name editable by owner
- One owner at a time
- Owner can generate invite links — single-use, expire after 7 days
- Owner can remove members — removal automatically unshares their recipes from the household
- Owner transfers ownership explicitly by choosing a member
- Fallback: if owner account is deleted or deactivated, oldest member by joined_at is promoted automatically
- If no other members exist when owner is deleted, household is deleted

---

## Recipes

- Each user has a private recipe masterlist
- Members can share any of their masterlist recipes into a household
- Members can unshare at any time
- Shared recipes are displayed with the sharer's household alias
- Any member can save a household recipe to their own masterlist — this creates a copy
- Copied recipes carry an immutable tag: "from [alias]" — alias is captured at time of copy, does not update if original owner changes their alias
- Activity log deferred to a later version but designed to be addable

---

## Shopping list

- One shared shopping list per household
- Any member can add or remove items
- Items can be assigned to any number of members (not exclusive)
- No limit on assignments per item

---

## Meal plan bin

The bin is a staging area of recipes available for meal planning.

Rules:
- Recipe added to shopping list → enters bin
- Recipe removed from shopping list → leaves bin
- Recipe assigned to a meal plan date → leaves bin
- Recipe expires from bin 10 days after it was added to the shopping list
- Same recipe cannot appear in the bin twice — manual re-add required after expiry or removal
- Bin entries have a created_at timestamp for expiry calculation

---

## Meal planning

- Rolling 7-day lookahead as the primary view
- Freeform date selection when assigning a recipe to a day (not limited to the 7-day window)
- Multiple meals can be planned on the same day
- Multiple members can be assigned to a single meal (collaborative cooking)
- No limit on members per meal

### Adding a recipe to the meal plan

- User selects a recipe from the bin
- Prompted: add all ingredients to shopping list, select ingredients, or neither
- Ingredient select reuses the existing ingredient select feature once implemented
- Recipe moves from bin to meal plan on confirmation

---

## Data model

### New tables

```sql
CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS household_members (
  household_id TEXT NOT NULL REFERENCES households(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  alias TEXT,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (household_id, user_id)
);

CREATE TABLE IF NOT EXISTS household_invites (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_by_user_id TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS household_recipes (
  household_id TEXT NOT NULL REFERENCES households(id),
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  shared_by_user_id TEXT NOT NULL REFERENCES users(id),
  shared_at TEXT NOT NULL,
  PRIMARY KEY (household_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS meal_plan (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  planned_date TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meal_plan_members (
  meal_plan_id TEXT NOT NULL REFERENCES meal_plan(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (meal_plan_id, user_id)
);

CREATE TABLE IF NOT EXISTS meal_plan_bin (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  added_by TEXT NOT NULL REFERENCES users(id),
  added_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
```

### Modified tables

shopping_list items need two new columns:
- `assigned_to` TEXT DEFAULT '[]'  -- JSON array of user_ids
- `household_id` TEXT REFERENCES households(id)  -- null for personal lists

recipes table needs two new columns:
- `copied_from_user_id` TEXT  -- null if original, set if copied from household
- `copied_from_alias` TEXT    -- alias of original owner at time of copy, immutable

users table needs two new columns:
- `avatar_letter` TEXT        -- single character
- `avatar_color` TEXT         -- hex color string

---

## Open questions

- Parties: separate feature, largely similar to households but with copy semantics
  for recipes and different privacy functions. Not designed yet.
- Account deletion: fallback ownership transfer is designed but account deletion
  as a user-facing feature is not yet decided.
