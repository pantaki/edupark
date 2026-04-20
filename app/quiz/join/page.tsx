"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Gamepad2 } from "lucide-react";

export default function JoinRoomPage() {
  const router = useRouter();
  const { childSession } = useAppStore();
  const [code, setCode] = useState("");
  const [name, setName] = useState(childSession?.name || "");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) { toast.error("Nhập mã phòng nhé!"); return; }
    if (!name.trim()) { toast.error("Nhập tên của bạn nhé!"); return; }
    setLoading(true);
    try {
      const { data: room, error } = await supabase.from("rooms").select("*").eq("code", code.trim().toUpperCase()).single();
      if (error || !room) { toast.error("Không tìm thấy phòng! Kiểm tra lại mã nhé 🔍"); return; }
      if (room.status === "finished") { toast.error("Phòng này đã kết thúc rồi!"); return; }

      // Join as player - check if already joined first
      const session = await supabase.auth.getSession();
      const uid = session.data.session?.user.id || null;

      // Check if already in the room (by display_name to avoid duplicate join)
      const { data: existing } = await supabase.from("room_players")
        .select("id").eq("room_id", room.id).eq("display_name", name.trim()).single();

      if (!existing) {
        const { error: joinErr } = await supabase.from("room_players").insert({
          room_id: room.id,
          user_id: uid,
          child_id: childSession?.id || null,
          display_name: name.trim(),
          avatar: childSession?.avatar || "cat",
          score: 0,
        });

        if (joinErr) {
          console.error("Join error:", joinErr);
          throw joinErr;
        }
      }

      toast.success(`Đã vào phòng ${room.code}! 🎮`);
      router.push(`/quiz/room/${room.code}?name=${encodeURIComponent(name.trim())}`);
    } catch (err) {
      console.error(err);
      toast.error("Không thể vào phòng. Thử lại nhé!");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "linear-gradient(160deg, #f97316 0%, #fbbf24 100%)" }}>
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 text-white/80 font-bold mb-6 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" /> Quay lại
        </Link>

        <div className="text-center mb-6">
          <div className="text-7xl mb-3 animate-float">🎮</div>
          <h1 className="font-display text-3xl font-black text-white drop-shadow">Vào phòng Quiz!</h1>
          <p className="text-white/80 font-bold mt-1">Cùng bạn bè cạnh tranh nhé</p>
        </div>

        <div className="bg-white rounded-4xl p-6 shadow-2xl">
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Mã phòng</label>
              <input
                className="w-full text-center text-3xl font-display font-black tracking-widest bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-orange-400 transition-all uppercase"
                type="text" maxLength={8} placeholder="ROOM1234"
                value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                autoFocus autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Tên của bạn</label>
              <input
                className="input-field"
                type="text" placeholder="Nhập tên hiển thị..."
                value={name} onChange={e => setName(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading || !code.trim() || !name.trim()}
              className="btn-fun bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg shadow-orange-200">
              {loading ? "⏳ Đang vào..." : "🚀 Vào phòng ngay!"}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <p className="text-white/70 font-semibold text-sm mb-3">Muốn tạo phòng mới?</p>
          <Link href="/quiz/create"
            className="flex items-center justify-center gap-2 bg-white/20 text-white font-extrabold rounded-2xl py-3 px-6 active:scale-95 transition-all border-2 border-white/30">
            <Gamepad2 className="w-5 h-5" /> Tạo phòng Quiz
          </Link>
        </div>
      </div>
    </main>
  );
}