import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../lib/auth-middleware";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/async-handler";

export const ticketsRouter = Router();

const listQuerySchema = z.object({
  sortBy: z
    .enum(["subject", "status", "createdAt", "fromName", "fromEmail"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

// GET /api/tickets — paginated + server-sorted (any authenticated user)
ticketsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = listQuerySchema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0]?.message });
      return;
    }
    const { sortBy, sortOrder, page, pageSize } = result.data;
    const skip = (page - 1) * pageSize;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: pageSize,
      }),
      prisma.ticket.count(),
    ]);

    res.json({ tickets, total, page, pageSize });
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
