import { z } from "zod";

export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_CATEGORIES = [
  "GENERAL_QUESTION",
  "BILLING",
  "TECHNICAL",
  "BUG_REPORT",
  "FEATURE_REQUEST",
  "ACCOUNT",
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const ticketSchema = z.object({
  id: z.string(),
  subject: z.string(),
  body: z.string(),
  status: z.string(),
  category: z.string(),
  assignedToId: z.string().nullable(),
  fromEmail: z.string().nullable(),
  fromName: z.string().nullable(),
  source: z.string(),
  emailMessageId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Ticket = z.infer<typeof ticketSchema>;

export const assignTicketSchema = z.object({
  assignedToId: z.string().nullable(),
});

export type AssignTicketInput = z.infer<typeof assignTicketSchema>;

export const updateTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  category: z.enum(TICKET_CATEGORIES).optional(),
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const createReplySchema = z.object({
  body: z.string().min(1, "Reply cannot be empty").max(10000, "Reply is too long"),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;
