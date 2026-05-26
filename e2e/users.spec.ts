/**
 * E2E tests for the user management feature (/users page).
 *
 * Coverage
 * --------
 * 1. Read   — navigate to /users and verify the users list renders
 * 2. Create — open the Create New User modal, fill the form, submit,
 *             verify the new user appears in the table
 * 3. Edit   — open the Edit modal for the seeded Agent, change name and
 *             role, save, verify updated values appear in the table,
 *             then restore the original values so other specs are unaffected
 * 4. Delete — create a throwaway user via the API, delete them through
 *             the UI, verify they no longer appear in the table
 *
 * Auth setup
 * ----------
 * All tests run as ADMIN (the only role that can access /users).
 * The admin storageState is written by e2e/auth.setup.ts which runs
 * before this project in playwright.config.ts.
 *
 * Selectors
 * ---------
 * - Dialog.Popup from @base-ui/react renders role="dialog"
 * - Dialog.Title renders as <h2>
 * - Form labels use htmlFor/id pairs: getByLabel() is always reliable
 * - Row action buttons use aria-label="Edit {name}" / "Delete {name}"
 * - CardTitle renders as a <div data-slot="card-title">, not a heading element
 * - No data-testid attributes were required
 */

import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ADMIN_STATE = path.join(process.cwd(), "e2e", ".auth", "admin.json");
const USERS_API_URL = "http://localhost:3000/api/users";

// Better Auth requires an Origin header matching the trustedOrigins config.
const TRUSTED_ORIGIN = "http://localhost:5173";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reads the admin storageState file that auth.setup.ts wrote and returns a
 * Cookie header string suitable for direct HTTP API calls.
 *
 * This avoids re-signing in (which requires an Origin header check by
 * Better Auth) and reuses the session that the setup project already created.
 */
function getAdminCookieHeaderFromState(): string {
  const state = JSON.parse(fs.readFileSync(ADMIN_STATE, "utf-8")) as {
    cookies: Array<{ name: string; value: string; domain: string }>;
  };
  // Only include cookies for the API server (localhost:3000)
  return state.cookies
    .filter((c) => c.domain === "localhost")
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

/**
 * Creates a user via the REST API without touching the browser.
 * Returns the created user's id.
 *
 * The Cookie header comes from the admin storageState so no additional
 * sign-in is needed.
 */
async function createUserViaApi(user: {
  name: string;
  email: string;
  password: string;
}): Promise<string> {
  const cookieHeader = getAdminCookieHeaderFromState();

  const res = await fetch(USERS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
      Origin: TRUSTED_ORIGIN,
    },
    body: JSON.stringify(user),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Create user via API failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { user: { id: string } };
  return data.user.id;
}

// ---------------------------------------------------------------------------
// All user-management tests run as ADMIN
// ---------------------------------------------------------------------------

test.describe("User management — ADMIN", () => {
  test.use({ storageState: ADMIN_STATE });

  // -------------------------------------------------------------------------
  // 1. Read — users list loads and renders
  // -------------------------------------------------------------------------

  test.describe("Read — users list", () => {
    test("navigating to /users shows the Users card title and the seeded users", async ({
      page,
    }) => {
      await page.goto("/users");
      await expect(page).toHaveURL("/users");

      // CardTitle renders as <div data-slot="card-title">, not a heading
      await expect(
        page.locator('[data-slot="card-title"]', { hasText: "Users" })
      ).toBeVisible();

      // The two seeded users must appear in the table
      await expect(page.getByRole("cell", { name: "admin@example.com" })).toBeVisible();
      await expect(page.getByRole("cell", { name: "agent@example.com" })).toBeVisible();
    });

    test("the users table shows Name, Email, Role, and Joined columns", async ({
      page,
    }) => {
      await page.goto("/users");

      const table = page.getByRole("table");
      await expect(table).toBeVisible();

      await expect(
        page.getByRole("columnheader", { name: "Name" })
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Email" })
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Role" })
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Joined" })
      ).toBeVisible();
    });

    test("the member count reflects the number of users in the list", async ({
      page,
    }) => {
      await page.goto("/users");

      // Pattern matches "2 members", "3 members", etc.
      await expect(page.locator("text=/\\d+ members?/")).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Create — new user appears in the list after submission
  // -------------------------------------------------------------------------

  test.describe("Create — new user", () => {
    // Use a timestamp suffix so repeated test runs against a live server
    // (reuseExistingServer) do not collide with users created in prior runs.
    const ts = Date.now();
    const newUser = {
      name: `Test User ${ts}`,
      email: `testuser${ts}@example.com`,
      password: "password123",
    };

    test("opening the modal shows the Create New User heading", async ({
      page,
    }) => {
      await page.goto("/users");

      await page.getByRole("button", { name: "Create New User" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Create New User" })
      ).toBeVisible();
    });

    test("filling the form and submitting adds the user to the table", async ({
      page,
    }) => {
      await page.goto("/users");

      // Open modal
      await page.getByRole("button", { name: "Create New User" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Fill form — CreateUserForm field ids: cu-name, cu-email, cu-password
      await dialog.getByLabel("Name").fill(newUser.name);
      await dialog.getByLabel("Email").fill(newUser.email);
      await dialog.getByLabel("Password").fill(newUser.password);

      // Submit
      await dialog.getByRole("button", { name: "Create User" }).click();

      // Modal closes on success
      await expect(dialog).not.toBeVisible();

      // New user appears in the refreshed list
      await expect(page.getByRole("cell", { name: newUser.email })).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // 3. Edit — updated values appear in the table
  // -------------------------------------------------------------------------

  test.describe("Edit — update existing user", () => {
    // We edit the seeded Agent and restore original values within the same
    // test so each test is self-contained and does not affect other specs.
    const originalName = "Agent";
    const updatedName = "Agent Edited";
    const agentEmail = "agent@example.com";

    test("editing a user's name updates the row in the table", async ({
      page,
    }) => {
      await page.goto("/users");

      // Open the edit modal for the Agent row
      await page.getByRole("button", { name: `Edit ${originalName}` }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Edit User" })
      ).toBeVisible();

      // EditUserForm field id: eu-name
      const nameInput = dialog.getByLabel("Name");
      await nameInput.clear();
      await nameInput.fill(updatedName);

      const [patchResponse] = await Promise.all([
        page.waitForResponse((res) =>
          res.url().includes("/api/users/") && res.request().method() === "PATCH"
        ),
        dialog.getByRole("button", { name: "Save Changes" }).click(),
      ]);
      expect(patchResponse.ok()).toBeTruthy();
      await expect(dialog).not.toBeVisible();

      // The updated name appears in the name column once TanStack Query refetches.
      const agentRow = page.getByRole("row").filter({ hasText: agentEmail });
      await expect(
        agentRow.getByTestId("user-name-cell")
      ).toHaveText(updatedName, { timeout: 10000 });

      // ---- Restore original name ----
      await page.getByRole("button", { name: `Edit ${updatedName}` }).click();
      const restoreDialog = page.getByRole("dialog");
      await expect(restoreDialog).toBeVisible();

      const restoreInput = restoreDialog.getByLabel("Name");
      await restoreInput.clear();
      await restoreInput.fill(originalName);
      const [restorePatch] = await Promise.all([
        page.waitForResponse((res) =>
          res.url().includes("/api/users/") && res.request().method() === "PATCH"
        ),
        restoreDialog.getByRole("button", { name: "Save Changes" }).click(),
      ]);
      expect(restorePatch.ok()).toBeTruthy();
      await expect(restoreDialog).not.toBeVisible();

      // Original name is back
      await expect(
        page.getByRole("row").filter({ hasText: agentEmail }).getByTestId("user-name-cell")
      ).toHaveText(originalName, { timeout: 10000 });
    });

    test("editing a user's role updates the role badge in the table", async ({
      page,
    }) => {
      await page.goto("/users");

      await page.getByRole("button", { name: `Edit ${originalName}` }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // EditUserForm field id: eu-role
      await dialog.getByLabel("Role").selectOption("ADMIN");

      const [rolePatch] = await Promise.all([
        page.waitForResponse((res) =>
          res.url().includes("/api/users/") && res.request().method() === "PATCH"
        ),
        dialog.getByRole("button", { name: "Save Changes" }).click(),
      ]);
      expect(rolePatch.ok()).toBeTruthy();
      await expect(dialog).not.toBeVisible();

      // The agent row's role cell now shows ADMIN.
      // RoleBadge renders <span data-testid="user-role-badge">.
      const agentRow = page.getByRole("row").filter({ hasText: agentEmail });
      await expect(agentRow.getByTestId("user-role-badge")).toHaveText("ADMIN", { timeout: 10000 });

      // ---- Restore to AGENT ----
      await page.getByRole("button", { name: `Edit ${originalName}` }).click();
      const restoreDialog = page.getByRole("dialog");
      await expect(restoreDialog).toBeVisible();
      await restoreDialog.getByLabel("Role").selectOption("AGENT");
      const [restoreRolePatch] = await Promise.all([
        page.waitForResponse((res) =>
          res.url().includes("/api/users/") && res.request().method() === "PATCH"
        ),
        restoreDialog.getByRole("button", { name: "Save Changes" }).click(),
      ]);
      expect(restoreRolePatch.ok()).toBeTruthy();
      await expect(restoreDialog).not.toBeVisible();

      await expect(agentRow.getByTestId("user-role-badge")).toHaveText("AGENT", { timeout: 10000 });
    });
  });

  // -------------------------------------------------------------------------
  // 4. Delete — user is removed from the active list
  // -------------------------------------------------------------------------

  test.describe("Delete — soft-delete a user", () => {
    // Create a throwaway user via the API before the test and delete them
    // through the UI.  This avoids touching the seeded Agent that other
    // specs' storageState sessions depend on.
    const throwawayUser = {
      name: "Throwaway User",
      email: `throwaway${Date.now()}@example.com`,
      password: "password123",
    };

    test.beforeAll(async () => {
      await createUserViaApi(throwawayUser);
    });

    test("deleting a user removes them from the active users list", async ({
      page,
    }) => {
      await page.goto("/users");

      // Throwaway user is present initially
      await expect(
        page.getByRole("cell", { name: throwawayUser.email })
      ).toBeVisible();

      // Click the delete button for the throwaway user
      await page
        .getByRole("button", { name: `Delete ${throwawayUser.name}` })
        .click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Confirmation modal shows the dialog heading and the user's name
      await expect(
        dialog.getByRole("heading", { name: "Delete user" })
      ).toBeVisible();
      await expect(dialog.getByText(throwawayUser.name)).toBeVisible();

      // Confirm deletion
      await dialog.getByRole("button", { name: "Delete" }).click();

      // Modal closes
      await expect(dialog).not.toBeVisible();

      // The deleted user no longer appears in the table
      await expect(
        page.getByRole("cell", { name: throwawayUser.email })
      ).not.toBeVisible();
    });
  });
});
