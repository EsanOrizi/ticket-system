import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { Role } from "./roles";

/**
 * A separate betterAuth instance used exclusively for admin-initiated user
 * creation. The main `auth` instance has `disableSignUp: true` to prevent
 * self-registration; this instance omits that flag so `api.signUpEmail()` can
 * be called server-side by admin routes to hash passwords correctly.
 *
 * This mirrors the pattern used by the seed scripts.
 */
export const createUserAuth = betterAuth({
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
