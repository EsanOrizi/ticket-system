# Memory Index

- [E2E Setup & DB Seeding](project-e2e-setup.md) — Playwright config, globalSetup, test DB, admin/agent seed scripts
- [Auth Selectors & Landmarks](project-auth-selectors.md) — Reliable selectors for all pages/modals; data-testid attributes added to UsersPage
- [storageState Pattern](feedback-storagestate-pattern.md) — Top-level beforeAll + test.use() pattern for multi-role auth tests without config changes
- [API Calls in beforeAll](feedback-api-calls-in-beforeall.md) — Read storageState from disk + native fetch() instead of re-signing in; add Origin header
- [Migration Gap Fix](project-migration-state.md) — deletedAt column was missing from test DB; fixed with prisma migrate dev + resolve --applied
