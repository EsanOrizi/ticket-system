import { Router } from "express";
import { requireAuth } from "../lib/auth-middleware";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/async-handler";

export const ticketsRouter = Router();

// GET /api/tickets — all tickets, newest first (any authenticated user)
ticketsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
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
