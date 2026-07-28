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

/** True only when the user is a Super Admin AND has toggled edit mode on. */
export function useEditMode() {
  const { editMode, setEditMode } = useContext(EditModeContext);
  const { hasRole } = useAuth();
  const canEdit = hasRole("SUPER_ADMIN");
  return { editMode: canEdit && editMode, canEdit, setEditMode };
}

/** Header toggle — visible to Super Admins only. */
export function EditModeToggle() {
  const { editMode, canEdit, setEditMode } = useEditMode();
  if (!canEdit) return null;
  return (
    <button
      type="button"
      onClick={() => setEditMode(!editMode)}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        editMode
          ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
          : "text-slate-500 hover:bg-slate-100"
      }`}
      title={editMode ? "Exit edit mode" : "Edit page content"}
    >
      <Icon name={editMode ? "edit_off" : "edit"} className="text-lg" />
      <span className="hidden lg:inline">{editMode ? "Editing" : "Edit"}</span>
    </button>
  );
}
