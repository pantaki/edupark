"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAppStore } from "@/lib/store";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const { childSession } = useAppStore();

  useEffect(() => {
    // If child session active → go to student app
    if (childSession) {
      router.replace("/student/subjects");
      return;
    }
    // If parent logged in → go to dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/parent/dashboard");
    });
  }, [childSession, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #667eea 0%, #764ba2 50%, #f093fb 100%)" }}>

      {/* Decorative blobs */}
      <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute top-1/2 left-0 w-24 h-24 rounded-full bg-yellow-300/20 blur-2xl" />

      {/* Stars decoration */}
      {["10%,15%", "85%,20%", "5%,70%", "90%,75%", "50%,5%"].map((pos, i) => (
        <div key={i} className="absolute text-white/30 text-2xl animate-bounce-slow"
          style={{ left: pos.split(",")[0], top: pos.split(",")[1], animationDelay: `${i * 0.4}s` }}>
          ⭐
        </div>
      ))}

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Mascot */}
        <div className="text-8xl animate-float mb-4 drop-shadow-2xl">🦉</div>

        {/* Title */}
        <h1 className="font-display text-5xl font-black text-white text-center drop-shadow-lg">
          Học Vui!
        </h1>
        <p className="text-white/80 font-bold text-lg text-center mt-2 mb-10">
          Học thật vui – Giỏi thật nhanh ✨
        </p>

        {/* Role cards */}
        <div className="w-full grid grid-cols-2 gap-4">
          <Link href="/parent/login"
            className="flex flex-col items-center gap-3 bg-white/20 backdrop-blur-md border-2 border-white/30 rounded-3xl p-6 active:scale-95 transition-all duration-150 hover:bg-white/30 cursor-pointer">
            <span className="text-5xl">👨‍👩‍👧</span>
            <span className="font-display font-black text-white text-lg">Cha / Mẹ</span>
            <span className="text-white/70 text-xs text-center font-semibold">Quản lý & theo dõi con</span>
          </Link>

          <Link href="/student/enter-code"
            className="flex flex-col items-center gap-3 bg-white/20 backdrop-blur-md border-2 border-white/30 rounded-3xl p-6 active:scale-95 transition-all duration-150 hover:bg-white/30 cursor-pointer">
            <span className="text-5xl">🧒</span>
            <span className="font-display font-black text-white text-lg">Học Sinh</span>
            <span className="text-white/70 text-xs text-center font-semibold">Vào học ngay thôi!</span>
          </Link>
        </div>

        {/* Quiz room quick join */}
        <Link href="/quiz/join"
          className="mt-4 w-full flex items-center justify-center gap-2 bg-yellow-400 text-yellow-900 font-display font-black text-lg rounded-3xl py-4 active:scale-95 transition-all shadow-lg shadow-yellow-500/30 hover:bg-yellow-300">
          🎮 Vào phòng Quiz ngay!
        </Link>

        <p className="text-white/50 text-xs font-semibold mt-8">
          Made with ❤️ for little learners
        </p>
      </div>
    </main>
  );
}
