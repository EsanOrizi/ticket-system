import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const TEST_DATABASE_URL =
  "postgresql://postgres:Esan1@localhost:5432/helpdesk_test";

const serverDir = path.join(process.cwd(), "server");

// Directory where storageState JSON files are written by auth.spec.ts beforeAll.
// Create it here so it exists before any test writes to it.
const authDir = path.join(process.cwd(), "e2e", ".auth");

export default async function globalSetup() {
  const env = {
    ...process.env,
    DATABASE_URL: TEST_DATABASE_URL,
    // Required env vars for the seed script
    BETTER_AUTH_SECRET:
      process.env.BETTER_AUTH_SECRET ??
      "5b52cbf9e51df6d49d5dcde0eb47d6762c03f3ffe9f33099a798ff3f83bae321",
    CLIENT_ORIGIN: "http://localhost:5173",
    SEED_ADMIN_EMAIL: "admin@example.com",
    SEED_ADMIN_PASSWORD: "password123",
  };

  console.log("Creating test database...");
  execSync("bun run scripts/create-test-db.ts", {
    cwd: serverDir,
    env,
    stdio: "inherit",
  });

  console.log("Running migrations on test database...");
  execSync("bunx prisma migrate deploy", {
    cwd: serverDir,
    env,
    stdio: "inherit",
  });

  console.log("Seeding admin user in test database...");
  execSync("bun run prisma/seed.ts", {
    cwd: serverDir,
    env,
    stdio: "inherit",
  });

  console.log("Seeding agent user in test database...");
  execSync("bun run prisma/seed-agent.ts", {
    cwd: serverDir,
    env: {
      ...env,
      SEED_AGENT_EMAIL: "agent@example.com",
      SEED_AGENT_PASSWORD: "password123",
    },
    stdio: "inherit",
  });

  console.log("Seeding test tickets in test database...");
  execSync("bun run prisma/seed-tickets.ts", {
    cwd: serverDir,
    env,
    stdio: "inherit",
  });

  // Ensure the .auth directory exists so tests can write storageState files.
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
}
