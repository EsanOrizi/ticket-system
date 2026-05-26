import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@base-ui/react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface DeleteUserModalProps {
  user: User | null;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteUserModal({ user, onOpenChange }: DeleteUserModalProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`http://localhost:3000/api/users/${id}`, {
        withCredentials: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
  });

  const serverError = mutation.error
    ? axios.isAxiosError(mutation.error)
      ? (mutation.error.response?.data as { error?: string })?.error ??
        mutation.error.message
      : (mutation.error as Error).message
    : null;

  function handleCancel() {
    mutation.reset();
    onOpenChange(false);
  }

  return (
    <Dialog.Root
      open={user !== null}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
          <Dialog.Title className="mb-2 text-lg font-semibold text-gray-900">
            Delete user
          </Dialog.Title>

          {user && (
            <>
              <p className="mb-5 text-sm text-gray-500">
                Are you sure you want to delete{" "}
                <span className="font-medium text-gray-900">{user.name}</span>?
                They will be signed out immediately and will no longer appear in
                the system.
              </p>

              {serverError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(user.id)}
                >
                  {mutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
