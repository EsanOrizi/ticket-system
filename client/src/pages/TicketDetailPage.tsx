import { useState, useEffect } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  TICKET_STATUSES,
  TICKET_CATEGORIES,
  createReplySchema,
  type TicketStatus,
  type TicketCategory,
  type CreateReplyInput,
} from "@ticket-system/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssignedUser {
  id: string;
  name: string;
  email: string;
}

interface Ticket {
  id: string;
  subject: string;
  body: string;
  status: string;
  category: string;
  assignedToId: string | null;
  assignedTo: AssignedUser | null;
  fromEmail: string | null;
  fromName: string | null;
  source: string;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ReplyAuthor {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Reply {
  id: string;
  ticketId: string;
  authorId: string;
  author: ReplyAuthor;
  body: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Fetchers / mutators
// ---------------------------------------------------------------------------

async function fetchTicket(id: string): Promise<Ticket> {
  const { data } = await axios.get<{ ticket: Ticket }>(
    `http://localhost:3000/api/tickets/${id}`,
    { withCredentials: true }
  );
  return data.ticket;
}

async function fetchAgents(): Promise<Agent[]> {
  const { data } = await axios.get<{ users: Agent[] }>(
    "http://localhost:3000/api/users",
    { withCredentials: true }
  );
  return data.users.filter((u) => u.role === "AGENT");
}

async function fetchReplies(ticketId: string): Promise<Reply[]> {
  const { data } = await axios.get<{ replies: Reply[] }>(
    `http://localhost:3000/api/tickets/${ticketId}/replies`,
    { withCredentials: true }
  );
  return data.replies;
}

async function patchTicket(
  id: string,
  body: { status?: string; category?: string }
): Promise<Ticket> {
  const { data } = await axios.patch<{ ticket: Ticket }>(
    `http://localhost:3000/api/tickets/${id}`,
    body,
    { withCredentials: true }
  );
  return data.ticket;
}

async function assignTicket(id: string, assignedToId: string | null): Promise<Ticket> {
  const { data } = await axios.patch<{ ticket: Ticket }>(
    `http://localhost:3000/api/tickets/${id}/assign`,
    { assignedToId },
    { withCredentials: true }
  );
  return data.ticket;
}

async function postReply(ticketId: string, body: string): Promise<Reply> {
  const { data } = await axios.post<{ reply: Reply }>(
    `http://localhost:3000/api/tickets/${ticketId}/replies`,
    { body },
    { withCredentials: true }
  );
  return data.reply;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <dt className="w-32 shrink-0 text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline field control (reusable for status + category)
// ---------------------------------------------------------------------------

function InlineSelectControl<T extends string>({
  testId,
  value,
  options,
  badgeClass,
  onSave,
}: {
  testId: string;
  value: T;
  options: readonly T[];
  badgeClass?: (v: T) => string;
  onSave: (next: T) => Promise<void>;
}) {
  const [selected, setSelected] = useState<T>(value);
  const [isPending, setIsPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(value);
    setSaved(false);
    setError(null);
  }, [value]);

  const isDirty = selected !== value;

  async function handleSave() {
    setIsPending(true);
    setError(null);
    setSaved(false);
    try {
      await onSave(selected);
      setSaved(true);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string })?.error ?? err.message
        : (err as Error).message;
      setError(msg);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <select
          data-testid={testId}
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value as T);
            setSaved(false);
            setError(null);
          }}
          className={`rounded-md border px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            badgeClass ? badgeClass(selected) : "border-gray-300 bg-white text-gray-900"
          }`}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {toLabel(opt)}
            </option>
          ))}
        </select>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={!isDirty || isPending}
        >
          {isPending ? "Saving…" : "Save"}
        </Button>

        {saved && !isDirty && (
          <span className="text-sm text-emerald-600">Saved</span>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assign control (admin only)
// ---------------------------------------------------------------------------

function AssignControl({
  ticketId,
  currentAssignedToId,
  agents,
}: {
  ticketId: string;
  currentAssignedToId: string | null;
  agents: Agent[];
}) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>(currentAssignedToId ?? "");

  useEffect(() => {
    setSelectedId(currentAssignedToId ?? "");
  }, [currentAssignedToId]);

  const mutation = useMutation({
    mutationFn: (assignedToId: string | null) =>
      assignTicket(ticketId, assignedToId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
  });

  const isDirty = selectedId !== (currentAssignedToId ?? "");

  const saveError = axios.isAxiosError(mutation.error)
    ? (mutation.error.response?.data as { error?: string })?.error ??
      mutation.error.message
    : (mutation.error as Error | null)?.message ?? null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <select
          data-testid="assign-agent-select"
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            mutation.reset();
          }}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">— Unassigned —</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>

        <Button
          data-testid="assign-save-button"
          size="sm"
          onClick={() => mutation.mutate(selectedId === "" ? null : selectedId)}
          disabled={!isDirty || mutation.isPending}
        >
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>

        {mutation.isSuccess && !isDirty && (
          <span className="text-sm text-emerald-600">Saved</span>
        )}
      </div>
      {saveError && <p className="text-sm text-red-600">{saveError}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge (read-only display)
// ---------------------------------------------------------------------------

function statusBadgeClass(status: string) {
  switch (status) {
    case "OPEN":
      return "bg-emerald-50 text-emerald-700 ring-emerald-700/10";
    case "IN_PROGRESS":
      return "bg-blue-50 text-blue-700 ring-blue-700/10";
    case "RESOLVED":
      return "bg-purple-50 text-purple-700 ring-purple-700/10";
    case "CLOSED":
      return "bg-gray-50 text-gray-600 ring-gray-500/10";
    default:
      return "bg-gray-50 text-gray-600 ring-gray-500/10";
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-sm font-medium ring-1 ring-inset ${statusBadgeClass(status)}`}
    >
      {toLabel(status)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Reply thread
// ---------------------------------------------------------------------------

function ReplyBubble({ reply }: { reply: Reply }) {
  const initials = reply.author.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isAdmin = reply.author.role === "ADMIN";

  return (
    <div
      data-testid="reply-item"
      className="flex gap-3"
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${
          isAdmin ? "bg-violet-500" : "bg-blue-500"
        }`}
      >
        {initials}
      </div>

      {/* Bubble */}
      <div className="flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-semibold text-gray-900">{reply.author.name}</span>
          <span
            className={`text-xs font-medium ${isAdmin ? "text-violet-600" : "text-blue-600"}`}
          >
            {isAdmin ? "Admin" : "Agent"}
          </span>
          <span className="text-xs text-gray-400" title={formatDate(reply.createdAt)}>
            {formatRelativeDate(reply.createdAt)}
          </span>
        </div>
        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2 text-sm leading-relaxed text-gray-800 ring-1 ring-inset ring-gray-200">
          {reply.body}
        </p>
      </div>
    </div>
  );
}

function ReplyThread({ ticketId }: { ticketId: string }) {
  const queryClient = useQueryClient();

  const { data: replies = [], isLoading } = useQuery({
    queryKey: ["replies", ticketId],
    queryFn: () => fetchReplies(ticketId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateReplyInput>({
    resolver: zodResolver(createReplySchema),
  });

  const mutation = useMutation({
    mutationFn: (values: CreateReplyInput) => postReply(ticketId, values.body),
    onSuccess: () => {
      reset();
      void queryClient.invalidateQueries({ queryKey: ["replies", ticketId] });
    },
  });

  const serverError = axios.isAxiosError(mutation.error)
    ? (mutation.error.response?.data as { error?: string })?.error ??
      mutation.error.message
    : (mutation.error as Error | null)?.message ?? null;

  return (
    <div className="mt-6 border-t pt-6">
      <h3 className="mb-4 text-sm font-medium text-gray-500">
        Replies{replies.length > 0 ? ` (${replies.length})` : ""}
      </h3>

      {/* Thread */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : replies.length === 0 ? (
        <p className="mb-4 text-sm text-gray-400">No replies yet. Be the first to reply.</p>
      ) : (
        <div className="mb-6 space-y-4">
          {replies.map((reply) => (
            <ReplyBubble key={reply.id} reply={reply} />
          ))}
        </div>
      )}

      {/* Reply form */}
      <form
        data-testid="reply-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="mt-4 space-y-2"
      >
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <textarea
          data-testid="reply-body-input"
          {...register("body")}
          rows={4}
          placeholder="Write a reply…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          disabled={mutation.isPending}
          onChange={() => {
            if (mutation.isError) mutation.reset();
          }}
        />
        {errors.body && (
          <p className="text-sm text-destructive">{errors.body.message}</p>
        )}

        <div className="flex justify-end">
          <Button
            data-testid="reply-submit-button"
            type="submit"
            disabled={mutation.isPending}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {mutation.isPending ? "Sending…" : "Send Reply"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = authClient.useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";
  const queryClient = useQueryClient();

  const {
    data: ticket,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => fetchTicket(id!),
    enabled: !!id,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    enabled: isAdmin,
  });

  const errorMessage = axios.isAxiosError(error)
    ? (error.response?.data as { error?: string })?.error ?? error.message
    : (error as Error | null)?.message ?? null;

  // ---- Loading skeleton -------------------------------------------------------
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="mb-6 h-5 w-28" />
        <Card>
          <CardHeader className="border-b pb-4">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="mt-2 h-5 w-20" />
          </CardHeader>
          <CardContent className="pt-6">
            <dl className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </dl>
            <div className="mt-6 border-t pt-6">
              <Skeleton className="mb-2 h-4 w-16" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Error state ------------------------------------------------------------
  if (errorMessage) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          to="/tickets"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tickets
        </Link>
        <Alert variant="destructive" className="mt-4">
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{errorMessage}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!ticket) return null;

  async function handleStatusSave(status: TicketStatus) {
    await patchTicket(id!, { status });
    await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
  }

  async function handleCategorySave(category: TicketCategory) {
    await patchTicket(id!, { category });
    await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
  }

  // ---- Loaded ----------------------------------------------------------------
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/tickets"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tickets
      </Link>

      <Card className="mt-4">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle
              data-testid="ticket-detail-subject"
              className="text-xl font-semibold leading-snug"
            >
              {ticket.subject}
            </CardTitle>
            {/* Always show the read-only badge alongside the editable control */}
            <StatusBadge status={ticket.status} />
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <dl className="space-y-4">
            {(ticket.fromName || ticket.fromEmail) && (
              <DetailRow label="From">
                {ticket.fromName && (
                  <span className="font-medium">{ticket.fromName}</span>
                )}
                {ticket.fromName && ticket.fromEmail && " "}
                {ticket.fromEmail && (
                  <span className="text-gray-500">
                    {"<"}
                    {ticket.fromEmail}
                    {">"}
                  </span>
                )}
              </DetailRow>
            )}

            <DetailRow label="Status">
              <InlineSelectControl<TicketStatus>
                testId="ticket-status-select"
                value={ticket.status as TicketStatus}
                options={TICKET_STATUSES}
                onSave={handleStatusSave}
              />
            </DetailRow>

            <DetailRow label="Category">
              <InlineSelectControl<TicketCategory>
                testId="ticket-category-select"
                value={ticket.category as TicketCategory}
                options={TICKET_CATEGORIES}
                onSave={handleCategorySave}
              />
            </DetailRow>

            <DetailRow label="Assigned to">
              {isAdmin ? (
                <AssignControl
                  ticketId={ticket.id}
                  currentAssignedToId={ticket.assignedToId}
                  agents={agents}
                />
              ) : ticket.assignedTo ? (
                <span data-testid="ticket-assignee">{ticket.assignedTo.name}</span>
              ) : (
                <span className="text-gray-400">Unassigned</span>
              )}
            </DetailRow>

            <DetailRow label="Source">
              <span className="capitalize lowercase">{ticket.source}</span>
            </DetailRow>
            <DetailRow label="Created">
              {formatDate(ticket.createdAt)}
            </DetailRow>
          </dl>

          {ticket.body && (
            <div className="mt-6 border-t pt-6">
              <h3 className="mb-2 text-sm font-medium text-gray-500">
                Description
              </h3>
              <p
                data-testid="ticket-detail-body"
                className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800"
              >
                {ticket.body}
              </p>
            </div>
          )}

          {/* Reply thread + form */}
          <ReplyThread ticketId={ticket.id} />
        </CardContent>
      </Card>
    </div>
  );
}
