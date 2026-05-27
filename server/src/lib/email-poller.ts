import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";
import { prisma } from "./prisma";

export function startEmailPoller(intervalMs: number): void {
  const host = process.env.SUPPORT_EMAIL_HOST;
  const port = Number(process.env.SUPPORT_EMAIL_PORT) || 993;
  const user = process.env.SUPPORT_EMAIL;
  const password = process.env.SUPPORT_EMAIL_PASSWORD;

  if (!host || !user || !password) {
    console.warn(
      "[email-poller] SUPPORT_EMAIL_HOST/SUPPORT_EMAIL/SUPPORT_EMAIL_PASSWORD not set — polling disabled."
    );
    return;
  }

  // Capture narrowed strings so the inner async function sees non-undefined types
  const imapHost: string = host;
  const imapUser: string = user;
  const imapPass: string = password;

  async function poll(): Promise<void> {
    const client = new ImapFlow({
      host: imapHost,
      port,
      secure: true,
      auth: { user: imapUser, pass: imapPass },
      logger: false,
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock("INBOX");
      try {
        for await (const message of client.fetch({ seen: false }, { source: true })) {
          // imapflow types source as Buffer | undefined; skip if missing
          if (!message.source) continue;

          try {
            const parsed: ParsedMail = await simpleParser(message.source);
            const messageId = parsed.messageId ?? null;
            const subject = parsed.subject ?? "(no subject)";
            const body =
              parsed.text?.trim() ||
              (parsed.html
                ? parsed.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
                : "");
            const fromEmail = parsed.from?.value[0]?.address ?? null;
            const fromName = parsed.from?.value[0]?.name ?? null;

            // Deduplication: skip if this message was already imported
            if (messageId) {
              const existing = await prisma.ticket.findFirst({
                where: { emailMessageId: messageId },
              });
              if (existing) {
                await client.messageFlagsAdd(message.uid, ["\\Seen"], { uid: true });
                continue;
              }
            }

            await prisma.ticket.create({
              data: {
                id: crypto.randomUUID(),
                subject,
                body,
                fromEmail,
                fromName,
                source: "EMAIL",
                emailMessageId: messageId,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });

            // Mark as read only after a successful DB insert
            await client.messageFlagsAdd(message.uid, ["\\Seen"], { uid: true });
          } catch (msgErr) {
            console.error("[email-poller] Failed to process message:", msgErr);
            // Do NOT mark as seen on failure — will retry on next poll
          }
        }
      } finally {
        lock.release();
      }
      await client.logout();
    } catch (err) {
      console.error("[email-poller] IMAP connection error:", err);
      // Safe to call even if connect() never completed
      client.close();
    }
  }

  poll(); // run immediately on startup
  setInterval(poll, intervalMs);
}
