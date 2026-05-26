---
name: project-auth-selectors
description: Reliable selectors and page landmarks for all components in the ticket-system
metadata:
  type: project
---

**LoginPage (`client/src/pages/LoginPage.tsx`)**
- Card title: `page.locator('[data-slot="card-title"]')` — renders as `<div data-slot="card-title">`, NOT a heading
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
- Heading: `getByRole("heading", { name: "Dashboard" })` — this one IS a real heading element

**UsersPage (`client/src/pages/UsersPage.tsx`)**
- Card title: `page.locator('[data-slot="card-title"]', { hasText: "Users" })` — CardTitle is a `<div>`, not heading
- Table: `getByRole("table")`
- Column headers: `getByRole("columnheader", { name: "Name" | "Email" | "Role" | "Joined" })`
- Member count: `page.locator("text=/\\d+ members?/")`
- Create button: `getByRole("button", { name: "Create New User" })`
- Edit button per row: `getByRole("button", { name: "Edit {userName}" })` (aria-label on button)
- Delete button per row: `getByRole("button", { name: "Delete {userName}" })` (aria-label, non-ADMIN rows only)
- User name cell span: `data-testid="user-name-cell"` (added to span in UsersPage)
- Role badge span: `data-testid="user-role-badge"` (added to RoleBadge span in UsersPage)
- Row by email: `page.getByRole("row").filter({ hasText: "user@example.com" })`
- Email cell: `getByRole("cell", { name: "user@example.com" })`

**Modals — @base-ui/react Dialog**
- Dialog.Popup renders `role="dialog"` → `page.getByRole("dialog")`
- Dialog.Title renders as `<h2>` → `dialog.getByRole("heading", { name: "..." })`
- Dialog backdrop: `fixed inset-0 bg-black/50` — no selector needed

**CreateUserModal / CreateUserForm**
- Modal title: `dialog.getByRole("heading", { name: "Create New User" })`
- Name input: `dialog.getByLabel("Name")` (id: cu-name)
- Email input: `dialog.getByLabel("Email")` (id: cu-email)
- Password input: `dialog.getByLabel("Password")` (id: cu-password)
- Submit: `dialog.getByRole("button", { name: "Create User" })` / `{ name: "Creating..." }` pending
- Cancel: `dialog.getByRole("button", { name: "Cancel" })`

**EditUserModal / EditUserForm**
- Modal title: `dialog.getByRole("heading", { name: "Edit User" })`
- Name input: `dialog.getByLabel("Name")` (id: eu-name)
- Email input: `dialog.getByLabel("Email")` (id: eu-email)
- Role select: `dialog.getByLabel("Role")` (id: eu-role) — options: "AGENT", "ADMIN"
- Password input: `dialog.getByLabel("New password")` (id: eu-password)
- Submit: `dialog.getByRole("button", { name: "Save Changes" })` / `{ name: "Saving..." }` pending
- Cancel: `dialog.getByRole("button", { name: "Cancel" })`

**DeleteUserModal**
- Modal title: `dialog.getByRole("heading", { name: "Delete user" })`
- Confirm: `dialog.getByRole("button", { name: "Delete" })` / `{ name: "Deleting..." }` pending
- Cancel: `dialog.getByRole("button", { name: "Cancel" })`

**data-testid attributes added to source files**
- `client/src/pages/UsersPage.tsx` — `data-testid="user-name-cell"` on `<span>` in name column
- `client/src/pages/UsersPage.tsx` — `data-testid="user-role-badge"` on `<span>` in RoleBadge component

**Why:** CardTitle and RoleBadge both use `font-medium` class — `span.font-medium` was too broad and matched both. Tailwind v4 CSS class names appear correctly in the DOM HTML but CSS class selectors `.text-gray-900` returned zero elements (likely Tailwind v4 generates different class names or utility classes are not present as-is at runtime). `data-testid` attributes are the most reliable solution for these sub-element selectors. The `getByText` filter is case-insensitive for strings — use regex (`/^AGENT$/`) or `data-testid` when exact casing matters.
