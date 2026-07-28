import { createContext, useContext, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/ui/icon";

interface EditModeValue {
  editMode: boolean;
  setEditMode: (on: boolean) => void;
}

const EditModeContext = createContext<EditModeValue>({ editMode: false, setEditMode: () => {} });

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [editMode, setEditMode] = useState(false);
  return (
    <EditModeContext.Provider value={{ editMode, setEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
}

/**
 * Edit mode is available from ADMIN up:
 * - SUPER_ADMIN: full authoring (edit/publish/archive everything)
 * - ADMIN: contribute mode (add blocks + edit own drafts; suggest on the rest)
 */
export function useEditMode() {
  const { editMode, setEditMode } = useContext(EditModeContext);
  const { hasRole, user } = useAuth();
  const canEdit = hasRole("ADMIN");
  const isSuperAdmin = hasRole("SUPER_ADMIN");
  return {
    editMode: canEdit && editMode,
    canEdit,
    isSuperAdmin,
    userId: user?.id ?? "",
    setEditMode,
  };
}

/** Sidebar toggle — "Edit" for Super Admins, "Contribute" for Admins. */
export function EditModeToggle() {
  const { editMode, canEdit, isSuperAdmin, setEditMode } = useEditMode();
  if (!canEdit) return null;
  const label = isSuperAdmin ? "Edit pages" : "Contribute";
  return (
    <button
      type="button"
      onClick={() => setEditMode(!editMode)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        editMode
          ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
          : "text-slate-600 hover:bg-slate-100"
      }`}
      title={editMode ? "Exit edit mode" : label}
    >
      <Icon name={editMode ? "edit_off" : "edit"} className="text-xl" />
      {editMode ? "Editing on" : label}
    </button>
  );
}
