import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Child {
  id: string;
  name: string;
  code: string;
  avatar: string;
  grade: number;
  parent_id: string;
}

interface AppState {
  // Auth
  userId: string | null;
  userRole: "parent" | "student" | null;
  userName: string | null;
  // Student session (code-based)
  childSession: Child | null;
  // Actions
  setUser: (id: string, role: "parent" | "student", name: string) => void;
  setChildSession: (child: Child | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userId: null,
      userRole: null,
      userName: null,
      childSession: null,
      setUser: (id, role, name) => set({ userId: id, userRole: role, userName: name }),
      setChildSession: (child) => set({ childSession: child }),
      logout: () => set({ userId: null, userRole: null, userName: null, childSession: null }),
    }),
    {
      name: "hoc-vui-store",
      partialize: (state) => ({
        childSession: state.childSession,
      }),
    }
  )
);
