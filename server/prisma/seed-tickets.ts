/**
 * Seeds test tickets into the database for E2E tests.
 *
 * Creates three tickets with distinct subjects, statuses, and from-fields so
 * that tickets.spec.ts can assert on each property in isolation.
 *
 * Idempotent: if a ticket with the same subject already exists it is left
 * unchanged, so repeated test runs against a reused server stay clean.
 *
 * Called by e2e/global-setup.ts before the webServers start.
 */

import { prisma } from "../src/lib/prisma";

const TEST_TICKETS = [
  {
    subject: "Cannot log in to my account",
    body: "I have been unable to log in since yesterday.",
    status: "OPEN",
    category: "GENERAL_QUESTION",
    source: "WEB",
    fromName: "Alice Smith",
    fromEmail: "alice@example.com",
  },
  {
    subject: "Billing invoice missing",
    body: "My invoice for last month never arrived.",
    status: "OPEN",
    category: "GENERAL_QUESTION",
    source: "EMAIL",
    fromName: "Bob Jones",
    fromEmail: "bob@example.com",
  },
  {
    subject: "Feature request: dark mode",
    body: "Please add a dark mode option.",
    status: "CLOSED",
    category: "GENERAL_QUESTION",
    source: "WEB",
    fromName: null,
    fromEmail: null,
  },
] as const;

async function seed() {
  const now = new Date();

  for (const [i, ticket] of TEST_TICKETS.entries()) {
    const existing = await prisma.ticket.findFirst({
      where: { subject: ticket.subject },
    });

    if (existing) {
      console.log(`Ticket "${ticket.subject}" already exists — skipping.`);
      continue;
    }

    await prisma.ticket.create({
      data: {
        id: `test-ticket-${i + 1}`,
        subject: ticket.subject,
        body: ticket.body,
        status: ticket.status,
        category: ticket.category,
        source: ticket.source,
        fromName: ticket.fromName ?? null,
        fromEmail: ticket.fromEmail ?? null,
        createdAt: new Date(now.getTime() - i * 60_000), // stagger by 1 min each
        updatedAt: now,
      },
    });

    console.log(`Seeded ticket: "${ticket.subject}"`);
  }
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
