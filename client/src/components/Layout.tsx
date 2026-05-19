import { Link, Outlet, useNavigate } from "react-router-dom";
import { authClient } from "../lib/auth-client";

export default function Layout() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-gray-900">
            Ticket System
          </span>
          <div className="flex items-center gap-4">
            {(session?.user as { role?: string })?.role === "ADMIN" && (
              <Link to="/users" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                Users
              </Link>
            )}
            <span className="text-sm text-gray-500">{session?.user.name}</span>
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
