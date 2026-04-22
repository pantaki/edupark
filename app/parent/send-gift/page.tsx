"use client";
// app/parent/send-gift/page.tsx
// "Gửi quà tặng kiến thức" — cha/mẹ gửi bài học kèm lời nhắn cho con

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ParentBottomNav } from "@/components/shared/BottomNav";
import { AVATAR_EMOJI, SUBJECTS } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Gift, Send, Heart } from "lucide-react";

interface Child    { id: string; name: string; avatar: string; grade: number; }
interface Lesson   { id: string; title: string; subject: string; grade: number; level: string; chapter: string; }
interface QuizSet  { id: string; title: string; subject: string; grade: number; }

const GIFT_EMOJIS = ["🎁","🌟","💌","🎀","⭐","🦁","🌈","🚀","💎","🍭","🎯","❤️","🏆","🎮","📚"];
const GIFT_TEMPLATES = [
  { emoji:"💌", text:"Con ơi, mẹ thấy con đang học rất chăm! Bài này sẽ giúp con giỏi hơn nữa nhé 💕" },
  { emoji:"🌟", text:"Thử thách hôm nay của ba gửi con đây! Ba tin con làm được 🔥" },
  { emoji:"🎁", text:"Mẹ thấy con thích học chủ đề này nên gửi tặng con nhé! Cố lên! 🥰" },
  { emoji:"🚀", text:"Hôm nay mình cùng khám phá kiến thức mới nào! Ba/Mẹ ở đây cổ vũ con 🚀" },
  { emoji:"🦁", text:"Sư tử con dũng cảm của ba! Chinh phục bài học này nhé! 🦁" },
];

export default function SendGiftPage() {
  const router = useRouter();
  const [userId, setUserId]     = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [lessons, setLessons]   = useState<Lesson[]>([]);
  const [quizzes, setQuizzes]   = useState<QuizSet[]>([]);

  // Form state
  const [selectedChild,  setSelectedChild]  = useState<string>("");
  const [giftType,       setGiftType]       = useState<"lesson"|"quiz">("lesson");
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [selectedQuiz,   setSelectedQuiz]   = useState<string>("");
  const [message,        setMessage]        = useState("");
  const [giftEmoji,      setGiftEmoji]      = useState("🎁");
  const [dueDate,        setDueDate]        = useState("");
  const [sending,        setSending]        = useState(false);
  const [filterSubject,  setFilterSubject]  = useState("all");
  const [sent,           setSent]           = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/parent/login"); return; }
      setUserId(session.user.id);

      const [{ data: kids }, { data: ls }, { data: qs }] = await Promise.all([
        supabase.from("children").select("id,name,avatar,grade").eq("parent_id", session.user.id),
        supabase.from("lessons").select("id,title,subject,grade,level,chapter").order("subject").order("grade").order("order_num"),
        supabase.from("quiz_sets").select("id,title,subject,grade").eq("is_public", true).order("created_at", { ascending: false }).limit(30),
      ]);
      setChildren(kids || []);
      setLessons(ls || []);
      setQuizzes(qs || []);
      if (kids?.length) setSelectedChild(kids[0].id);
    });
  }, [router]);

  // Filter lessons by selected child's grade
  const childGrade = children.find(c => c.id === selectedChild)?.grade || 3;
  const filteredLessons = lessons.filter(l =>
    l.grade === childGrade &&
    (filterSubject === "all" || l.subject === filterSubject)
  );

  async function handleSend() {
    if (!userId || !selectedChild) return;
    if (giftType === "lesson" && !selectedLesson) { toast.error("Chọn bài học muốn tặng nhé!"); return; }
    if (giftType === "quiz"   && !selectedQuiz)   { toast.error("Chọn bộ quiz muốn tặng nhé!"); return; }

    setSending(true);
    const child = children.find(c => c.id === selectedChild);
    const lessonTitle = giftType === "lesson"
      ? lessons.find(l => l.id === selectedLesson)?.title
      : quizzes.find(q => q.id === selectedQuiz)?.title;

    const { error } = await supabase.from("assignments").insert({
      parent_id: userId,
      child_id: selectedChild,
      lesson_id: giftType === "lesson" ? selectedLesson || null : null,
      quiz_id: giftType === "quiz" ? selectedQuiz || null : null,
      title: lessonTitle || "Bài học hôm nay",
      message: message.trim() || null,
      emoji_gift: giftEmoji,
      type: "gift",
      due_date: dueDate || null,
    });
    if (error) { toast.error("Không thể gửi quà!"); setSending(false); return; }

    // Also send a positive notification via messages
    if (message.trim()) {
      await supabase.from("messages").insert({
        from_user:   userId,
        to_child:    selectedChild,
        content:     `${giftEmoji} ${message.trim()}\n\n📚 Quà học tập: "${lessonTitle}"`,
        type:        "gift",
      });
    }

    setSending(false);
    setSent(true);
  }

  if (sent) {
    const child = children.find(c => c.id === selectedChild);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-8xl mb-4 animate-bounce">{giftEmoji}</div>
        <h1 className="font-display font-black text-3xl text-slate-800 text-center mb-2">
          Đã gửi quà tặng!
        </h1>
        <p className="text-slate-500 font-bold text-center mb-2">
          {child?.name} sẽ nhận được bài học đặc biệt từ bạn 💕
        </p>
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 max-w-sm w-full mt-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{giftEmoji}</span>
            <div>
              <p className="font-extrabold text-slate-700 text-sm">Lời nhắn của bạn:</p>
              <p className="text-slate-500 text-sm mt-1 font-semibold italic">
                &ldquo;{message || "Không có lời nhắn"}&rdquo;
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 w-full max-w-sm">
          <button onClick={() => { setSent(false); setSelectedLesson(""); setSelectedQuiz(""); setMessage(""); }}
            className="flex-1 border-2 border-slate-200 text-slate-700 font-extrabold rounded-2xl py-3 active:scale-95 transition-all">
            Gửi thêm
          </button>
          <button onClick={() => router.replace("/parent/dashboard")}
            className="flex-1 bg-blue-500 text-white font-extrabold rounded-2xl py-3 active:scale-95 transition-all shadow-lg shadow-blue-200">
            Trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 pb-24">
      {/* Header */}
      <div className="page-header bg-white/90 backdrop-blur">
        <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-xl">Gửi quà tặng kiến thức</h1>
          <p className="text-xs text-slate-400 font-semibold">Tặng bài học kèm lời nhắn yêu thương 💕</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4 max-w-2xl mx-auto">

        {/* Step 1: Chọn con */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-extrabold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-500 text-white rounded-full text-xs flex items-center justify-center font-black">1</span>
            Tặng cho bé nào?
          </h2>
          <div className="flex gap-2 flex-wrap">
            {children.map(c => (
              <button key={c.id} onClick={() => { setSelectedChild(c.id); setSelectedLesson(""); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-extrabold text-sm border-2 transition-all active:scale-95
                  ${selectedChild === c.id
                    ? "bg-purple-100 border-purple-400 text-purple-700"
                    : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                <span className="text-xl">{AVATAR_EMOJI[c.avatar] || "🐱"}</span>
                {c.name}
                <span className="text-xs opacity-60">Lớp {c.grade}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Chọn loại quà */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-extrabold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center font-black">2</span>
            Loại quà tặng
          </h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { id: "lesson" as const, icon: "📚", label: "Bài học", desc: "Gửi bài học để con khám phá" },
              { id: "quiz"   as const, icon: "🎮", label: "Thử thách Quiz", desc: "Gửi bộ câu hỏi vui" },
            ].map(t => (
              <button key={t.id} onClick={() => setGiftType(t.id)}
                className={`p-3 rounded-2xl border-2 text-left transition-all active:scale-95
                  ${giftType === t.id ? "bg-blue-50 border-blue-400" : "bg-slate-50 border-slate-200"}`}>
                <div className="text-2xl mb-1">{t.icon}</div>
                <p className={`font-extrabold text-sm ${giftType === t.id ? "text-blue-700" : "text-slate-700"}`}>{t.label}</p>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>

          {/* Filter by subject */}
          {giftType === "lesson" && (
            <>
              <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-hide">
                {[{ id:"all", label:"Tất cả", emoji:"📚" }, ...SUBJECTS.map(s => ({ id:s.id, label:s.label, emoji:s.emoji }))].map(s => (
                  <button key={s.id} onClick={() => setFilterSubject(s.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs border-2 transition-all
                      ${filterSubject === s.id ? "bg-blue-100 border-blue-400 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {filteredLessons.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-4 font-semibold">
                    Chưa có bài học nào cho lớp này
                  </p>
                )}
                {filteredLessons.map(l => {
                  const sub = SUBJECTS.find(s => s.id === l.subject);
                  const lvLabel: Record<string, string> = { basic:"Cơ bản", medium:"Nâng cao", advanced:"Thử thách" };
                  return (
                    <button key={l.id} onClick={() => setSelectedLesson(l.id)}
                      className={`w-full text-left px-3 py-3 rounded-2xl border-2 transition-all flex items-center gap-3
                        ${selectedLesson === l.id ? "bg-blue-50 border-blue-400" : "bg-slate-50 border-slate-200"}`}>
                      <span className="text-xl flex-shrink-0">{sub?.emoji || "📚"}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-extrabold text-sm truncate ${selectedLesson === l.id ? "text-blue-700" : "text-slate-700"}`}>
                          {l.title}
                        </p>
                        <p className="text-xs text-slate-400 font-semibold">{lvLabel[l.level]} • Lớp {l.grade}</p>
                      </div>
                      {selectedLesson === l.id && <span className="text-blue-500 text-lg flex-shrink-0">✓</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {giftType === "quiz" && (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {quizzes.map(q => {
                const sub = SUBJECTS.find(s => s.id === q.subject);
                return (
                  <button key={q.id} onClick={() => setSelectedQuiz(q.id)}
                    className={`w-full text-left px-3 py-3 rounded-2xl border-2 transition-all flex items-center gap-3
                      ${selectedQuiz === q.id ? "bg-blue-50 border-blue-400" : "bg-slate-50 border-slate-200"}`}>
                    <span className="text-xl flex-shrink-0">{sub?.emoji || "🎮"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-extrabold text-sm truncate ${selectedQuiz === q.id ? "text-blue-700" : "text-slate-700"}`}>
                        {q.title}
                      </p>
                      <p className="text-xs text-slate-400 font-semibold">{sub?.label} • Lớp {q.grade}</p>
                    </div>
                    {selectedQuiz === q.id && <span className="text-blue-500 text-lg flex-shrink-0">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 3: Lời nhắn */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-extrabold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-pink-500 text-white rounded-full text-xs flex items-center justify-center font-black">3</span>
            Lời nhắn yêu thương 💌
          </h2>

          {/* Icon picker */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {GIFT_EMOJIS.map(e => (
              <button key={e} onClick={() => setGiftEmoji(e)}
                className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border-2 transition-all active:scale-90
                  ${giftEmoji === e ? "border-pink-400 bg-pink-50 scale-110" : "border-slate-200 bg-slate-50"}`}>
                {e}
              </button>
            ))}
          </div>

          {/* Templates */}
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Gợi ý nhanh</p>
          <div className="space-y-1.5 mb-3">
            {GIFT_TEMPLATES.map((t, i) => (
              <button key={i} onClick={() => { setMessage(t.text); setGiftEmoji(t.emoji); }}
                className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 hover:border-pink-300 hover:bg-pink-50 transition-all text-sm text-slate-600 font-semibold active:scale-[0.99]">
                {t.emoji} {t.text.slice(0, 60)}...
              </button>
            ))}
          </div>

          <textarea
            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-pink-400 transition-all resize-none min-h-24"
            placeholder={`Nhập lời nhắn riêng cho ${children.find(c=>c.id===selectedChild)?.name || "con"}... (tuỳ chọn)`}
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={200}
          />
          <p className="text-right text-xs text-slate-400 font-semibold mt-1">{message.length}/200</p>

          {/* Due date */}
          <div className="mt-3">
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
              Hạn hoàn thành (tuỳ chọn)
            </label>
            <input type="date" className="input-field text-sm"
              value={dueDate} onChange={e => setDueDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]} />
          </div>
        </div>

        {/* Preview */}
        {(selectedLesson || selectedQuiz) && (
          <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-3xl p-4 border-2 border-pink-200">
            <p className="text-xs font-extrabold text-pink-600 uppercase tracking-wider mb-2">Xem trước quà tặng</p>
            <div className="flex items-start gap-3">
              <span className="text-3xl">{giftEmoji}</span>
              <div>
                <p className="font-extrabold text-slate-800">
                  {giftType === "lesson"
                    ? lessons.find(l => l.id === selectedLesson)?.title
                    : quizzes.find(q => q.id === selectedQuiz)?.title}
                </p>
                {message && <p className="text-slate-600 text-sm font-semibold mt-1 italic">&ldquo;{message}&rdquo;</p>}
              </div>
            </div>
          </div>
        )}

        {/* Send button */}
        <button onClick={handleSend}
          disabled={sending || !selectedChild || (giftType==="lesson" && !selectedLesson) || (giftType==="quiz" && !selectedQuiz)}
          className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-display font-black text-lg rounded-3xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-pink-200 disabled:opacity-40">
          {sending ? (
            <><span className="animate-spin">⏳</span> Đang gửi...</>
          ) : (
            <><Gift className="w-6 h-6" /> Gửi quà tặng!</>
          )}
        </button>

        <p className="text-center text-slate-400 text-xs font-semibold pb-2">
          💡 Con sẽ thấy quà tặng ngay khi mở ứng dụng
        </p>
      </div>

      <ParentBottomNav />
    </div>
  );
}