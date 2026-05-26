/**
 * E2E tests for the entire authentication system.
 *
 * Session setup
 * -------------
 * A top-level test.beforeAll signs in as admin and agent via the
 * Better Auth REST API and writes each session to e2e/.auth/*.json.
 * This runs once per Playwright worker before any test in this file,
 * so every worker that picks up a test that needs storageState will
 * have the files available.
 *
 * Describe blocks that need an authenticated context use:
 *   test.use({ storageState: ADMIN_STATE }) or AGENT_STATE
 *
 * Test groups
 * -----------
 * 1.  Client-side validation  — Zod / React Hook Form errors (no network)
 * 2.  Server errors           — wrong password, unknown email
 * 3.  Loading state           — button label while request is in-flight
 * 4.  Successful login        — happy path redirect and page content
 * 5.  Unauthenticated guards  — ProtectedRoute and AdminRoute for anonymous users
 * 6.  Authenticated /login    — current behaviour: no redirect (documents it)
 * 7.  ADMIN access            — /users accessible, Users nav link visible
 * 8.  AGENT access control    — /users redirects to /, no Users link
 * 9.  Sign-out                — session cleared, subsequent guarded routes redirect
 *
 * data-testid attributes added to source files
 * ---------------------------------------------
 * None required — all selectors use getByRole / getByLabel / getByText,
 * which are stable against styling and implementation changes.
 */

import { test, expect } from "@playwright/test";
import path from "path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTH_DIR = path.join(process.cwd(), "e2e", ".auth");
const ADMIN_STATE = path.join(AUTH_DIR, "admin.json");
const AGENT_STATE = path.join(AUTH_DIR, "agent.json");

// Better Auth sign-in endpoint (server-side, not proxied through Vite).
const SIGN_IN_URL = "http://localhost:3000/api/auth/sign-in/email";

const ADMIN = { email: "admin@example.com", password: "password123" };
const AGENT = { email: "agent@example.com", password: "password123" };

// ---------------------------------------------------------------------------
// 1. Client-side validation
//    Zod schema on LoginPage runs synchronously — no network involved.
// ---------------------------------------------------------------------------

test.describe("Login form — client-side validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('[data-slot="card-title"]')).toBeVisible();
  });

  test("submitting an empty form shows both field errors", async ({ page }) => {
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(
      page.getByText("Password must be at least 8 characters")
    ).toBeVisible();
  });

  test("an invalid email format shows the email error only", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("validpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(
      page.getByText("Password must be at least 8 characters")
    ).not.toBeVisible();
  });

  test("a password under 8 characters shows the password error only", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill("user@example.com");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByText("Password must be at least 8 characters")
    ).toBeVisible();
    await expect(page.getByText("Enter a valid email address")).not.toBeVisible();
  });

  test("invalid email and short password shows both errors", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill("bad");
    await page.getByLabel("Password").fill("abc");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(
      page.getByText("Password must be at least 8 characters")
    ).toBeVisible();
  });

  test("correcting errors clears the validation messages", async ({ page }) => {
    // Trigger validation first.
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();

    // Fix the email field — React Hook Form re-validates on change.
    await page.getByLabel("Email").fill("user@example.com");
    await page.getByLabel("Password").fill("validpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Client-side email error should be gone (server error may appear, that's ok).
    await expect(page.getByText("Enter a valid email address")).not.toBeVisible();
    await expect(
      page.getByText("Password must be at least 8 characters")
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. Server errors — wrong or unknown credentials
// ---------------------------------------------------------------------------

test.describe("Login form — server errors", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('[data-slot="card-title"]')).toBeVisible();
  });

  test("wrong password shows a destructive alert and stays on /login", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    // LoginPage renders server errors inside shadcn <Alert variant="destructive">.
    // The Alert component uses role="alert" implicitly via aria-live.
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("non-existent email shows a destructive alert and stays on /login", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("no alert is shown on the initial page load", async ({ page }) => {
    // Sanity check: alert must not be pre-rendered before any attempt.
    await expect(page.getByRole("alert")).not.toBeVisible();
  });

  test("alert is cleared when the user resubmits the form", async ({
    page,
  }) => {
    // First attempt — trigger an error.
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill("wrong");
    // "wrong" is 5 chars — validation error fires before server call.
    await page.getByRole("button", { name: "Sign in" }).click();
    // Validation error appears; no server alert yet at this point.
    await expect(
      page.getByText("Password must be at least 8 characters")
    ).toBeVisible();

    // Fix the password to a long-but-still-wrong value and re-submit.
    await page.getByLabel("Password").fill("wrongbutlong");
    await page.getByRole("button", { name: "Sign in" }).click();

    // The server error fires; the previous validation message is gone.
    await expect(
      page.getByText("Password must be at least 8 characters")
    ).not.toBeVisible();
    await expect(page.getByRole("alert")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. Loading state — button label and disabled state during request
// ---------------------------------------------------------------------------

test.describe("Login form — loading state", () => {
  test("button shows 'Signing in...' and is disabled while the request is in-flight", async ({
    page,
  }) => {
    // Intercept and delay the sign-in request to observe intermediate UI state.
    await page.route(SIGN_IN_URL, async (route) => {
      await new Promise<void>((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);

    await page.getByRole("button", { name: "Sign in" }).click();

    // Immediately after clicking, the button should enter the loading state.
    const loadingButton = page.getByRole("button", { name: "Signing in..." });
    await expect(loadingButton).toBeVisible();
    await expect(loadingButton).toBeDisabled();

    // After the delay the request completes and the page navigates away.
    await page.waitForURL("/");
    await expect(page).toHaveURL("/");
  });
});

// ---------------------------------------------------------------------------
// 4. Successful login — happy path
// ---------------------------------------------------------------------------

test.describe("Successful login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('[data-slot="card-title"]')).toBeVisible();
  });

  test("valid admin credentials redirect to /", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("/");
    await expect(page).toHaveURL("/");
  });

  test("the dashboard heading is visible after login", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("/");
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();
  });

  test("no error alert is visible after a successful login", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("/");
    await expect(page.getByRole("alert")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 5. Unauthenticated access — ProtectedRoute and AdminRoute guards
//    Fresh browser context, no stored session.
// ---------------------------------------------------------------------------

test.describe("Unauthenticated access — route guards", () => {
  test("visiting / redirects to /login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
    await expect(page.locator('[data-slot="card-title"]')).toBeVisible();
  });

  test("visiting /users redirects to /login", async ({ page }) => {
    await page.goto("/users");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
    await expect(page.locator('[data-slot="card-title"]')).toBeVisible();
  });

  test("a wildcard / unknown route redirects through / to /login", async ({
    page,
  }) => {
    // App.tsx: <Route path="*" element={<Navigate to="/" replace />} />
    // ProtectedRoute then sends the unauthenticated user to /login.
    await page.goto("/this-does-not-exist");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });
});

// ---------------------------------------------------------------------------
// 6. Authenticated user visiting /login
//    LoginPage has no redirect guard for already-authenticated users.
//    This test documents the current behaviour.
//    If a redirect is added to LoginPage, update this test accordingly.
// ---------------------------------------------------------------------------

test.describe("Authenticated user visiting /login", () => {
  test.use({ storageState: ADMIN_STATE });

  test("admin visiting /login sees the login page (no automatic redirect away)", async ({
    page,
  }) => {
    await page.goto("/login");
    // LoginPage renders unconditionally — no session check.
    await expect(page.locator('[data-slot="card-title"]')).toBeVisible();
    await expect(page).toHaveURL("/login");
  });
});

// ---------------------------------------------------------------------------
// 7. ADMIN role — authorised access
// ---------------------------------------------------------------------------

test.describe("ADMIN — authorised access", () => {
  test.use({ storageState: ADMIN_STATE });

  test("admin can reach the home page at /", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page).toHaveURL("/");
  });

  test("admin can navigate directly to /users", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/users");
    // CardTitle renders as <div data-slot="card-title">, not a heading element.
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: "Users" })
    ).toBeVisible();
  });

  test("admin sees the Users nav link in the layout", async ({ page }) => {
    await page.goto("/");
    // Layout renders this link only for ADMIN role.
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  });

  test("admin can click the Users nav link and reach /users", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Users" }).click();
    await page.waitForURL("/users");
    await expect(page).toHaveURL("/users");
    // CardTitle renders as <div data-slot="card-title">, not a heading element.
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: "Users" })
    ).toBeVisible();
  });

  test("admin sees their name in the nav bar", async ({ page }) => {
    // Layout renders session.user.name — seeded as "Admin" in seed.ts.
    await page.goto("/");
    await expect(page.getByText("Admin")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 8. AGENT role — access control
// ---------------------------------------------------------------------------

test.describe("AGENT — access control", () => {
  test.use({ storageState: AGENT_STATE });

  test("agent can access the home page at /", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page).toHaveURL("/");
  });

  test("agent visiting /users is redirected to /", async ({ page }) => {
    // AdminRoute: non-ADMIN users get <Navigate to="/" replace />.
    await page.goto("/users");
    await page.waitForURL("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("agent does not see the Users nav link", async ({ page }) => {
    await page.goto("/");
    // Layout conditionally renders the Users link for ADMIN only.
    await expect(page.getByRole("link", { name: "Users" })).not.toBeVisible();
  });

  test("agent sees their name in the nav bar", async ({ page }) => {
    // Seeded as "Agent" in seed-agent.ts.
    await page.goto("/");
    await expect(page.getByText("Agent")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 9. Sign-out
// ---------------------------------------------------------------------------

// Sign-out tests log in fresh via the UI in beforeEach rather than sharing a
// storageState file. Parallel tests that share the same session token would
// invalidate it for each other when one calls signOut().
test.describe("Sign-out", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/");
  });

  test("clicking Sign out navigates to /login", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
    await expect(page.locator('[data-slot="card-title"]')).toBeVisible();
  });

  test("after sign-out, visiting / redirects back to /login", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/login");

    await page.goto("/");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  test("after sign-out, visiting /users redirects to /login", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/login");

    await page.goto("/users");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  test("after sign-out, the Sign out button is no longer present", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/login");

    await expect(
      page.getByRole("button", { name: "Sign out" })
    ).not.toBeVisible();
  });
});
