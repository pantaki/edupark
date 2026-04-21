import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function generateRoomCode(): string {
  return "ROOM" + generateCode(4);
}

export const AVATARS = ["bear", "cat", "dog", "fox", "lion", "panda", "rabbit", "tiger"];

export const AVATAR_EMOJI: Record<string, string> = {
  bear: "🐻", cat: "🐱", dog: "🐶", fox: "🦊",
  lion: "🦁", panda: "🐼", rabbit: "🐰", tiger: "🐯",
};

export const SUBJECTS = [
  {
    id: "math",
    label: "Toán học",
    emoji: "🔢",
    color: "from-blue-500 to-purple-500",
  },
  {
    id: "viet",
    label: "Tiếng Việt",
    emoji: "📖",
    color: "from-orange-500 to-red-500",
  },
  {
    id: "eng",
    label: "Tiếng Anh",
    emoji: "🌍",
    color: "from-green-500 to-teal-500",
  },
  {
    id: "science",
    label: "Khoa học",
    emoji: "🔬",
    color: "from-purple-500 to-purple-600",
  },
];

export const GRADES = [1, 2, 3, 4, 5];

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}
