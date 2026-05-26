import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CreateUserModal from "@/components/CreateUserModal";
import EditUserModal from "@/components/EditUserModal";
import DeleteUserModal from "@/components/DeleteUserModal";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

async function fetchUsers(): Promise<User[]> {
  const { data } = await axios.get<{ users: User[] }>(
    "http://localhost:3000/api/users",
    { withCredentials: true }
  );
  return data.users;
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "ADMIN";
  return (
    <span
      className={
        isAdmin
          ? "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset bg-indigo-50 text-indigo-700 ring-indigo-700/10"
          : "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset bg-gray-50 text-gray-600 ring-gray-500/10"
      }
    >
      {role}
    </span>
  );
}

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
      {initials}
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

export default function UsersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const errorMessage = axios.isAxiosError(error)
    ? (error.response?.data as { error?: string })?.error ?? error.message
    : error?.message ?? null;

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
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Joined</th>
                    <th className="px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-8 rounded-full" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                      </td>
                      <td className="px-6 py-3"><Skeleton className="h-4 w-44" /></td>
                      <td className="px-6 py-3"><Skeleton className="h-5 w-14 rounded-md" /></td>
                      <td className="px-6 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-3"></td>
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
          <CardTitle className="text-xl font-semibold">Users</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {users.length} {users.length === 1 ? "member" : "members"}
            </span>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              Create New User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">
              No users found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Joined</th>
                    <th className="px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={user.name} />
                          <span className="font-medium text-gray-900">
                            {user.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{user.email}</td>
                      <td className="px-6 py-3">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => setEditingUser(user)}
                            aria-label={`Edit ${user.name}`}
                          >
                            <Pencil />
                          </Button>
                          {user.role !== "ADMIN" && (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => setDeletingUser(user)}
                              aria-label={`Delete ${user.name}`}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateUserModal open={modalOpen} onOpenChange={setModalOpen} />
      <EditUserModal
        user={editingUser}
        onOpenChange={(open) => { if (!open) setEditingUser(null); }}
      />
      <DeleteUserModal
        user={deletingUser}
        onOpenChange={(open) => { if (!open) setDeletingUser(null); }}
      />
    </div>
  );
}
