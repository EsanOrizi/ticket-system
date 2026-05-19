import { Outlet, useNavigate } from "react-router-dom";
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
      <nav className="border-b border-navy-900 bg-[#0f172a]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-white">
            Ticket System
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">{session?.user.name}</span>
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
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
