import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Ticket {
  id: string;
  subject: string;
  body: string;
  status: string;
  category: string;
  assignedToId: string | null;
  fromEmail: string | null;
  fromName: string | null;
  source: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchTicket(id: string): Promise<Ticket> {
  const { data } = await axios.get<{ ticket: Ticket }>(
    `http://localhost:3000/api/tickets/${id}`,
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
// Page
// ---------------------------------------------------------------------------

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: ticket, isLoading, error, refetch } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => fetchTicket(id!),
    enabled: !!id,
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
              {Array.from({ length: 4 }).map((_, i) => (
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
                  <span className="text-gray-500">{"<"}{ticket.fromEmail}{">"}</span>
                )}
              </DetailRow>
            )}
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
