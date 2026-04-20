"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { generateRoomCode, SUBJECTS } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Gamepad2 } from "lucide-react";

interface QuizSet { id: string; title: string; subject: string; grade: number; }

export default function CreateRoomPage() {
  const router = useRouter();
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string>("");
  const [hostName, setHostName] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id);
        const { data: profile } = await supabase.from("users").select("name").eq("id", session.user.id).single();
        setHostName(profile?.name || "");
      }
      const { data: quizzes } = await supabase.from("quiz_sets").select("id,title,subject,grade").eq("is_public", true).order("created_at", { ascending: false }).limit(20);
      setQuizSets(quizzes || []);
    });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!hostName.trim()) { toast.error("Nhập tên host nhé!"); return; }
    setLoading(true);
    try {
      const code = generateRoomCode();
      const { data: room, error } = await supabase.from("rooms").insert({
        code,
        host_id: userId || null,
        quiz_id: selectedQuiz || null,
        status: "waiting",
      }).select().single();
      if (error) throw error;

      // Host joins as player
      await supabase.from("room_players").insert({
        room_id: room.id,
        user_id: userId || null,
        display_name: hostName.trim(),
        avatar: "bear",
        score: 0,
      });

      toast.success(`Phòng ${code} đã tạo! 🎮`);
      router.push(`/quiz/room/${code}?name=${encodeURIComponent(hostName.trim())}&host=1`);
    } catch {
      toast.error("Không thể tạo phòng!");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "linear-gradient(160deg, #8b5cf6 0%, #ec4899 100%)" }}>
      <div className="w-full max-w-sm">
        <Link href="/quiz/join" className="flex items-center gap-2 text-white/80 font-bold mb-6 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" /> Quay lại
        </Link>

        <div className="text-center mb-6">
          <div className="text-7xl mb-3 animate-float">🏆</div>
          <h1 className="font-display text-3xl font-black text-white drop-shadow">Tạo phòng Quiz!</h1>
          <p className="text-white/80 font-bold mt-1">Mời bạn bè vào cùng chơi</p>
        </div>

        <div className="bg-white rounded-4xl p-6 shadow-2xl">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Tên của bạn (Host)</label>
              <input className="input-field" type="text" placeholder="Nhập tên hiển thị..."
                value={hostName} onChange={e => setHostName(e.target.value)} required />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Chọn bộ câu hỏi (tuỳ chọn)</label>
              {quizSets.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <button type="button" onClick={() => setSelectedQuiz("")}
                    className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-sm border-2 transition-all
                      ${!selectedQuiz ? "bg-purple-50 border-purple-400 text-purple-700" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                    🎲 Câu hỏi ngẫu nhiên
                  </button>
                  {quizSets.map(q => {
                    const sub = SUBJECTS.find(s => s.id === q.subject);
                    return (
                      <button key={q.id} type="button" onClick={() => setSelectedQuiz(q.id)}
                        className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-sm border-2 transition-all
                          ${selectedQuiz === q.id ? "bg-purple-50 border-purple-400 text-purple-700" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                        <span>{sub?.emoji || "📚"}</span> {q.title}
                        <span className="text-slate-400 ml-1">· Lớp {q.grade}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-500 text-sm font-semibold">Chưa có bộ câu hỏi nào</p>
                  <Link href="/parent/create-quiz" className="text-blue-500 text-sm font-extrabold">+ Tạo bộ câu hỏi</Link>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading || !hostName.trim()}
              className="btn-fun bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200">
              <Gamepad2 className="w-5 h-5 inline mr-2" />
              {loading ? "⏳ Đang tạo..." : "🚀 Tạo phòng ngay!"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
