# Ticket System

A full-stack monorepo with a React client and an Express/Bun server.

## Project Structure

- `client/` — React 19, Vite, Tailwind CSS 4, React Router v7
- `server/` — Express 4, Bun runtime, CORS configured for `http://localhost:5173`
- `package.json` — Bun workspaces root

## Dev Commands

```bash
bun run dev          # start both apps concurrently
bun run dev:client   # client only (http://localhost:5173)
bun run dev:server   # server only (http://localhost:3000)
bun run typecheck    # type-check all workspaces
bun run build        # build all workspaces
bun run test:e2e     # run Playwright E2E tests
```

## Data Fetching (client)

- Use **axios** for all HTTP requests — `axios.get/post/patch/delete` with `{ withCredentials: true }` on every call so cookies are sent.
- Use **TanStack Query** (`@tanstack/react-query`) for all server-state management — no raw `useEffect`/`useState` for fetching. Define the fetcher as a plain `async` function outside the component, then call it via `useQuery` or `useMutation`.
- `QueryClientProvider` is already mounted in `main.tsx`; do not add another one.

## Forms (client)

Use **react-hook-form** + **Zod** for every form that submits data. No exceptions.

```ts
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
type FormValues = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
  resolver: zodResolver(schema),
});
```

- Render per-field errors from `formState.errors.<field>.message` as `<p className="text-sm text-destructive">`.
- Render server errors in `<Alert variant="destructive">` (extract from `axios.isAxiosError`).
- Disable the submit button while `mutation.isPending`.
- Reset the form (`reset()`) and mutation state (`mutation.reset()`) when the form is dismissed without submitting.

## Shared schemas (`core` package)

Zod schemas that are used by both client and server live in `core/src/schemas/`. The package is `@ticket-system/core` and is available to all workspaces.

- **Adding a schema:** create `core/src/schemas/<feature>.ts`, export the schema and its inferred type, then re-export from `core/src/index.ts`.
- **Using a schema:** import directly from the package — `import { createUserSchema, type CreateUserInput } from "@ticket-system/core"`.
- Never duplicate a schema across client and server. If both sides validate the same payload, the schema lives in `core`.

```ts
// core/src/schemas/user.ts
export const createUserSchema = z.object({ ... });
export type CreateUserInput = z.infer<typeof createUserSchema>;

// core/src/index.ts
export * from "./schemas/user";
```

## Validation (server)

Use **Zod** for all request body validation. Define a `z.object(…)` schema per route, call `.safeParse(req.body)`, and return `400` with `result.error.issues[0]?.message` on failure. Validated data flows through `result.data` (fully typed).

Keep server schemas in sync with their client counterparts where the same fields are validated on both sides.

## Roles

User roles are defined in `server/src/lib/roles.ts` as a TypeScript enum:

```ts
enum Role { ADMIN = "ADMIN", AGENT = "AGENT" }
```

Always import and use `Role.ADMIN` / `Role.AGENT` — never hardcode the strings `"ADMIN"` or `"AGENT"` anywhere in the server.

## Key Details

- Server runs on port **3000**, client on port **5173**
- CORS is pre-configured on the server to allow the client origin
- API routes are prefixed with `/api` (e.g. `GET /api/health`)
- Server uses `bun run --hot` for hot-reloading

## E2E Testing

Use the **playwright-e2e-writer** agent for all E2E test work — writing new tests, updating tests after UI changes, and adding `data-testid` attributes. Do not write Playwright tests without invoking this agent.

```bash
bun run test:e2e      # run all E2E tests (headless)
bun run test:e2e:ui   # Playwright UI mode
```

## Documentation

Use the **context7** MCP server to fetch up-to-date documentation for any library used in this project before writing or modifying code involving it. This ensures accuracy against the installed versions.

```
# Example: resolve a library then fetch its docs
mcp__context7__resolve-library-id  →  mcp__context7__query-docs
```

Prefer context7 over training-data recall for: React, React Router, Vite, Tailwind CSS, Express, Bun, TypeScript.
