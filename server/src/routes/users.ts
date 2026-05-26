import { Router } from "express";
import { createUserSchema } from "@ticket-system/core";
import { requireAuth, requireAdmin } from "../lib/auth-middleware";
import { prisma } from "../lib/prisma";
import { createUserAuth } from "../lib/create-user-auth";
import { Role } from "../lib/roles";
import { asyncHandler } from "../lib/async-handler";

export const usersRouter = Router();

// GET /api/users — list all users
usersRouter.get("/", requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ users });
}));

// POST /api/users — create a new user
usersRouter.post("/", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    const error = result.error.issues[0]?.message ?? "Invalid request body";
    res.status(400).json({ error });
    return;
  }

  const { name, email, password } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "A user with that email already exists." });
    return;
  }

  await createUserAuth.api.signUpEmail({
    body: { name, email, password },
  });

  const user = await prisma.user.update({
    where: { email },
    data: { role: Role.AGENT },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  res.status(201).json({ user });
}));
