import { useState, useEffect } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { authClient } from "@/lib/auth-client";
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

// ---------------------------------------------------------------------------
// Fetchers
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

async function assignTicket(id: string, assignedToId: string | null): Promise<Ticket> {
  const { data } = await axios.patch<{ ticket: Ticket }>(
    `http://localhost:3000/api/tickets/${id}/assign`,
    { assignedToId },
    { withCredentials: true }
  );
  return data.ticket;
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const isOpen = status === "OPEN";
  return (
    <span
      className={
        isOpen
          ? "inline-flex items-center rounded-md px-2.5 py-0.5 text-sm font-medium ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-700/10"
          : "inline-flex items-center rounded-md px-2.5 py-0.5 text-sm font-medium ring-1 ring-inset bg-gray-50 text-gray-600 ring-gray-500/10"
      }
    >
      {status}
    </span>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <dt className="w-32 shrink-0 text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{children}</dd>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

  // Keep local state in sync if the ticket data changes (e.g. after mutation)
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

  function handleSave() {
    mutation.mutate(selectedId === "" ? null : selectedId);
  }

  const saveError = axios.isAxiosError(mutation.error)
    ? (mutation.error.response?.data as { error?: string })?.error ??
      mutation.error.message
    : (mutation.error as Error | null)?.message ?? null;

  return (
    <div className="flex flex-col gap-2">
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
          onClick={handleSave}
          disabled={!isDirty || mutation.isPending}
        >
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>

        {mutation.isSuccess && !isDirty && (
          <span className="text-sm text-emerald-600">Saved</span>
        )}
      </div>

      {saveError && (
        <p className="text-sm text-red-600">{saveError}</p>
      )}
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

            <DetailRow label="Category">
              {ticket.category || <span className="text-gray-400">—</span>}
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
        </CardContent>
      </Card>
    </div>
  );
}
