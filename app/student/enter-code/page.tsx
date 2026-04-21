"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EnterCodePage() {
  const router = useRouter();
  const { setChildSession } = useAppStore();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  function handleBack() {
    // Xóa session cũ để trang chủ không tự redirect vào student
    setChildSession(null);
    router.replace("/");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length < 4) {
      toast.error("Mã không đúng!");
      return;
    }
    setLoading(true);
    try {
      const { data: child, error } = await supabase
        .from("children")
        .select("*")
        .eq("code", code.trim().toUpperCase())
        .single();
      if (error || !child) {
        toast.error("Mã không đúng! Hỏi ba/mẹ lại nhé 🙈");
        return;
      }
      setChildSession(child);
      toast.success(`Chào ${child.name}! 🎉`);
      router.replace("/student/subjects");
    } catch {
      toast.error("Có lỗi xảy ra, thử lại nhé!");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        background: "linear-gradient(160deg, #43e97b 0%, #38f9d7 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-white/80 font-bold mb-6 hover:text-white transition-colors active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" /> Quay lại
        </button>

        <div className="text-center mb-6">
          <div className="text-7xl animate-float mb-3 block">🎒</div>
          <h1 className="font-display text-3xl font-black text-white drop-shadow">
            Nhập mã học sinh!
          </h1>
          <p className="text-white/80 font-bold mt-1">Hỏi ba/mẹ lấy mã nhé</p>
        </div>

        <div className="bg-white rounded-4xl p-6 shadow-2xl">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3 text-center">
                Mã học sinh (6 ký tự)
              </label>
              <input
                className="w-full text-center text-4xl font-display font-black tracking-widest border-3 border-slate-200 rounded-2xl px-4 py-4 focus:outline-none focus:border-green-400 focus:bg-green-50 transition-all uppercase bg-slate-50"
                style={{ letterSpacing: "0.3em", borderWidth: 3 }}
                type="text"
                maxLength={8}
                placeholder="ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length < 4}
              className="btn-fun bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg shadow-green-200 mt-2"
            >
              {loading ? "⏳ Đang kiểm tra..." : "▶️ Vào học thôi!"}
            </button>
          </form>
        </div>

        <Link
          href="/quiz/join"
          className="mt-4 flex items-center justify-center gap-2 text-white font-extrabold text-lg py-3 active:scale-95 transition-all"
        >
          🎮 Vào phòng Quiz ngay
        </Link>
      </div>
    </main>
  );
}
