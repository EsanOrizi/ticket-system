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
```

## Key Details

- Server runs on port **3000**, client on port **5173**
- CORS is pre-configured on the server to allow the client origin
- API routes are prefixed with `/api` (e.g. `GET /api/health`)
- Server uses `bun run --hot` for hot-reloading

## Documentation

Use the **context7** MCP server to fetch up-to-date documentation for any library used in this project before writing or modifying code involving it. This ensures accuracy against the installed versions.

```
# Example: resolve a library then fetch its docs
mcp__context7__resolve-library-id  →  mcp__context7__query-docs
```

Prefer context7 over training-data recall for: React, React Router, Vite, Tailwind CSS, Express, Bun, TypeScript.
