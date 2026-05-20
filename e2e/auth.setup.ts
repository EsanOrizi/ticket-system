import { test as setup } from "@playwright/test";
import path from "path";
import fs from "fs";

const AUTH_DIR = path.join(process.cwd(), "e2e", ".auth");
const SIGN_IN_URL = "http://localhost:3000/api/auth/sign-in/email";

setup.beforeAll(() => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
});

setup("create admin session", async ({ request }) => {
  const response = await request.post(SIGN_IN_URL, {
    data: { email: "admin@example.com", password: "password123" },
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok()) throw new Error(`Admin sign-in failed: ${response.status()}`);
  await request.storageState({ path: path.join(AUTH_DIR, "admin.json") });
});

setup("create agent session", async ({ request }) => {
  const response = await request.post(SIGN_IN_URL, {
    data: { email: "agent@example.com", password: "password123" },
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok()) throw new Error(`Agent sign-in failed: ${response.status()}`);
  await request.storageState({ path: path.join(AUTH_DIR, "agent.json") });
});
