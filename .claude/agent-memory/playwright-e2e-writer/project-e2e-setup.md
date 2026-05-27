---
name: project-e2e-setup
description: Playwright E2E configuration, test DB setup, and auth seeding patterns for the ticket-system monorepo
metadata:
  type: project
---

Playwright 1.60 is configured at `playwright.config.ts` (monorepo root). Tests live in `e2e/`. Run with `bun run test:e2e`.

**Config highlights:**
- `testDir: './e2e'`, `globalSetup: './e2e/global-setup.ts'`
- `fullyParallel: true`, Chromium only
- Two webServers: server (`NODE_ENV=test`, port 3000) and client (port 5173)
- `reuseExistingServer: !process.env.CI`

**Test database:** `helpdesk_test` (PostgreSQL). Connection string: `postgresql://postgres:Esan1@localhost:5432/helpdesk_test`.

**global-setup.ts** (`e2e/global-setup.ts`):
1. Creates `helpdesk_test` DB via `server/scripts/create-test-db.ts`
2. Runs Prisma migrations via `bunx prisma migrate deploy`
3. Seeds admin user via `bun run prisma/seed.ts` (requires `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `BETTER_AUTH_SECRET` in env)
4. Seeds agent user via `bun run prisma/seed-agent.ts` (requires `SEED_AGENT_EMAIL`, `SEED_AGENT_PASSWORD`)
5. Creates `e2e/.auth/` directory for storageState files

**Seeding approach:** A separate betterAuth instance with `disableSignUp: false` is used in both seed scripts so that passwords are hashed correctly. The main auth instance has sign-up disabled.

**Rate limiting:** Only active in `NODE_ENV=production`. Tests run under `NODE_ENV=test` so no rate limit.

**Why:** Global setup runs before webServers start, so it cannot call the running server. Users must be seeded via direct Prisma + betterAuth API calls, not via HTTP.

**How to apply:** Any new test user roles need a new seed script following the `seed-agent.ts` pattern, added to `global-setup.ts`, and documented in `server/package.json` as a script.

**Ticket seed:** `server/prisma/seed-tickets.ts` — creates 3 test tickets via direct Prisma (no betterAuth needed). Idempotent: checks for existing subject before creating. Runs after user seeds in `global-setup.ts`. Ticket model requires `createdAt` and `updatedAt` to be supplied explicitly (no `@default` in schema).
