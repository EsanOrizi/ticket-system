import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  basePath: "/api/auth",
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

export type Auth = typeof auth;
