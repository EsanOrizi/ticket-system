import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import CreateUserForm from "./CreateUserForm";

// ---------------------------------------------------------------------------
// Axios mock — keep isAxiosError working so server-error paths are real
// ---------------------------------------------------------------------------
vi.mock("axios", async (importActual) => {
  const actual = await importActual<typeof import("axios")>();
  return {
    default: {
      ...actual.default,
      post: vi.fn(),
    },
  };
});

const mockedPost = vi.mocked(axios.post);

// ---------------------------------------------------------------------------
// Helper — fresh QueryClient + spy on invalidateQueries per test
// ---------------------------------------------------------------------------
function renderForm(props?: Partial<{ onSuccess: () => void; onCancel: () => void }>) {
  const onSuccess = props?.onSuccess ?? vi.fn();
  const onCancel = props?.onCancel ?? vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

  render(
    <QueryClientProvider client={queryClient}>
      <CreateUserForm onSuccess={onSuccess} onCancel={onCancel} />
    </QueryClientProvider>
  );

  return { onSuccess, onCancel, invalidateSpy };
}

// Helpers to get the three fields and the submit button
const nameInput = () => screen.getByLabelText(/name/i);
const emailInput = () => screen.getByLabelText(/email/i);
const passwordInput = () => screen.getByLabelText(/password/i);
const submitButton = () => screen.getByRole("button", { name: /create user/i });
const cancelButton = () => screen.getByRole("button", { name: /cancel/i });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("CreateUserForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  describe("initial render", () => {
    it("renders Name, Email and Password fields", () => {
      renderForm();
      expect(nameInput()).toBeInTheDocument();
      expect(emailInput()).toBeInTheDocument();
      expect(passwordInput()).toBeInTheDocument();
    });

    it("renders a Cancel button and an enabled Create User button", () => {
      renderForm();
      expect(cancelButton()).toBeInTheDocument();
      expect(submitButton()).toBeEnabled();
    });

    it("starts with all fields empty", () => {
      renderForm();
      expect(nameInput()).toHaveValue("");
      expect(emailInput()).toHaveValue("");
      expect(passwordInput()).toHaveValue("");
    });
  });

  // -------------------------------------------------------------------------
  describe("field validation", () => {
    it("shows an error when Name is left blank", async () => {
      renderForm();
      await userEvent.click(submitButton());
      await waitFor(() => {
        expect(screen.getByText(/name must be at least 3 characters/i)).toBeInTheDocument();
      });
    });

    it("shows an error when Name is shorter than 3 characters", async () => {
      renderForm();
      await userEvent.type(nameInput(), "AB");
      await userEvent.click(submitButton());
      await waitFor(() => {
        expect(screen.getByText(/name must be at least 3 characters/i)).toBeInTheDocument();
      });
    });

    it("shows an error when Email is left blank", async () => {
      renderForm();
      await userEvent.click(submitButton());
      await waitFor(() => {
        expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it("shows an error when Email is not a valid address", async () => {
      renderForm();
      await userEvent.type(emailInput(), "not-an-email");
      await userEvent.click(submitButton());
      await waitFor(() => {
        expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it("shows an error when Password is left blank", async () => {
      renderForm();
      await userEvent.click(submitButton());
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it("shows an error when Password is shorter than 8 characters", async () => {
      renderForm();
      await userEvent.type(passwordInput(), "abc123");
      await userEvent.click(submitButton());
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it("does not call the API when the form is invalid", async () => {
      renderForm();
      await userEvent.click(submitButton());
      await waitFor(() => {
        expect(screen.getByText(/name must be at least 3 characters/i)).toBeInTheDocument();
      });
      expect(mockedPost).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe("cancel button", () => {
    it("calls onCancel when Cancel is clicked", async () => {
      const { onCancel } = renderForm();
      await userEvent.click(cancelButton());
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it("does not call onSuccess when Cancel is clicked", async () => {
      const { onSuccess } = renderForm();
      await userEvent.click(cancelButton());
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe("pending state", () => {
    it("disables the submit button and shows 'Creating…' while the request is in flight", async () => {
      // Never resolve so the mutation stays pending
      mockedPost.mockReturnValue(new Promise(() => {}));
      renderForm();

      await userEvent.type(nameInput(), "Alice Admin");
      await userEvent.type(emailInput(), "alice@example.com");
      await userEvent.type(passwordInput(), "password123");
      await userEvent.click(submitButton());

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("successful submission", () => {
    const VALID = {
      name: "Alice Admin",
      email: "alice@example.com",
      password: "password123",
    };

    beforeEach(() => {
      mockedPost.mockResolvedValue({ data: {} });
    });

    it("POSTs to /api/users with the form values and credentials", async () => {
      renderForm();

      await userEvent.type(nameInput(), VALID.name);
      await userEvent.type(emailInput(), VALID.email);
      await userEvent.type(passwordInput(), VALID.password);
      await userEvent.click(submitButton());

      await waitFor(() => {
        expect(mockedPost).toHaveBeenCalledWith(
          "http://localhost:3000/api/users",
          VALID,
          { withCredentials: true }
        );
      });
    });

    it("calls onSuccess after a successful submission", async () => {
      const { onSuccess } = renderForm();

      await userEvent.type(nameInput(), VALID.name);
      await userEvent.type(emailInput(), VALID.email);
      await userEvent.type(passwordInput(), VALID.password);
      await userEvent.click(submitButton());

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledOnce();
      });
    });

    it("invalidates the 'users' query after a successful submission", async () => {
      const { invalidateSpy } = renderForm();

      await userEvent.type(nameInput(), VALID.name);
      await userEvent.type(emailInput(), VALID.email);
      await userEvent.type(passwordInput(), VALID.password);
      await userEvent.click(submitButton());

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["users"] });
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("server error", () => {
    it("shows the error message returned by the server", async () => {
      const serverError = Object.assign(new Error("Request failed"), {
        isAxiosError: true,
        response: { data: { error: "Email already in use" } },
      });
      mockedPost.mockRejectedValue(serverError);
      renderForm();

      await userEvent.type(nameInput(), "Alice Admin");
      await userEvent.type(emailInput(), "alice@example.com");
      await userEvent.type(passwordInput(), "password123");
      await userEvent.click(submitButton());

      await waitFor(() => {
        expect(screen.getByText("Email already in use")).toBeInTheDocument();
      });
    });

    it("falls back to the axios message when the response has no error field", async () => {
      const serverError = Object.assign(new Error("Network Error"), {
        isAxiosError: true,
        response: undefined,
      });
      mockedPost.mockRejectedValue(serverError);
      renderForm();

      await userEvent.type(nameInput(), "Alice Admin");
      await userEvent.type(emailInput(), "alice@example.com");
      await userEvent.type(passwordInput(), "password123");
      await userEvent.click(submitButton());

      await waitFor(() => {
        expect(screen.getByText("Network Error")).toBeInTheDocument();
      });
    });

    it("shows a generic message for non-axios errors", async () => {
      mockedPost.mockRejectedValue(new Error("Unexpected failure"));
      renderForm();

      await userEvent.type(nameInput(), "Alice Admin");
      await userEvent.type(emailInput(), "alice@example.com");
      await userEvent.type(passwordInput(), "password123");
      await userEvent.click(submitButton());

      await waitFor(() => {
        expect(screen.getByText("Unexpected failure")).toBeInTheDocument();
      });
    });

    it("does not call onSuccess when the request fails", async () => {
      mockedPost.mockRejectedValue(
        Object.assign(new Error("Server down"), { isAxiosError: true, response: undefined })
      );
      const { onSuccess } = renderForm();

      await userEvent.type(nameInput(), "Alice Admin");
      await userEvent.type(emailInput(), "alice@example.com");
      await userEvent.type(passwordInput(), "password123");
      await userEvent.click(submitButton());

      await waitFor(() => {
        expect(screen.getByText("Server down")).toBeInTheDocument();
      });
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
