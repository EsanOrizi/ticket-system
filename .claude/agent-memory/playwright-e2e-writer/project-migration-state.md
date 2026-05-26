---
name: project-migration-state
description: Prisma migration gap between dev and test databases, and how it was resolved
metadata:
  type: project
---

The `deletedAt DateTime?` column was added to the `User` model in `schema.prisma` but no migration was created for it. This caused the test DB (`helpdesk_test`) to fail with `P2022: column User.deletedAt does not exist`.

**Resolution (2026-05-26):**
1. `prisma migrate dev --name add_deleted_at_to_user` run against test DB — created migration `20260526142726_add_deleted_at_to_user` and applied it.
2. `prisma migrate resolve --applied 20260526142726_add_deleted_at_to_user` run against main dev DB (`helpdesk`) — the column already existed there but wasn't tracked in `_prisma_migrations`.

**Why:** The column was presumably added via a direct SQL `ALTER TABLE` on the dev DB rather than via `prisma migrate dev`, so the migration file was never created. Going forward, always create migrations with `prisma migrate dev` to keep both DBs in sync.

**How to apply:** If tests fail with `P2022 column not found`, check whether `schema.prisma` has fields not in any migration file. Run `prisma migrate dev` against the test DB to create the migration, then `prisma migrate resolve --applied` against the main DB if the column already exists there.
