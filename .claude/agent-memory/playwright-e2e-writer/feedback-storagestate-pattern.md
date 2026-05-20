---
name: feedback-storagestate-pattern
description: How storageState and session setup is implemented in auth.spec.ts without modifying playwright.config.ts
metadata:
  type: feedback
---

A top-level `test.beforeAll` (not inside any describe) is used to sign in as admin and agent via the REST API (`POST /api/auth/sign-in/email`) using the `request` fixture, then saves each session with `request.storageState({ path })` to `e2e/.auth/admin.json` and `e2e/.auth/agent.json`.

Authenticated describe blocks then use `test.use({ storageState: PATH })` to load the pre-saved session for every test in that block.

**Why:** Using a top-level `test.beforeAll` ensures it runs once per worker before any test in the file, so storageState files are always ready when `test.use({ storageState })` needs them. Putting setup inside a describe block would create a potential race condition with `fullyParallel: true` across workers.

**How to apply:** Any new spec file that needs authenticated sessions should follow this same pattern: top-level `beforeAll` with `request` fixture to sign in + save state, then `test.use({ storageState })` in each authenticated describe.

Note: `test.use({ storageState })` inside a describe block scopes the storageState to that describe only, so different roles can be tested in the same file without interference. Each test in an authenticated block gets a fresh context loaded with that storageState.
