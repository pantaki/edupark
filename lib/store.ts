"use client";
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
  userId: string | null;
  userRole: "parent" | "student" | null;
  userName: string | null;
  childSession: Child | null;
  darkMode: boolean;
  _hasHydrated: boolean;
  setUser: (id: string, role: "parent" | "student", name: string) => void;
  setChildSession: (child: Child | null) => void;
  toggleDarkMode: () => void;
  logout: () => void;
  setHasHydrated: (val: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userId: null,
      userRole: null,
      userName: null,
      childSession: null,
      darkMode: false,
      _hasHydrated: false,
      setUser: (id, role, name) =>
        set({ userId: id, userRole: role, userName: name }),
      setChildSession: (child) => set({ childSession: child }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      logout: () =>
        set({
          userId: null,
          userRole: null,
          userName: null,
          childSession: null,
        }),
      setHasHydrated: (val) => set({ _hasHydrated: val }),
    }),
    {
      name: "hoc-vui-store",
      partialize: (state) => ({
        childSession: state.childSession,
        darkMode: state.darkMode,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
