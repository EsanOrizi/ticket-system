import { Router } from "express";
import { createUserSchema, updateUserSchema } from "@ticket-system/core";
import { requireAuth, requireAdmin } from "../lib/auth-middleware";
import { prisma } from "../lib/prisma";
import { createUserAuth } from "../lib/create-user-auth";
import { Role } from "../lib/roles";
import { asyncHandler } from "../lib/async-handler";
import { hashPassword } from "better-auth/crypto";

export const usersRouter = Router();

// GET /api/users — list all non-deleted users
usersRouter.get("/", requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
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

// PATCH /api/users/:id — update an existing user
usersRouter.patch("/:id", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = req.params.id as string;

  const result = updateUserSchema.safeParse(req.body);
  if (!result.success) {
    const error = result.error.issues[0]?.message ?? "Invalid request body";
    res.status(400).json({ error });
    return;
  }

  const { name, email, role, password } = result.data;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  // Only check email uniqueness when the address actually changed —
  // otherwise the user's own record would trigger a false 409.
  if (email !== existing.email) {
    const conflict = await prisma.user.findUnique({ where: { email } });
    if (conflict) {
      res.status(409).json({ error: "A user with that email already exists." });
      return;
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: { name, email, role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (password && password.trim().length > 0) {
    const hashed = await hashPassword(password);
    await prisma.account.updateMany({
      where: { userId: id, providerId: "credential" },
      data: { password: hashed },
    });
  }

  res.json({ user });
}));

// DELETE /api/users/:id — soft-delete a user (admins cannot be deleted)
usersRouter.delete("/:id", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = req.params.id as string;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt !== null) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  if (existing.role === Role.ADMIN) {
    res.status(403).json({ error: "Admin accounts cannot be deleted." });
    return;
  }

  await prisma.$transaction([
    // Invalidate all active sessions so the user is logged out immediately
    prisma.session.deleteMany({ where: { userId: id } }),
    // Unassign all tickets that were assigned to this user
    prisma.ticket.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } }),
    // Soft-delete the user
    prisma.user.update({ where: { id }, data: { deletedAt: new Date() } }),
  ]);

  res.status(204).send();
}));
