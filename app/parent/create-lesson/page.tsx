"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ParentBottomNav } from "@/components/shared/BottomNav";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Plus, Trash2, Save, Copy, ClipboardPaste, ChevronDown, ChevronUp, X } from "lucide-react";

interface Question { question: string; options: string[]; correct: string; }

const SUBJECTS = [
  { id: "math",    label: "Toán học",    emoji: "🔢" },
  { id: "viet",    label: "Tiếng Việt",  emoji: "📖" },
  { id: "eng",     label: "Tiếng Anh",   emoji: "🌍" },
  { id: "science", label: "Khoa học",    emoji: "🔬" },
  { id: "other",   label: "Môn khác",    emoji: "📚" },
];
const LEVELS = [
  { id: "basic",    label: "Cơ bản",    emoji: "🌱", desc: "Kiến thức nền tảng" },
  { id: "medium",   label: "Nâng cao",  emoji: "⭐", desc: "Luyện tập chuyên sâu" },
  { id: "advanced", label: "Thử thách", emoji: "🔥", desc: "Câu hỏi khó, tư duy cao" },
];

function buildPrompt(cfg: { subject: string; customSubject: string; grade: number; level: string; chapter: string; count: number; content: string }) {
  const subLabel = cfg.subject === "other" ? cfg.customSubject : SUBJECTS.find(s => s.id === cfg.subject)?.label;
  const lvLabel = LEVELS.find(l => l.id === cfg.level)?.label;
  return `Bạn là giáo viên tiểu học Việt Nam dạy môn ${subLabel}, lớp ${cfg.grade}.
Tạo ĐÚNG ${cfg.count} câu hỏi trắc nghiệm cấp độ "${lvLabel}"${cfg.chapter ? ` cho chủ đề "${cfg.chapter}"` : ""}.

Yêu cầu:
- Mỗi câu có ĐÚNG 4 lựa chọn (A, B, C, D)
- Chỉ có 1 đáp án đúng
- Ngôn ngữ phù hợp lớp ${cfg.grade}${cfg.content ? `\n- Dựa trên nội dung: "${cfg.content}"` : ""}
- CHỈ trả về JSON hợp lệ
- KHÔNG markdown
- KHÔNG giải thích ngoài JSON
- KHÔNG thêm text trước/sau JSON
- Trả về JSON trong code block markdown
- Sử dụng format:json
- Không thêm text ngoài code block

Format JSON:
[
  {
    "question": "Câu hỏi ở đây?",
    "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
    "correct": "Lựa chọn A"
  }
]`;
}

export default function CreateLessonPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Lesson info
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("math");
  const [customSubject, setCustomSubject] = useState("");
  const [grade, setGrade] = useState(3);
  const [level, setLevel] = useState("basic");
  const [chapter, setChapter] = useState("");

  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  // AI builder
  const [showBuilder, setShowBuilder] = useState(false);
  const [aiCount, setAiCount] = useState(5);
  const [aiContent, setAiContent] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/parent/login"); return; }
      setUserId(session.user.id);
    });
  }, [router]);

  async function handleCopyPrompt() {
    const p = buildPrompt({ subject, customSubject, grade, level, chapter, count: aiCount, content: aiContent });
    await navigator.clipboard.writeText(p);
    setCopied(true);
    toast.success("Đã copy prompt! Paste vào ChatGPT / Claude / Gemini 🚀");
    setTimeout(() => setCopied(false), 2500);
  }

  function handlePaste() {
    try {
      const clean = pasteText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const arr: Question[] = Array.isArray(parsed) ? parsed : (parsed.questions || []);
      const valid = arr.filter(q => q.question && Array.isArray(q.options) && q.options.length === 4 && q.correct);
      if (!valid.length) throw new Error("empty");
      setQuestions(prev => [...prev, ...valid]);
      toast.success(`📋 Đã thêm ${valid.length} câu hỏi!`);
      setShowPaste(false); setPasteText(""); setShowBuilder(false);
    } catch {
      toast.error("JSON không đúng định dạng. Cần đúng theo mẫu trong prompt.");
    }
  }

  function addBlank() {
    setQuestions(prev => [...prev, { question: "", options: ["","","",""], correct: "" }]);
    setExpandedQ(questions.length);
  }
  function updateQ(i: number, field: string, val: string) {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q));
  }
  function updateOpt(qi: number, oi: number, val: string) {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qi) return q;
      const opts = [...q.options]; opts[oi] = val;
      return { ...q, options: opts };
    }));
  }
  function removeQ(i: number) {
    setQuestions(prev => prev.filter((_, idx) => idx !== i));
    if (expandedQ === i) setExpandedQ(null);
  }

  async function handleSave() {
    if (!title.trim()) { toast.error("Nhập tên bài học nhé!"); return; }
    if (questions.length === 0) { toast.error("Cần ít nhất 1 câu hỏi!"); return; }
    const bad = questions.findIndex(q => !q.question.trim() || !q.correct || q.options.some(o => !o.trim()));
    if (bad >= 0) { toast.error(`Câu ${bad + 1} chưa đầy đủ!`); return; }
    if (!userId) return;
    setSaving(true);
    try {
      const { data: ls, error: lErr } = await supabase.from("lessons").insert({
        title: title.trim(),
        subject: subject === "other" ? (customSubject.trim() || "other") : subject,
        grade, level,
        chapter: chapter.trim() || null,
        created_by: userId,
        is_builtin: false,
        order_num: Date.now(),
      }).select().single();
      if (lErr) throw lErr;

      await supabase.from("lesson_questions").insert(
        questions.map((q, i) => ({
          lesson_id: ls.id,
          question: q.question,
          options: q.options,
          correct: q.correct,
          order_num: i,
        }))
      );
      toast.success("Đã lưu bài học! 🎉");
      router.push("/parent/dashboard");
    } catch { toast.error("Lỗi lưu bài học!"); }
    finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="page-header">
        <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="font-display font-black text-xl flex-1">Tạo bài học</h1>
        <button onClick={handleSave} disabled={saving || questions.length === 0}
          className="bg-green-500 text-white rounded-2xl px-4 py-2 font-extrabold text-sm flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-40 shadow-md shadow-green-200">
          <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu"}
        </button>
      </div>

      <div className="px-4 pt-5 space-y-4 max-w-2xl mx-auto">

        {/* ── Thông tin bài học ── */}
        <div className="card space-y-4">
          <h2 className="font-display font-black text-lg text-slate-800">📚 Thông tin bài học</h2>

          <div>
            <label className="field-label">Tên bài học</label>
            <input className="input-field mt-2" placeholder="VD: Phép nhân trong phạm vi 100"
              value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div>
            <label className="field-label">Chương / Chủ đề (tuỳ chọn)</label>
            <input className="input-field mt-2" placeholder="VD: Chương 2: Phép nhân chia"
              value={chapter} onChange={e => setChapter(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Môn học</label>
              <div className="flex flex-col gap-1.5 mt-2">
                {SUBJECTS.map(s => (
                  <button key={s.id} type="button" onClick={() => setSubject(s.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-extrabold text-sm border-2 transition-all text-left active:scale-95
                      ${subject === s.id ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
              {subject === "other" && (
                <input className="input-field mt-2 text-sm" placeholder="Nhập tên môn..."
                  value={customSubject} onChange={e => setCustomSubject(e.target.value)} />
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="field-label">Lớp</label>
                <div className="grid grid-cols-5 gap-1.5 mt-2">
                  {[1,2,3,4,5].map(g => (
                    <button key={g} type="button" onClick={() => setGrade(g)}
                      className={`py-2.5 rounded-xl font-extrabold text-sm border-2 transition-all active:scale-95
                        ${grade === g ? "bg-blue-500 border-blue-500 text-white" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="field-label">Cấp độ</label>
                <div className="flex flex-col gap-1.5 mt-2">
                  {LEVELS.map(lv => (
                    <button key={lv.id} type="button" onClick={() => setLevel(lv.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-extrabold text-sm border-2 transition-all text-left active:scale-95
                        ${level === lv.id ? "bg-purple-50 border-purple-400 text-purple-700" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                      <span>{lv.emoji}</span>
                      <div>
                        <div>{lv.label}</div>
                        <div className="text-xs font-semibold opacity-60">{lv.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── AI Builder ── */}
        <div className="card space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-display font-black text-base text-slate-800 leading-none">AI tạo câu hỏi</h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Copy prompt → paste kết quả từ ChatGPT/Claude</p>
            </div>
            <button onClick={() => { setShowBuilder(!showBuilder); setShowPaste(false); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl font-extrabold text-sm border-2 transition-all active:scale-95
                ${showBuilder ? "bg-purple-100 border-purple-400 text-purple-700" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
              {showBuilder ? <X className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {showBuilder ? "Đóng" : "Mở"}
            </button>
          </div>

          {showBuilder && (
            <div className="bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-200">
              <div>
                <label className="field-label">Số câu hỏi: <span className="text-blue-600 font-black">{aiCount}</span></label>
                <input type="range" min={3} max={15} step={1} value={aiCount}
                  onChange={e => setAiCount(Number(e.target.value))}
                  className="w-full mt-2 accent-purple-500" />
                <div className="flex justify-between text-xs text-slate-400 font-bold mt-1">
                  <span>3</span><span>8</span><span>15</span>
                </div>
              </div>

              <div>
                <label className="field-label">Nội dung tham khảo <span className="text-slate-400 font-semibold">(tuỳ chọn)</span></label>
                <textarea className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-purple-400 transition-all min-h-20 resize-none mt-2"
                  placeholder="Dán đoạn văn, bài thơ, hoặc mô tả chủ đề... (để trống để AI tự chọn)"
                  value={aiContent} onChange={e => setAiContent(e.target.value)} />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleCopyPrompt}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold text-sm border-2 transition-all active:scale-95
                    ${copied ? "bg-green-100 border-green-400 text-green-700" : "bg-white border-purple-300 text-purple-700 hover:bg-purple-50"}`}>
                  <Copy className="w-4 h-4" />
                  {copied ? "Đã copy! ✅" : "Copy Prompt"}
                </button>
                <button onClick={() => setShowPaste(!showPaste)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold text-sm border-2 transition-all active:scale-95
                    ${showPaste ? "bg-green-500 border-green-500 text-white" : "bg-green-50 border-green-300 text-green-700"}`}>
                  <ClipboardPaste className="w-4 h-4" />
                  Paste kết quả
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-semibold leading-relaxed">
                💡 Copy prompt → mở ChatGPT / Claude / Gemini → paste → copy toàn bộ JSON → nhấn &ldquo;Paste kết quả&rdquo;
              </div>

              {showPaste && (
                <div className="bg-white border-2 border-green-200 rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-extrabold text-slate-700">📋 Paste JSON từ AI vào đây</p>
                  <textarea
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-green-400 transition-all min-h-40 resize-none"
                    placeholder={'[\n  {\n    "question": "...",\n    "options": ["A","B","C","D"],\n    "correct": "A"\n  }\n]'}
                    value={pasteText} onChange={e => setPasteText(e.target.value)} autoFocus />
                  <button onClick={handlePaste} disabled={!pasteText.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold text-sm bg-green-500 text-white active:scale-95 transition-all shadow-lg shadow-green-200 disabled:opacity-40">
                    <ClipboardPaste className="w-5 h-5" />
                    Nhập câu hỏi từ kết quả
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Questions ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-lg text-slate-800">
              Câu hỏi <span className="text-blue-500">({questions.length})</span>
            </h2>
            <button onClick={addBlank}
              className="flex items-center gap-1.5 bg-blue-500 text-white rounded-2xl px-4 py-2 font-extrabold text-sm active:scale-95 transition-all shadow-md shadow-blue-200">
              <Plus className="w-4 h-4" /> Thêm thủ công
            </button>
          </div>

          {questions.length === 0 && (
            <div className="text-center py-10 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <div className="text-4xl mb-3">✨</div>
              <p className="font-display font-black text-slate-600">Chưa có câu hỏi nào</p>
              <p className="text-slate-400 text-sm mt-1">Dùng AI bên trên hoặc thêm thủ công</p>
            </div>
          )}

          {questions.map((q, qi) => (
            <div key={qi} className="card border-2 border-slate-200">
              <div className="flex items-center gap-2 cursor-pointer"
                onClick={() => setExpandedQ(expandedQ === qi ? null : qi)}>
                <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 font-black text-sm flex items-center justify-center flex-shrink-0">{qi + 1}</span>
                <p className="flex-1 font-bold text-slate-700 text-sm truncate">{q.question || "Câu hỏi chưa có nội dung..."}</p>
                <div className="flex items-center gap-1.5">
                  {q.correct && <span className="text-xs bg-green-100 text-green-700 font-extrabold px-2 py-0.5 rounded-lg">✓</span>}
                  <button onClick={e => { e.stopPropagation(); removeQ(qi); }}
                    className="p-1.5 rounded-xl bg-red-50 text-red-400 active:scale-90 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedQ === qi ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {expandedQ === qi && (
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <input className="input-field text-sm" placeholder="Câu hỏi..."
                    value={q.question} onChange={e => updateQ(qi, "question", e.target.value)} />
                  <div className="space-y-2">
                    <label className="field-label">Lựa chọn – bấm chữ cái để chọn đáp án đúng</label>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button type="button" onClick={() => updateQ(qi, "correct", opt)}
                          className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center flex-shrink-0 transition-all border-2
                            ${q.correct === opt && opt ? "bg-green-500 border-green-500 text-white" : "bg-slate-100 border-slate-200 text-slate-500"}`}>
                          {["A","B","C","D"][oi]}
                        </button>
                        <input className="input-field py-2.5 text-sm" placeholder={`Lựa chọn ${["A","B","C","D"][oi]}`}
                          value={opt} onChange={e => updateOpt(qi, oi, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {questions.length > 0 && (
            <button onClick={handleSave} disabled={saving}
              className="w-full py-4 rounded-2xl font-extrabold text-base bg-green-500 text-white flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-green-200 disabled:opacity-50">
              <Save className="w-5 h-5" />
              {saving ? "Đang lưu..." : `Lưu ${questions.length} câu hỏi`}
            </button>
          )}
        </div>
      </div>

      <ParentBottomNav />
    </div>
  );
}