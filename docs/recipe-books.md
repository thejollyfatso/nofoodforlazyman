# Recipe books design — nf4lm

---

## Overview

Users can organize their recipes into named recipe books. Books are
user-owned — they live on a user's personal masterlist, not on a household.
A recipe can belong to any number of books simultaneously. Books do not
affect recipe data in any way; they are purely organizational containers.

---

## Creating and managing books

- A user can create as many recipe books as they want
- Each book has a name (required) and an optional description
- Books are created, renamed, and deleted from within the recipes section
- Deleting a book does not delete the recipes inside it — recipes remain
  on the user's personal masterlist
- A recipe can be added to or removed from any book at any time from the
  recipe detail view or from within the book's filtered view
- Adding a recipe to a book does not create a copy — the same recipe
  instance appears in every book it belongs to and on the masterlist

---

## Recipe view toggle: Books / Recipes

In the recipes section, a Books / Recipes toggle appears above the existing
grouped / mixed toggle.

**Recipes mode (default):** existing behavior unchanged — full recipe
masterlist with grouped / mixed and search.

**Books mode:** the same recipes section now shows books instead of the flat
recipe list. Selecting a book filters the recipe list to only that book's
recipes. The grouped / mixed toggle still applies in Books mode — grouped
organizes books by member (in a household context), mixed shows all books
together regardless of owner.

There is no separate books page or route. Everything happens within the
existing recipes section.

The Books / Recipes toggle state is persisted per session.

---

## Sharing recipe books

Recipe books can be shared into households alongside individual recipes.
Sharing a book shares it as a container — household members see the book
as a book, not a flat list of its recipes merged into the household recipe
list.

Sharing behavior follows the same rules as recipe sharing:

- The owner can share and unshare a book at any time
- Shared books are references — if the owner adds or removes recipes from
  the book, the household view reflects that immediately
- When a book is unshared, it disappears entirely from the household view
  with no trace
- Non-owners have read-only access to a shared book and its contents
- Secret ingredient obfuscation settings on individual recipes still apply
  within shared books

A book being shared does not automatically share its recipes on the
household recipe masterlist — they are only accessible via the book. If the
owner also wants a recipe to appear on the household masterlist directly,
they share it individually as before.

The sharing UI gains a Books section alongside the existing Recipes section.
Both can be checked independently — sharing a recipe individually and also
including it in a shared book are independent and do not affect each other.

---

## Household recipe view in Books mode

When a household member switches to Books mode, they see books shared by
any household member. The grouped / mixed toggle applies the same way it
does for recipes. Each book shows the sharer's avatar alongside the book
name. Selecting a shared book filters to that book's recipes with the same
read-only behavior as individual shared recipes.

---

## Data model notes

- A `recipe_books` table: `id`, `owner_user_id`, `name`, `description`,
  `created_at`, `updated_at`
- A `recipe_book_recipes` join table: `book_id`, `recipe_id` (many-to-many,
  FK cascade delete so removing a recipe cleans up memberships automatically)
- A `household_shared_books` table analogous to `household_shared_recipes`:
  `book_id`, `household_id`, `shared_by_user_id`
- Obfuscation is not set at the book level — it remains per-recipe as
  defined in recipe-sharing.md
