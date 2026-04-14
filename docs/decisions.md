# Architecture Decisions

## Stack

- **Frontend: React + Vite.**
  Minimal learning gap from vanilla JS original while gaining proper module
  bundling and dev tooling.

- **Backend: FastAPI + SQLite.**
  Same backend stack as existing app, self-hosted on DigitalOcean. SQLite is
  sufficient for a small known-user group.

- **Auth: Better Auth with magic link / OTP.**
  No passwords. Users live in our own SQLite DB — no hosted identity system,
  easy to migrate if needed.

- **Email: Resend.**
  Warmed sending infrastructure, simple API, free tier.

- **Hosting: DigitalOcean App Platform.**
  Existing infrastructure, auto-deploys on push to main, preview URLs per PR,
  HTTPS out of the box.

- **Realtime: SSE scoped to shopping lists only.**
  Recipes are refresh-on-demand. WebSockets considered and rejected as overkill
  for this scale.

## Deferred

- **Offline capability (service worker data caching):** v2
- **App store wrapping (PWABuilder / Capacitor):** after offline is solid
