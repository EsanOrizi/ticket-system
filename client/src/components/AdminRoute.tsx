import { Navigate, Outlet } from "react-router-dom";
import { authClient } from "../lib/auth-client";

export default function AdminRoute() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
