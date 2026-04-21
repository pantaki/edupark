"use client";
import { useAppStore } from "@/lib/store";
import { Moon, Sun } from "lucide-react";

export function DarkModeToggle() {
  const { darkMode, toggleDarkMode } = useAppStore();

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      title={darkMode ? "Chế độ sáng" : "Chế độ tối"}
    >
      {darkMode ? (
        <Sun className="w-5 h-5 text-yellow-500" />
      ) : (
        <Moon className="w-5 h-5 text-slate-600" />
      )}
    </button>
  );
}
