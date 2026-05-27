import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../lib/auth-middleware";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/async-handler";

export const ticketsRouter = Router();

const sortSchema = z.object({
  sortBy: z
    .enum(["subject", "status", "createdAt", "fromName", "fromEmail"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// GET /api/tickets — all tickets, server-sorted (any authenticated user)
ticketsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = sortSchema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0]?.message });
      return;
    }
    const { sortBy, sortOrder } = result.data;
    const tickets = await prisma.ticket.findMany({
      orderBy: { [sortBy]: sortOrder },
    });
    res.json({ tickets });
  })
);

// GET /api/tickets/:id — single ticket (any authenticated user)
ticketsRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found." });
      return;
    }
    res.json({ ticket });
  })
);
