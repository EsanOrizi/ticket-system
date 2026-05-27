import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowData,
} from "@tanstack/react-table";
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Extend ColumnMeta so column definitions can carry testId + className
// ---------------------------------------------------------------------------
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    testId?: string;
    className?: string;
  }
}

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

interface TicketsResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Fetcher — passes sort + pagination params to the server
// ---------------------------------------------------------------------------

async function fetchTickets(
  sortBy: string,
  sortOrder: "asc" | "desc",
  page: number,
  pageSize: number
): Promise<TicketsResponse> {
  const { data } = await axios.get<TicketsResponse>(
    "http://localhost:3000/api/tickets",
    { withCredentials: true, params: { sortBy, sortOrder, page, pageSize } }
  );
  return data;
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

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

function SortIcon({ direction }: { direction: "asc" | "desc" | false }) {
  if (direction === "asc")
    return <ArrowUp className="ml-1.5 inline-block h-3.5 w-3.5" />;
  if (direction === "desc")
    return <ArrowDown className="ml-1.5 inline-block h-3.5 w-3.5" />;
  return (
    <ArrowUpDown className="ml-1.5 inline-block h-3.5 w-3.5 opacity-40" />
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const columns: ColumnDef<Ticket>[] = [
  {
    accessorKey: "subject",
    meta: { testId: "ticket-subject", className: "px-6 py-3 font-medium text-gray-900" },
    header: ({ column }) => (
      <button
        onClick={column.getToggleSortingHandler()}
        className="flex cursor-pointer items-center hover:text-gray-700"
      >
        Subject
        <SortIcon direction={column.getIsSorted()} />
      </button>
    ),
    cell: ({ getValue, row }) => (
      <Link
        to={`/tickets/${row.original.id}`}
        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
      >
        {getValue<string>()}
      </Link>
    ),
  },
  {
    id: "fromName",
    accessorKey: "fromName",
    meta: { testId: "ticket-from", className: "px-6 py-3 text-gray-600" },
    header: ({ column }) => (
      <button
        onClick={column.getToggleSortingHandler()}
        className="flex cursor-pointer items-center hover:text-gray-700"
      >
        From
        <SortIcon direction={column.getIsSorted()} />
      </button>
    ),
    cell: ({ row }) => {
      const { fromName, fromEmail } = row.original;
      if (!fromName && !fromEmail)
        return <span className="text-gray-400">—</span>;
      return (
        <>
          {fromName && (
            <span className="block font-medium text-gray-800">{fromName}</span>
          )}
          {fromEmail && (
            <span className="block text-xs text-gray-500">{fromEmail}</span>
          )}
        </>
      );
    },
  },
  {
    accessorKey: "status",
    meta: { className: "px-6 py-3" },
    header: ({ column }) => (
      <button
        onClick={column.getToggleSortingHandler()}
        className="flex cursor-pointer items-center hover:text-gray-700"
      >
        Status
        <SortIcon direction={column.getIsSorted()} />
      </button>
    ),
    cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
  },
  {
    accessorKey: "createdAt",
    sortDescFirst: true,
    meta: { testId: "ticket-date", className: "px-6 py-3 text-gray-500" },
    header: ({ column }) => (
      <button
        onClick={column.getToggleSortingHandler()}
        className="flex cursor-pointer items-center hover:text-gray-700"
      >
        Date
        <SortIcon direction={column.getIsSorted()} />
      </button>
    ),
    cell: ({ getValue }) => formatDate(getValue<string>()),
  },
];

const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TicketsPage() {
  // Default: newest tickets first
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [page, setPage] = useState(1);

  // Derive the server-side params from the TanStack sorting state.
  // When the user clears all sorting (empty array), fall back to the default.
  const sortBy = sorting[0]?.id ?? "createdAt";
  const sortOrder: "asc" | "desc" =
    sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : "desc";

  // Reset to page 1 whenever sorting changes
  function handleSortingChange(updater: SortingState | ((old: SortingState) => SortingState)) {
    setSorting(updater);
    setPage(1);
  }

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tickets", sortBy, sortOrder, page, PAGE_SIZE],
    queryFn: () => fetchTickets(sortBy, sortOrder, page, PAGE_SIZE),
  });

  const tickets = data?.tickets ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  const errorMessage = axios.isAxiosError(error)
    ? (error.response?.data as { error?: string })?.error ?? error.message
    : (error as Error | null)?.message ?? null;

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    manualSorting: true, // sorting is done by the server, not the client
    getCoreRowModel: getCoreRowModel(),
  });

  // ---- Loading skeleton -------------------------------------------------------
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

  // ---- Error state ------------------------------------------------------------
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

  // ---- Loaded ----------------------------------------------------------------
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Tickets</CardTitle>
          <span data-testid="tickets-count" className="text-sm text-gray-500">
            {total} {total === 1 ? "ticket" : "tickets"}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {table.getRowModel().rows.length === 0 ? (
            <p
              data-testid="tickets-empty-state"
              className="px-6 py-8 text-center text-sm text-gray-400"
            >
              No tickets yet.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="tickets-table">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr
                        key={headerGroup.id}
                        className="border-t bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                      >
                        {headerGroup.headers.map((header) => (
                          <th key={header.id} className="px-6 py-3">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        data-testid="ticket-row"
                        className="transition-colors hover:bg-gray-50"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            data-testid={cell.column.columnDef.meta?.testId}
                            className={
                              cell.column.columnDef.meta?.className ?? "px-6 py-3"
                            }
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination bar */}
              <div
                data-testid="pagination"
                className="flex items-center justify-between border-t px-6 py-3"
              >
                <span
                  data-testid="pagination-info"
                  className="text-sm text-gray-500"
                >
                  Showing {firstItem}–{lastItem} of {total}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    data-testid="pagination-prev"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  <span
                    data-testid="pagination-page"
                    className="min-w-[6rem] text-center text-sm text-gray-600"
                  >
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    data-testid="pagination-next"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
