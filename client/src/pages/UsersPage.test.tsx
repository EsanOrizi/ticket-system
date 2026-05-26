import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import UsersPage from "./UsersPage";

// ---------------------------------------------------------------------------
// Axios mock — keep isAxiosError working so the error-handling path is real
// ---------------------------------------------------------------------------
vi.mock("axios", async (importActual) => {
  const actual = await importActual<typeof import("axios")>();
  return {
    default: {
      ...actual.default,
      get: vi.fn(),
    },
  };
});

const mockedGet = vi.mocked(axios.get);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const USERS = [
  {
    id: "1",
    name: "Alice Admin",
    email: "alice@example.com",
    role: "ADMIN",
    createdAt: "2024-01-15T10:00:00.000Z",
  },
  {
    id: "2",
    name: "Bob Agent",
    email: "bob@example.com",
    role: "AGENT",
    createdAt: "2024-03-22T08:30:00.000Z",
  },
];

// ---------------------------------------------------------------------------
// Helper — fresh QueryClient per test (no shared cache between tests)
// ---------------------------------------------------------------------------
function renderUsersPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <UsersPage />
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("renders skeleton rows while the query is in flight", () => {
      // Never resolve so the component stays in the loading state
      mockedGet.mockReturnValue(new Promise(() => {}));

      renderUsersPage();

      // 5 circular avatar skeletons (size-8 rounded-full) indicate skeleton rows
      const avatarSkeletons = document
        .querySelectorAll(".size-8.rounded-full");
      expect(avatarSkeletons).toHaveLength(5);
    });

    it("still shows the table header columns while loading", () => {
      mockedGet.mockReturnValue(new Promise(() => {}));

      renderUsersPage();

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Role")).toBeInTheDocument();
      expect(screen.getByText("Joined")).toBeInTheDocument();
    });
  });

  describe("success state", () => {
    beforeEach(() => {
      mockedGet.mockResolvedValue({ data: { users: USERS } });
    });

    it("renders a row for each user", async () => {
      renderUsersPage();

      await waitFor(() => {
        expect(screen.getByText("Alice Admin")).toBeInTheDocument();
        expect(screen.getByText("Bob Agent")).toBeInTheDocument();
      });
    });

    it("displays each user's email", async () => {
      renderUsersPage();

      await waitFor(() => {
        expect(screen.getByText("alice@example.com")).toBeInTheDocument();
        expect(screen.getByText("bob@example.com")).toBeInTheDocument();
      });
    });

    it("shows the correct role badge for each user", async () => {
      renderUsersPage();

      await waitFor(() => {
        expect(screen.getByText("ADMIN")).toBeInTheDocument();
        expect(screen.getByText("AGENT")).toBeInTheDocument();
      });
    });

    it("shows the member count in the card header", async () => {
      renderUsersPage();

      await waitFor(() => {
        expect(screen.getByText("2 members")).toBeInTheDocument();
      });
    });

    it('shows "1 member" (singular) when there is exactly one user', async () => {
      mockedGet.mockResolvedValue({ data: { users: [USERS[0]] } });

      renderUsersPage();

      await waitFor(() => {
        expect(screen.getByText("1 member")).toBeInTheDocument();
      });
    });

    it("formats the joined date correctly", async () => {
      renderUsersPage();

      await waitFor(() => {
        expect(screen.getByText("Jan 15, 2024")).toBeInTheDocument();
        expect(screen.getByText("Mar 22, 2024")).toBeInTheDocument();
      });
    });

    it("renders initials in the avatar for each user", async () => {
      renderUsersPage();

      await waitFor(() => {
        expect(screen.getByText("AA")).toBeInTheDocument(); // Alice Admin
        expect(screen.getByText("BA")).toBeInTheDocument(); // Bob Agent
      });
    });
  });

  describe("empty state", () => {
    it('shows "No users found." when the list is empty', async () => {
      mockedGet.mockResolvedValue({ data: { users: [] } });

      renderUsersPage();

      await waitFor(() => {
        expect(screen.getByText("No users found.")).toBeInTheDocument();
      });
    });
  });

  describe("error state", () => {
    it("shows the server error message when the request fails", async () => {
      const serverError = Object.assign(new Error("Request failed"), {
        isAxiosError: true,
        response: { data: { error: "Forbidden" } },
      });
      mockedGet.mockRejectedValue(serverError);

      renderUsersPage();

      await waitFor(() => {
        expect(screen.getByText("Forbidden")).toBeInTheDocument();
      });
    });

    it("shows a Retry button when the request fails", async () => {
      mockedGet.mockRejectedValue(
        Object.assign(new Error("Network Error"), { isAxiosError: true, response: undefined })
      );

      renderUsersPage();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
      });
    });

    it("re-fetches when the Retry button is clicked", async () => {
      mockedGet
        .mockRejectedValueOnce(
          Object.assign(new Error("Network Error"), { isAxiosError: true, response: undefined })
        )
        .mockResolvedValueOnce({ data: { users: USERS } });

      renderUsersPage();

      const retryButton = await screen.findByRole("button", { name: /retry/i });
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText("Alice Admin")).toBeInTheDocument();
      });

      expect(mockedGet).toHaveBeenCalledTimes(2);
    });
  });
});
