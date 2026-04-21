"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const { darkMode } = useAppStore();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return <>{children}</>;
}
