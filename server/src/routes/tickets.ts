import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../lib/auth-middleware";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/async-handler";
import { assignTicketSchema, updateTicketSchema } from "@ticket-system/core";
import { Role } from "../lib/roles";

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
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found." });
      return;
    }
    res.json({ ticket });
  })
);

// PATCH /api/tickets/:id — update status and/or category (any authenticated user)
ticketsRouter.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;

    const result = updateTicketSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0]?.message });
      return;
    }
    const { status, category } = result.data;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found." });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: { ...(status !== undefined && { status }), ...(category !== undefined && { category }) },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({ ticket: updated });
  })
);

// PATCH /api/tickets/:id/assign — assign or unassign a ticket (admin only)
ticketsRouter.patch(
  "/:id/assign",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;

    const result = assignTicketSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.issues[0]?.message });
      return;
    }
    const { assignedToId } = result.data;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found." });
      return;
    }

    if (assignedToId !== null) {
      const agent = await prisma.user.findUnique({
        where: { id: assignedToId },
        select: { id: true, role: true, deletedAt: true },
      });
      if (!agent || agent.deletedAt !== null) {
        res.status(404).json({ error: "Agent not found." });
        return;
      }
      if (agent.role !== Role.AGENT) {
        res.status(400).json({ error: "Tickets can only be assigned to agents." });
        return;
      }
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: { assignedToId },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({ ticket: updated });
  })
);
