---
name: feedback-api-calls-in-beforeall
description: How to make authenticated API calls in test beforeAll hooks without re-signing-in
metadata:
  type: feedback
---

Do NOT try to sign in again via the `request` fixture inside `beforeAll` in a spec that uses `test.use({ storageState })`. Better Auth requires an `Origin: http://localhost:5173` header on sign-in requests (trustedOrigins check), and the Playwright `request` fixture does not always send the right origin when called from `beforeAll`.

Instead, read the already-written storageState file from disk (`fs.readFileSync(ADMIN_STATE, "utf-8")`), extract the session cookies, and use native `fetch()` with a `Cookie` header to make authenticated API calls.

**Why:** The admin storageState is always written by `auth.setup.ts` before any test runs. Re-signing in from `beforeAll` creates a new session unnecessarily and fails with 403 when the Origin header is missing.

**How to apply:** Any `beforeAll` that needs to call the API (e.g., seeding test data) should use `getAdminCookieHeaderFromState()` + native `fetch()` rather than the Playwright `request` fixture for authentication. The pattern is in `e2e/users.spec.ts`.

Also include `Origin: http://localhost:5173` in all direct `fetch()` calls to the server, since Better Auth validates it on every authenticated request.

See [[storageState-pattern]] for the per-test auth context setup.
