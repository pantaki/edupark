"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ParentBottomNav } from "@/components/shared/BottomNav";
import { toast } from "sonner";
import {
  ArrowLeft, Sparkles, Plus, Trash2, Save,
  ChevronDown, ChevronUp, Copy, ClipboardPaste, X
} from "lucide-react";

interface Question { question: string; options: string[]; correct: string; }

/* ── Prompt config ── */
const PROMPT_SUBJECTS = [
  { id: "math",    label: "Toán học",   emoji: "🔢" },
  { id: "viet",    label: "Tiếng Việt", emoji: "📖" },
  { id: "eng",     label: "Tiếng Anh",  emoji: "🌍" },
  { id: "science", label: "Khoa học",   emoji: "🔬" },
  { id: "custom",  label: "Môn khác",   emoji: "📚" },
];
const PROMPT_TYPES = [
  { id: "lesson",    label: "Bài học",      emoji: "📝", desc: "Kiến thức cơ bản" },
  { id: "story",     label: "Đọc hiểu",     emoji: "📖", desc: "Từ đoạn văn / bài thơ" },
  { id: "quiz_game", label: "Quiz vui",      emoji: "🎮", desc: "Câu hỏi thú vị, đố vui" },
  { id: "review",    label: "Ôn tập",        emoji: "🔁", desc: "Tổng hợp kiến thức" },
];

function buildPrompt(cfg: {
  type: string; subject: string; customSubject: string;
  grade: number; count: number; content: string;
}): string {
  const subjectLabel = cfg.subject === "custom"
    ? cfg.customSubject
    : PROMPT_SUBJECTS.find(s => s.id === cfg.subject)?.label || cfg.subject;
  const typeLabel = PROMPT_TYPES.find(t => t.id === cfg.type)?.label || cfg.type;
  return `Bạn là giáo viên tiểu học Việt Nam chuyên môn ${subjectLabel}, lớp ${cfg.grade}.
Tạo ĐÚNG ${cfg.count} câu hỏi trắc nghiệm dạng "${typeLabel}" cho học sinh lớp ${cfg.grade}.

Yêu cầu:
- Mỗi câu có ĐÚNG 4 lựa chọn (A, B, C, D)
- Chỉ có 1 đáp án đúng
- Ngôn ngữ đơn giản, phù hợp lớp ${cfg.grade}
- Câu hỏi rõ ràng, không mơ hồ${cfg.content ? `\n- Dựa trên nội dung: "${cfg.content}"` : ""}
- CHỈ trả về JSON hợp lệ
- KHÔNG markdown
- KHÔNG giải thích ngoài JSON
- KHÔNG thêm text trước/sau JSON
- Trả về JSON trong code block markdown
- Sử dụng format:json
- Không thêm text ngoài code block
Trả về JSON hợp lệ, KHÔNG có markdown, KHÔNG có giải thích thêm:
[
  {
    "question": "Câu hỏi ở đây?",
    "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
    "correct": "Lựa chọn A"
  }
]`;
}

export default function CreateQuizPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  /* ── Questions ── */
  const [questions, setQuestions] = useState<Question[]>([]);

  /* ── Manual form (shown when clicking "+ Thêm thủ công") ── */
  const [showManual, setShowManual] = useState(false);
  const [title, setTitle]     = useState("");
  const [subject, setSubject] = useState("math");
  const [grade, setGrade]     = useState(3);

  /* ── Prompt builder ── */
  const [showBuilder, setShowBuilder] = useState(false);
  const [pbSubject, setPbSubject]         = useState("math");
  const [pbCustomSubject, setPbCustomSubject] = useState("");
  const [pbType, setPbType]               = useState("lesson");
  const [pbGrade, setPbGrade]             = useState(3);
  const [pbCount, setPbCount]             = useState(5);
  const [pbContent, setPbContent]         = useState("");
  const [promptCopied, setPromptCopied]   = useState(false);

  /* ── Paste result ── */
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/parent/login"); return; }
      setUserId(session.user.id);
    });
  }, [router]);

  /* ── Copy prompt ── */
  async function handleCopyPrompt() {
    const p = buildPrompt({ type: pbType, subject: pbSubject, customSubject: pbCustomSubject, grade: pbGrade, count: pbCount, content: pbContent });
    await navigator.clipboard.writeText(p);
    setPromptCopied(true);
    toast.success("Đã copy prompt! Paste vào ChatGPT / Claude / Gemini 🚀");
    setTimeout(() => setPromptCopied(false), 2500);
  }

  /* ── Parse pasted JSON ── */
  function handlePasteResult() {
    try {
      const clean = pasteText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const arr: Question[] = Array.isArray(parsed) ? parsed : (parsed.questions || []);
      const valid = arr.filter(q => q.question && Array.isArray(q.options) && q.options.length === 4 && q.correct);
      if (!valid.length) throw new Error("empty");
      setQuestions(prev => [...prev, ...valid]);
      toast.success(`📋 Đã thêm ${valid.length} câu hỏi!`);
      setShowPaste(false);
      setPasteText("");
      setShowBuilder(false);
    } catch {
      toast.error("Định dạng không hợp lệ. Cần JSON theo mẫu trong prompt.");
    }
  }

  /* ── Manual question helpers ── */
  function addBlankQuestion() {
    setQuestions(prev => [...prev, { question: "", options: ["", "", "", ""], correct: "" }]);
    setExpandedQ(questions.length);
  }
  function updateQuestion(i: number, field: string, value: string) {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  }
  function updateOption(qi: number, oi: number, value: string) {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qi) return q;
      const opts = [...q.options]; opts[oi] = value;
      return { ...q, options: opts };
    }));
  }
  function removeQuestion(i: number) {
    setQuestions(prev => prev.filter((_, idx) => idx !== i));
  }

  /* ── Save ── */
  async function handleSave() {
    if (!title.trim()) { toast.error("Nhập tên bộ quiz nhé!"); setShowManual(true); return; }
    if (questions.length === 0) { toast.error("Cần ít nhất 1 câu hỏi!"); return; }
    const invalid = questions.findIndex(q => !q.question.trim() || !q.correct || q.options.some(o => !o.trim()));
    if (invalid >= 0) { toast.error(`Câu ${invalid + 1} chưa đầy đủ!`); return; }
    if (!userId) return;
    setSaving(true);
    try {
      const { data: quiz, error: qErr } = await supabase.from("quiz_sets").insert({
        created_by: userId, title: title.trim(), subject, grade, is_public: true,
      }).select().single();
      if (qErr) throw qErr;
      await supabase.from("questions").insert(
        questions.map((q, i) => ({ quiz_id: quiz.id, question: q.question, options: q.options, correct: q.correct, order_num: i }))
      );
      toast.success("Đã lưu bộ câu hỏi! 🎉");
      router.push("/parent/dashboard");
    } catch { toast.error("Lỗi lưu quiz"); }
    finally { setSaving(false); }
  }

  /* ═══════════════════════════════ UI ═══════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50 pb-24">

      {/* ── Header ── */}
      <div className="page-header">
        <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="font-display font-black text-xl flex-1">Tạo bộ Quiz</h1>
        <button onClick={handleSave} disabled={saving || questions.length === 0}
          className="bg-green-500 text-white rounded-2xl px-4 py-2 font-extrabold text-sm flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-40 shadow-md shadow-green-200">
          <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu"}
        </button>
      </div>

      <div className="px-4 pt-5 space-y-4 max-w-2xl mx-auto">

        {/* ── Tên bộ quiz (luôn hiển thị) ── */}
        <div className="card space-y-2">
          <label className="field-label text-base font-black text-slate-700">🏷️ Tên bộ quiz</label>
          <input
            className="input-field text-base font-bold"
            placeholder="VD: Toán lớp 3 – Phép nhân"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {/* ── SECTION 1: AI Prompt Builder ── */}
        <div className="card space-y-4">
          {/* Title row */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-display font-black text-lg text-slate-800 leading-none">AI tạo câu hỏi</h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Cấu hình → copy prompt → paste kết quả</p>
            </div>
            <button
              onClick={() => { setShowBuilder(!showBuilder); setShowPaste(false); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl font-extrabold text-sm border-2 transition-all active:scale-95
                ${showBuilder ? "bg-purple-100 border-purple-400 text-purple-700" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
              {showBuilder ? <X className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {showBuilder ? "Đóng" : "Mở"}
            </button>
          </div>

          {/* ── Builder panel ── */}
          {showBuilder && (
            <div className="bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-200">

              {/* Subject */}
              <div>
                <label className="field-label">Môn học</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PROMPT_SUBJECTS.map(s => (
                    <button key={s.id} type="button" onClick={() => setPbSubject(s.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-extrabold text-sm border-2 transition-all active:scale-95
                        ${pbSubject === s.id ? "bg-purple-100 border-purple-400 text-purple-700" : "bg-white border-slate-200 text-slate-600"}`}>
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
                {pbSubject === "custom" && (
                  <input className="input-field mt-2 text-sm" placeholder="Nhập tên môn học..."
                    value={pbCustomSubject} onChange={e => setPbCustomSubject(e.target.value)} />
                )}
              </div>

              {/* Type + Grade in 2 cols on wider screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Loại bài</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {PROMPT_TYPES.map(t => (
                      <button key={t.id} type="button" onClick={() => setPbType(t.id)}
                        className={`flex flex-col items-start px-3 py-2.5 rounded-xl font-extrabold text-sm border-2 transition-all active:scale-95 text-left
                          ${pbType === t.id ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-white border-slate-200 text-slate-600"}`}>
                        <span>{t.emoji} {t.label}</span>
                        <span className="text-xs font-semibold opacity-60 mt-0.5 leading-none">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="field-label">Cấp độ lớp</label>
                    <div className="flex gap-2 mt-2">
                      {[1,2,3,4,5].map(g => (
                        <button key={g} type="button" onClick={() => setPbGrade(g)}
                          className={`flex-1 h-10 rounded-xl font-extrabold text-sm border-2 transition-all active:scale-95
                            ${pbGrade === g ? "bg-blue-500 border-blue-500 text-white" : "bg-white border-slate-200 text-slate-600"}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="field-label">
                      Số câu hỏi: <span className="text-blue-600 font-black">{pbCount}</span>
                    </label>
                    <input type="range" min={3} max={20} step={1} value={pbCount}
                      onChange={e => setPbCount(Number(e.target.value))}
                      className="w-full mt-2 accent-purple-500" />
                    <div className="flex justify-between text-xs text-slate-400 font-bold mt-1">
                      <span>3</span><span>10</span><span>20</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional content */}
              <div>
                <label className="field-label">Nội dung tham khảo <span className="text-slate-400 font-semibold normal-case">(tuỳ chọn)</span></label>
                <textarea
                  className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-purple-400 transition-all min-h-20 resize-none mt-2"
                  placeholder="Dán đoạn văn, bài thơ, hoặc mô tả chủ đề... (để trống để AI tự chọn)"
                  value={pbContent} onChange={e => setPbContent(e.target.value)}
                />
              </div>

              {/* Action row */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button onClick={handleCopyPrompt}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold text-sm border-2 transition-all active:scale-95
                    ${promptCopied
                      ? "bg-green-100 border-green-400 text-green-700"
                      : "bg-white border-purple-300 text-purple-700 hover:bg-purple-50"}`}>
                  <Copy className="w-4 h-4" />
                  {promptCopied ? "Đã copy prompt! ✅" : "Copy Prompt"}
                </button>
                <button
                  onClick={() => { setShowPaste(!showPaste); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold text-sm border-2 transition-all active:scale-95
                    ${showPaste
                      ? "bg-green-500 border-green-500 text-white"
                      : "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"}`}>
                  <ClipboardPaste className="w-4 h-4" />
                  Paste kết quả
                </button>
              </div>

              {/* Hint */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-semibold leading-relaxed">
                💡 <strong>Cách dùng:</strong> Copy prompt → mở ChatGPT / Claude / Gemini → paste prompt → copy toàn bộ JSON kết quả → nhấn &ldquo;Paste kết quả&rdquo; ở trên
              </div>

              {/* ── Paste panel (inline) ── */}
              {showPaste && (
                <div className="bg-white border-2 border-green-200 rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-extrabold text-slate-700">📋 Paste JSON từ AI vào đây</p>
                  <textarea
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-green-400 transition-all min-h-40 resize-none"
                    placeholder={'[\n  {\n    "question": "...",\n    "options": ["A","B","C","D"],\n    "correct": "A"\n  }\n]'}
                    value={pasteText} onChange={e => setPasteText(e.target.value)}
                    autoFocus
                  />
                  <button onClick={handlePasteResult} disabled={!pasteText.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold text-sm bg-green-500 text-white active:scale-95 transition-all shadow-lg shadow-green-200 disabled:opacity-40">
                    <ClipboardPaste className="w-5 h-5" />
                    Nhập câu hỏi từ kết quả
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 2: Question list + manual add ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-lg text-slate-800">
              Câu hỏi <span className="text-blue-500">({questions.length})</span>
            </h2>
            <button
              onClick={() => { setShowManual(true); addBlankQuestion(); }}
              className="flex items-center gap-1.5 bg-blue-500 text-white rounded-2xl px-4 py-2 font-extrabold text-sm active:scale-95 transition-all shadow-md shadow-blue-200">
              <Plus className="w-4 h-4" /> Thêm thủ công
            </button>
          </div>

          {/* ── Manual form (title/subject/grade) – shown on first manual add ── */}
          {showManual && (
            <div className="card border-2 border-blue-100 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-display font-black text-base text-slate-700">Thông tin bộ quiz</p>
                <button onClick={() => setShowManual(false)} className="p-1.5 rounded-xl hover:bg-slate-100 active:scale-90">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              {/* Subject + Grade responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Môn học</label>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {[
                      { id: "math", label: "Toán học", emoji: "🔢" },
                      { id: "viet", label: "Tiếng Việt", emoji: "📖" },
                      { id: "eng",  label: "Tiếng Anh",  emoji: "🌍" },
                      { id: "science", label: "Khoa học", emoji: "🔬" },
                    ].map(s => (
                      <button key={s.id} type="button" onClick={() => setSubject(s.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-extrabold text-sm border-2 transition-all text-left active:scale-95
                          ${subject === s.id ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                        {s.emoji} {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="field-label">Lớp</label>
                  <div className="grid grid-cols-5 sm:grid-cols-1 gap-1.5 mt-2">
                    {[1,2,3,4,5].map(g => (
                      <button key={g} type="button" onClick={() => setGrade(g)}
                        className={`py-2.5 rounded-xl font-extrabold text-sm border-2 transition-all active:scale-95
                          ${grade === g ? "bg-blue-500 border-blue-500 text-white" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                        Lớp {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {questions.length === 0 && (
            <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <div className="text-5xl mb-3">✨</div>
              <p className="font-display font-black text-slate-600 text-lg">Chưa có câu hỏi nào</p>
              <p className="text-slate-400 text-sm mt-1 mb-5">Dùng AI bên trên hoặc thêm thủ công</p>
              <div className="flex flex-col sm:flex-row gap-3 px-8">
                <button onClick={() => setShowBuilder(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-extrabold text-sm bg-purple-50 border-2 border-purple-200 text-purple-700 active:scale-95 transition-all">
                  <Sparkles className="w-4 h-4" /> Dùng AI
                </button>
                <button onClick={() => { setShowManual(true); addBlankQuestion(); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-extrabold text-sm bg-blue-50 border-2 border-blue-200 text-blue-700 active:scale-95 transition-all">
                  <Plus className="w-4 h-4" /> Thêm thủ công
                </button>
              </div>
            </div>
          )}

          {/* Question cards */}
          {questions.map((q, qi) => (
            <div key={qi} className="card border-2 border-slate-200">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpandedQ(expandedQ === qi ? null : qi)}>
                <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 font-black text-sm flex items-center justify-center flex-shrink-0">{qi + 1}</span>
                <p className="flex-1 font-bold text-slate-700 text-sm truncate">{q.question || "Câu hỏi chưa có nội dung..."}</p>
                <div className="flex items-center gap-1.5">
                  {q.correct && <span className="text-xs bg-green-100 text-green-700 font-extrabold px-2 py-0.5 rounded-lg">✓</span>}
                  <button onClick={e => { e.stopPropagation(); removeQuestion(qi); }}
                    className="p-1.5 rounded-xl bg-red-50 text-red-400 active:scale-90 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedQ === qi ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {expandedQ === qi && (
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <input className="input-field text-sm" placeholder="Câu hỏi..."
                    value={q.question} onChange={e => updateQuestion(qi, "question", e.target.value)} />
                  <div className="space-y-2">
                    <label className="field-label">Lựa chọn – bấm chữ cái để chọn đáp án đúng</label>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button type="button" onClick={() => updateQuestion(qi, "correct", opt)}
                          className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center flex-shrink-0 transition-all border-2
                            ${q.correct === opt && opt ? "bg-green-500 border-green-500 text-white" : "bg-slate-100 border-slate-200 text-slate-500"}`}>
                          {["A","B","C","D"][oi]}
                        </button>
                        <input className="input-field py-2.5 text-sm" placeholder={`Lựa chọn ${["A","B","C","D"][oi]}`}
                          value={opt} onChange={e => updateOption(qi, oi, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Save CTA at bottom */}
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