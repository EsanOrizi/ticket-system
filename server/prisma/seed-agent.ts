/**
 * Seeds a single AGENT user into the database.
 *
 * Required env vars:
 *   SEED_AGENT_EMAIL    - e.g. agent@example.com
 *   SEED_AGENT_PASSWORD - plain-text password (min 8 chars)
 *
 * Uses a separate betterAuth instance with sign-up enabled so that
 * passwords are hashed correctly. The main auth instance has sign-up
 * disabled.
 */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../src/lib/prisma";

const email = process.env.SEED_AGENT_EMAIL;
const password = process.env.SEED_AGENT_PASSWORD;

if (!email || !password) {
  console.error(
    "SEED_AGENT_EMAIL and SEED_AGENT_PASSWORD must be set in the environment"
  );
  process.exit(1);
}

const seedAuth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET!,
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "AGENT",
        required: false,
        input: false,
      },
    },
  },
});

async function seed() {
  const existing = await prisma.user.findUnique({ where: { email: email! } });
  if (existing) {
    console.log(`User ${email} already exists — skipping.`);
    return;
  }

  await seedAuth.api.signUpEmail({
    body: { email: email!, password: password!, name: "Agent" },
  });

  // role defaults to "AGENT" — no update needed, but be explicit
  await prisma.user.update({
    where: { email: email! },
    data: { role: "AGENT" },
  });

  console.log(`Agent user seeded: ${email}`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
