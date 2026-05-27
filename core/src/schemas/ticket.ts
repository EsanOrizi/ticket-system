import { z } from "zod";

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
