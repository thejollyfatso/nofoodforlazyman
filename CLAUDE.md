# CLAUDE.md — No Food for Lazy Man (nf4lm)

Full feature reference: `docs/reference-spec.md`
Architectural decisions: `docs/decisions.md`

---

## What this app is

A recipe manager and shared shopping list PWA for a small group of known users
(family and friends). Not a public product. Greenfield rebuild of an existing
single-user vanilla JS app. Simplicity and fidelity to the original UX are
the priorities.

---

## Stack

| Layer      | Choice                                                       |
|------------|--------------------------------------------------------------|
| Frontend   | React + Vite                                                 |
| Backend    | FastAPI (Python) + SQLite, self-hosted on DigitalOcean       |
| Auth       | Better Auth — magic link / OTP email only, no passwords      |
| Email      | Resend                                                       |
| Hosting    | DigitalOcean Droplet — systemd service, SSH deploy via CI    |
| Realtime   | SSE (Server-Sent Events) — shopping lists only               |
| PWA        | vite-plugin-pwa — installable, manifest, service worker stub |

Frontend and static assets are served by the same FastAPI server in production
(same origin). Vite dev proxy handles this locally. CORS middleware is present
in main.py, scoped to `https://nf4lm.deleonanddeleon.com`.
SQLite file lives on the DigitalOcean Droplet. No external database service.

---

## Environments

| Name        | Purpose                                                         |
|-------------|-----------------------------------------------------------------|
| `local`     | `npm run dev` (client/) + `uvicorn` (server/)                   |
| `production`| SSH deploy on push to `main` → https://nf4lm.deleonanddeleon.com |

---

## Repo structure

```
nf4lm/
├── .github/workflows/ci.yml
├── client/                  React + Vite frontend
│   └── src/
│       ├── components/
│       ├── views/           One file per view
│       ├── hooks/
│       ├── utils/           apiFetch, formatQty, normalizeIngredientName, parser
│       └── state/           App state — no external state library
├── server/                  FastAPI backend
│   ├── routers/             auth.py, recipes.py, shopping.py, events.py
│   ├── tests/
│   ├── db.py                SQLite connection + schema init
│   └── main.py
├── docs/
│   ├── reference-spec.md
│   ├── decisions.md
│   └── server-setup.md      One-time systemd + Droplet setup instructions
├── .env.example
├── makefile
├── requirements.txt
├── requirements-dev.txt
└── CLAUDE.md
```

---

## Conventions

### Frontend

- No client-side router. View switching via React state only.
- No external state library. A single `useAppState` hook owns all app state.
- All API calls go through `apiFetch(path, options)` — never call `fetch` directly.
- `apiFetch` prepends `apiConfig.baseUrl`, attaches `Authorization: Bearer {token}`,
  throws on non-2xx, and triggers logout on 401.
- Auth token stored in `localStorage` as `mk_token`.
- All qty formatting goes through `formatQty()` — never format inline.
- All ingredient name comparisons go through `normalizeIngredientName()`.
- Font size on all text inputs must be 16px minimum (prevents iOS zoom on focus).
- No hover states — mobile-first, use `:active` only.

### Backend

- Every DB query must be scoped to `current_user.id` — no exceptions.
- Auth middleware runs on every protected route before any DB access.
- Shopping writes are always full rewrites (DELETE-all + INSERT-all in one
  transaction). Check/uncheck and substitution are the only PATCH operations.
- SSE endpoint (`/events`) is never cached by the service worker.

### Naming

- Views: `PascalCase` components in `client/src/views/`
- Utils: `camelCase` functions in `client/src/utils/`
- API routes: snake_case, match the original API contract exactly
- DB columns: snake_case

### Definition of done for frontend work

After any frontend change, run `npm run lint` inside `client/` and fix all
errors before reporting the task complete. A build that passes TypeScript/Vite
but fails lint is not done.

### What NOT to do

- Do not use a client-side router
- Do not use a state management library
- Do not add hover states
- Do not make DB queries without `user_id` scoping
- Do not cache `/events` in the service worker

---

## Design tokens (must match original app exactly)

```css
--color-primary:       #E8623A;
--color-primary-dark:  #C4512F;
--color-primary-light: #FBE9E3;
--color-bg:            #FAF8F5;
--color-border:        #E5E0D8;
--color-danger:        #EF4444;
--color-checked:       #9CA3AF;
--color-in-list:       #10B981;

--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;

font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial;
-webkit-font-smoothing: antialiased;
```

---

## API contract

```
POST   /auth/magic       { email } → sends OTP, no auth required
POST   /auth/verify      { email, code } → { token }

GET    /recipes          → recipe[] ordered by created_at DESC
POST   /recipes          → create → returns new recipe
PATCH  /recipes/{id}     → update fields → returns updated recipe
DELETE /recipes/{id}     → 204

GET    /shopping         → { items: [...], meta: { addedRecipeIds,
                             manualItems, suppressedItems, qtyOverrides } }
POST   /shopping         → full rewrite; body: { items, addedRecipeIds,
                             manualItems, suppressedItems, qtyOverrides }
PATCH  /shopping/{id}    → { checked?, substitutedWith? }

GET    /events           → SSE stream; events: recipes_changed, shopping_changed
GET    /health           → { ok: true, app: "nf4lm" }
```

---

## Known bugs to fix (do not port from old app)

- Search bar CSS uses undefined variables (`var(--border)`, `var(--surface)`,
  `var(--text)`, `var(--primary)`) — use correct tokens from the palette above.
- `apple-touch-icon` points to `icon.svg` — add a PNG fallback for older iOS.

---

## Deferred to v2

- Offline capability (service worker data caching)
- App store wrapping (PWABuilder / Capacitor)
