import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { Role } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!email || !password) {
  console.error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env");
  process.exit(1);
}

// Separate auth instance with signup enabled so the API can create the user
// and handle password hashing correctly.
const seedAuth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET!,
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: Role.AGENT,
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
    body: { email: email!, password: password!, name: "Admin" },
  });

  await prisma.user.update({
    where: { email: email! },
    data: { role: Role.ADMIN },
  });

  console.log(`Admin user seeded: ${email}`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
