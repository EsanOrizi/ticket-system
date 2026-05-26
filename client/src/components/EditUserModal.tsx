import { Dialog } from "@base-ui/react";
import EditUserForm from "@/components/EditUserForm";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface EditUserModalProps {
  user: User | null;
  onOpenChange: (open: boolean) => void;
}

export default function EditUserModal({ user, onOpenChange }: EditUserModalProps) {
  return (
    <Dialog.Root open={user !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
          <Dialog.Title className="mb-5 text-lg font-semibold text-gray-900">
            Edit User
          </Dialog.Title>
          {user && (
            <EditUserForm
              key={user.id}
              user={user}
              onSuccess={() => onOpenChange(false)}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
