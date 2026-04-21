"use client";
// lib/useRequireChild.ts
// Thay thế pattern: if (!childSession) router.replace("/student/enter-code")
// Đợi Zustand hydrate xong mới check → tránh redirect nhầm khi refresh

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

export function useRequireChild() {
  const router = useRouter();
  const childSession = useAppStore((s) => s.childSession);
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return; // chưa đọc xong localStorage → chờ
    if (!childSession) {
      router.replace("/student/enter-code");
    } else {
      setReady(true);
    }
  }, [hasHydrated, childSession, router]);

  return { childSession, ready };
}