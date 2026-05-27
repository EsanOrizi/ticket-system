import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

async function fetchTickets(): Promise<Ticket[]> {
  const { data } = await axios.get<{ tickets: Ticket[] }>(
    "http://localhost:3000/api/tickets",
    { withCredentials: true }
  );
  return data.tickets;
}

function StatusBadge({ status }: { status: string }) {
  const isOpen = status === "OPEN";
  return (
    <span
      data-testid="ticket-status-badge"
      className={
        isOpen
          ? "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-700/10"
          : "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset bg-gray-50 text-gray-600 ring-gray-500/10"
      }
    >
      {status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function TicketsPage() {
  const {
    data: tickets = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
  });

  const errorMessage = axios.isAxiosError(error)
    ? (error.response?.data as { error?: string })?.error ?? error.message
    : (error as Error | null)?.message ?? null;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-6 py-3">Subject</th>
                    <th className="px-6 py-3">From</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-3">
                        <Skeleton className="h-4 w-48" />
                      </td>
                      <td className="px-6 py-3">
                        <Skeleton className="h-4 w-36" />
                      </td>
                      <td className="px-6 py-3">
                        <Skeleton className="h-5 w-14 rounded-md" />
                      </td>
                      <td className="px-6 py-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Alert variant="destructive">
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Tickets</CardTitle>
          <span data-testid="tickets-count" className="text-sm text-gray-500">
            {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {tickets.length === 0 ? (
            <p
              data-testid="tickets-empty-state"
              className="px-6 py-8 text-center text-sm text-gray-400"
            >
              No tickets yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="tickets-table">
                <thead>
                  <tr className="border-t bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-6 py-3">Subject</th>
                    <th className="px-6 py-3">From</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      data-testid="ticket-row"
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td
                        data-testid="ticket-subject"
                        className="px-6 py-3 font-medium text-gray-900"
                      >
                        {ticket.subject}
                      </td>
                      <td
                        data-testid="ticket-from"
                        className="px-6 py-3 text-gray-600"
                      >
                        {ticket.fromName && (
                          <span className="block font-medium text-gray-800">
                            {ticket.fromName}
                          </span>
                        )}
                        {ticket.fromEmail && (
                          <span className="block text-xs text-gray-500">
                            {ticket.fromEmail}
                          </span>
                        )}
                        {!ticket.fromName && !ticket.fromEmail && (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td
                        data-testid="ticket-date"
                        className="px-6 py-3 text-gray-500"
                      >
                        {formatDate(ticket.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
