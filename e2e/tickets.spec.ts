/**
 * E2E tests for the Tickets feature (/tickets page).
 *
 * Coverage
 * --------
 * 1. Unauthenticated access  — /tickets redirects to /login
 * 2. Empty state             — "No tickets yet." shown when the API returns an
 *                              empty list (mocked via page.route so the test is
 *                              independent of what is in the DB at run time)
 * 3. Ticket list             — table renders subjects, from-name/email, status
 *                              badge, and formatted date for the three tickets
 *                              seeded in global-setup.ts (seed-tickets.ts)
 * 4. Agent access            — agent role can reach /tickets and see the table
 * 5. Nav link visibility     — "Tickets" link is shown for both roles;
 *                              "Users" link is shown only for ADMIN
 *
 * Auth setup
 * ----------
 * storageState files are written by e2e/auth.setup.ts (the "setup" project in
 * playwright.config.ts) and reused here via test.use({ storageState }).
 *
 * Seeded tickets (from server/prisma/seed-tickets.ts)
 * ----------------------------------------------------
 *   1. "Cannot log in to my account"  — status OPEN,   from Alice Smith
 *   2. "Billing invoice missing"       — status OPEN,   from Bob Jones
 *   3. "Feature request: dark mode"    — status CLOSED, no from-name/email
 *
 * data-testid attributes added to TicketsPage.tsx
 * ------------------------------------------------
 *   tickets-empty-state   — <p> shown when tickets.length === 0
 *   tickets-table         — <table> shown when tickets.length > 0
 *   ticket-row            — <tr> for each ticket
 *   ticket-subject        — <td> subject cell
 *   ticket-from           — <td> from cell
 *   ticket-status-badge   — <span> inside StatusBadge
 *   ticket-date           — <td> date cell
 *   tickets-count         — <span> showing "N tickets" in the card header
 */

import { test, expect } from "@playwright/test";
import path from "path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ADMIN_STATE = path.join(process.cwd(), "e2e", ".auth", "admin.json");
const AGENT_STATE = path.join(process.cwd(), "e2e", ".auth", "agent.json");

const TICKETS_API_URL = "http://localhost:3000/api/tickets";

// ---------------------------------------------------------------------------
// 1. Unauthenticated access
//    No storageState — fresh browser context with no session.
// ---------------------------------------------------------------------------

test.describe("Unauthenticated access", () => {
  test("visiting /tickets without a session redirects to /login", async ({
    page,
  }) => {
    await page.goto("/tickets");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
    // LoginPage renders a card with a title slot (not a heading element).
    await expect(page.locator('[data-slot="card-title"]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. Empty state
//    Mock the tickets API to return an empty list so the test is independent
//    of what is currently stored in the test DB.
// ---------------------------------------------------------------------------

test.describe("Empty state", () => {
  test.use({ storageState: ADMIN_STATE });

  test("shows 'No tickets yet.' when there are no tickets", async ({
    page,
  }) => {
    // Intercept the tickets API call and return an empty list.
    await page.route(TICKETS_API_URL, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ tickets: [] }),
      });
    });

    await page.goto("/tickets");

    // The empty-state paragraph must be visible.
    await expect(page.getByTestId("tickets-empty-state")).toBeVisible();
    await expect(page.getByTestId("tickets-empty-state")).toHaveText(
      "No tickets yet."
    );

    // The table must not be rendered.
    await expect(page.getByTestId("tickets-table")).not.toBeVisible();

    // The count shows 0 tickets.
    await expect(page.getByTestId("tickets-count")).toHaveText("0 tickets");
  });
});

// ---------------------------------------------------------------------------
// 3. Ticket list — admin
//    Relies on the three tickets seeded by seed-tickets.ts in global-setup.
// ---------------------------------------------------------------------------

test.describe("Ticket list — ADMIN", () => {
  test.use({ storageState: ADMIN_STATE });

  test("navigating to /tickets shows the Tickets card title", async ({
    page,
  }) => {
    await page.goto("/tickets");
    await expect(page).toHaveURL("/tickets");
    // CardTitle renders as <div data-slot="card-title">, not a heading element.
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: "Tickets" })
    ).toBeVisible();
  });

  test("the table has Subject, From, Status, and Date column headers", async ({
    page,
  }) => {
    await page.goto("/tickets");
    const table = page.getByTestId("tickets-table");
    await expect(table).toBeVisible();

    await expect(
      page.getByRole("columnheader", { name: "Subject" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "From" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Status" })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Date" })
    ).toBeVisible();
  });

  test("the ticket count reflects the number of rows in the table", async ({
    page,
  }) => {
    await page.goto("/tickets");
    // Wait for the table to be fully rendered before counting rows.
    // rows.count() has no built-in retry, so we must ensure data is loaded first.
    await expect(page.getByTestId("tickets-table")).toBeVisible();
    const rows = page.getByTestId("ticket-row");
    const count = await rows.count();
    // At least the three seeded tickets must be present.
    expect(count).toBeGreaterThanOrEqual(3);
    // The count span text must match "N tickets".
    await expect(page.getByTestId("tickets-count")).toHaveText(
      new RegExp(`^${count} tickets?$`)
    );
  });

  test("seeded ticket subjects appear in the table", async ({ page }) => {
    await page.goto("/tickets");
    await expect(page.getByTestId("tickets-table")).toBeVisible();

    await expect(
      page.getByText("Cannot log in to my account")
    ).toBeVisible();
    await expect(page.getByText("Billing invoice missing")).toBeVisible();
    await expect(page.getByText("Feature request: dark mode")).toBeVisible();
  });

  test("OPEN status badge renders for an OPEN ticket", async ({ page }) => {
    await page.goto("/tickets");

    // Find the row for the first seeded ticket ("Cannot log in to my account").
    const openRow = page
      .getByTestId("ticket-row")
      .filter({ hasText: "Cannot log in to my account" });
    await expect(openRow).toBeVisible();

    const badge = openRow.getByTestId("ticket-status-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText("OPEN");
  });

  test("CLOSED status badge renders for a CLOSED ticket", async ({ page }) => {
    await page.goto("/tickets");

    // "Feature request: dark mode" is seeded with status CLOSED.
    const closedRow = page
      .getByTestId("ticket-row")
      .filter({ hasText: "Feature request: dark mode" });
    await expect(closedRow).toBeVisible();

    const badge = closedRow.getByTestId("ticket-status-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText("CLOSED");
  });

  test("from-name and from-email are shown for a ticket that has them", async ({
    page,
  }) => {
    await page.goto("/tickets");

    // Wait for the full table before scoping into a row; without this wait
    // the from-cell can be queried before React has populated the ticket data.
    await expect(page.getByTestId("tickets-table")).toBeVisible();

    // "Cannot log in to my account" is seeded with fromName "Alice Smith"
    // and fromEmail "alice@example.com".
    const row = page
      .getByTestId("ticket-row")
      .filter({ hasText: "Cannot log in to my account" });
    await expect(row).toBeVisible();

    const fromCell = row.getByTestId("ticket-from");
    // toContainText checks the cell's full text content, which is more reliable
    // than getByText() when the values are in nested <span> elements.
    await expect(fromCell).toContainText("Alice Smith");
    await expect(fromCell).toContainText("alice@example.com");
  });

  test("the from cell shows an em-dash when a ticket has no sender", async ({
    page,
  }) => {
    await page.goto("/tickets");

    // "Feature request: dark mode" has null fromName and null fromEmail.
    const row = page
      .getByTestId("ticket-row")
      .filter({ hasText: "Feature request: dark mode" });
    await expect(row).toBeVisible();

    const fromCell = row.getByTestId("ticket-from");
    await expect(fromCell).toContainText("—");
  });

  test("the date cell shows a formatted date (e.g. 'Jan 1, 2025')", async ({
    page,
  }) => {
    await page.goto("/tickets");

    const rows = page.getByTestId("ticket-row");
    const firstRow = rows.first();
    await expect(firstRow).toBeVisible();

    const dateCell = firstRow.getByTestId("ticket-date");
    await expect(dateCell).toBeVisible();
    // formatDate() produces strings like "May 27, 2025" — match the pattern.
    await expect(dateCell).toHaveText(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
  });
});

// ---------------------------------------------------------------------------
// 4. Agent access — AGENT role can see the tickets page
// ---------------------------------------------------------------------------

test.describe("Agent access — /tickets", () => {
  test.use({ storageState: AGENT_STATE });

  test("agent can navigate directly to /tickets without being redirected", async ({
    page,
  }) => {
    await page.goto("/tickets");
    await expect(page).toHaveURL("/tickets");
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: "Tickets" })
    ).toBeVisible();
  });

  test("agent sees the seeded tickets in the table", async ({ page }) => {
    await page.goto("/tickets");
    await expect(page.getByTestId("tickets-table")).toBeVisible();
    await expect(
      page.getByText("Cannot log in to my account")
    ).toBeVisible();
  });

  test("agent sees their name in the nav bar", async ({ page }) => {
    await page.goto("/tickets");
    // Seeded as "Agent" in seed-agent.ts
    await expect(page.getByText("Agent")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 5. Nav link visibility
//    "Tickets" link — visible to both admin and agent (unconditional in Layout)
//    "Users" link  — visible only to admin (role === "ADMIN" check in Layout)
// ---------------------------------------------------------------------------

test.describe("Nav link — ADMIN", () => {
  test.use({ storageState: ADMIN_STATE });

  test("admin sees the Tickets nav link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Tickets" })).toBeVisible();
  });

  test("admin sees the Users nav link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  });

  test("clicking the Tickets nav link navigates to /tickets", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Tickets" }).click();
    await page.waitForURL("/tickets");
    await expect(page).toHaveURL("/tickets");
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: "Tickets" })
    ).toBeVisible();
  });
});

test.describe("Nav link — AGENT", () => {
  test.use({ storageState: AGENT_STATE });

  test("agent sees the Tickets nav link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Tickets" })).toBeVisible();
  });

  test("agent does not see the Users nav link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Users" })).not.toBeVisible();
  });
});
