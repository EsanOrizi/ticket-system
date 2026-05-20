---
name: project-auth-selectors
description: Reliable selectors and page landmarks for auth-related components in the ticket-system
metadata:
  type: project
---

**LoginPage (`client/src/pages/LoginPage.tsx`)**
- Heading: `getByRole("heading", { name: "Sign in" })`
- Email input: `getByLabel("Email")` — `<Label htmlFor="email">` + `<Input id="email">`
- Password input: `getByLabel("Password")` — `<Label htmlFor="password">` + `<Input id="password">`
- Submit button: `getByRole("button", { name: "Sign in" })` / `{ name: "Signing in..." }` during loading
- Validation errors: `getByText("Enter a valid email address")` / `getByText("Password must be at least 8 characters")`
- Server error alert: `getByRole("alert")` — shadcn `<Alert>` renders `role="alert"` explicitly

**Layout (`client/src/components/Layout.tsx`)**
- Sign out button: `getByRole("button", { name: "Sign out" })`
- Users nav link (ADMIN only): `getByRole("link", { name: "Users" })`
- User's name: `getByText("Admin")` or `getByText("Agent")` — from `session.user.name`

**HomePage (`client/src/pages/HomePage.tsx`)**
- Heading: `getByRole("heading", { name: "Dashboard" })`

**UsersPage (`client/src/pages/UsersPage.tsx`)**
- Heading: `getByRole("heading", { name: "Users" })`

**No data-testid attributes were added** — all selectors are semantic and stable.

**Why:** LoginPage uses shadcn `<Label>` + `<Input>` with matching `htmlFor`/`id`, making `getByLabel()` reliable. The shadcn Alert component explicitly sets `role="alert"` so `getByRole("alert")` is the correct selector for server error messages.
