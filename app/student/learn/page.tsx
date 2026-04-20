"use client";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabaseClient";
import { SUBJECTS } from "@/lib/utils";
import { ArrowLeft, Star, Flame, ChevronRight } from "lucide-react";

interface Question { id: string; question: string; options: string[]; correct: string; order_num: number; }
interface Lesson { id: string; title: string; subject: string; grade: number; level: string; chapter: string; order_num: number; }

const MASCOT: Record<string, { emoji: string; msg: string }> = {
  ready:   { emoji: "🦉", msg: "Sẵn sàng chưa nào? 💪" },
  correct: { emoji: "🦉", msg: "Chính xác! Tuyệt vời lắm! ✅" },
  streak3: { emoji: "🦉", msg: "🔥 3 câu đúng liên tiếp! Em giỏi lắm!" },
  streak5: { emoji: "🦉", msg: "⚡ 5 liên tiếp! Thần đồng luôn! 🏆" },
  wrong:   { emoji: "🦉", msg: "Sai rồi! Cùng nhớ lại lần sau nhé 💡" },
  timeout: { emoji: "🦉", msg: "Hết giờ rồi! Lần sau nhanh hơn nhé ⏰" },
  next:    { emoji: "🦉", msg: "Tiếp tục nào, gần đến đích rồi! 🚀" },
  finish:  { emoji: "🦉", msg: "Hoàn thành bài học! Bạn thật xuất sắc! 🎉" },
};

const BUILT_IN: Record<string, Question[]> = {
  math: [
    { id:"m1", question:"5 + 7 = ?", options:["10","11","12","13"], correct:"12", order_num:0 },
    { id:"m2", question:"3 × 4 = ?", options:["10","11","12","14"], correct:"12", order_num:1 },
    { id:"m3", question:"20 ÷ 4 = ?", options:["4","5","6","7"], correct:"5", order_num:2 },
    { id:"m4", question:"15 − 8 = ?", options:["5","6","7","8"], correct:"7", order_num:3 },
    { id:"m5", question:"9 × 9 = ?", options:["72","81","90","99"], correct:"81", order_num:4 },
  ],
  viet: [
    { id:"v1", question:"Từ nào viết đúng chính tả?", options:["quả chuối","quã chuối","quả chuỗi","quả chuổi"], correct:"quả chuối", order_num:0 },
    { id:"v2", question:"Từ nào là danh từ?", options:["chạy","đẹp","bàn","nhanh"], correct:"bàn", order_num:1 },
    { id:"v3", question:"Dấu chấm hỏi dùng khi nào?", options:["Kết thúc câu kể","Cuối câu hỏi","Câu cảm thán","Câu khiến"], correct:"Cuối câu hỏi", order_num:2 },
    { id:"v4", question:"Từ trái nghĩa với 'to' là?", options:["lớn","nhỏ","dài","ngắn"], correct:"nhỏ", order_num:3 },
    { id:"v5", question:"Câu nào đúng ngữ pháp?", options:["Bạn đã ăn cơm chưa?","Đã bạn ăn cơm?","Ăn cơm bạn chưa?","Bạn ăn cơm chưa?"], correct:"Bạn đã ăn cơm chưa?", order_num:4 },
  ],
  eng: [
    { id:"e1", question:"What color is the sky?", options:["Red","Green","Blue","Yellow"], correct:"Blue", order_num:0 },
    { id:"e2", question:"I ___ a student.", options:["am","is","are","be"], correct:"am", order_num:1 },
    { id:"e3", question:"What is 'con mèo' in English?", options:["Dog","Cat","Bird","Fish"], correct:"Cat", order_num:2 },
    { id:"e4", question:"How many days in a week?", options:["5","6","7","8"], correct:"7", order_num:3 },
    { id:"e5", question:"She ___ my teacher.", options:["am","is","are","be"], correct:"is", order_num:4 },
  ],
  science: [
    { id:"s1", question:"Trái Đất có mấy mặt trăng?", options:["0","1","2","3"], correct:"1", order_num:0 },
    { id:"s2", question:"Nước sôi ở bao nhiêu độ C?", options:["90°C","95°C","100°C","105°C"], correct:"100°C", order_num:1 },
    { id:"s3", question:"Cây cần gì để sống?", options:["Chỉ nước","Chỉ đất","Ánh sáng và nước","Chỉ phân bón"], correct:"Ánh sáng và nước", order_num:2 },
    { id:"s4", question:"Con vật nào là động vật có vú?", options:["Cá heo","Cá mập","Rùa biển","Bạch tuộc"], correct:"Cá heo", order_num:3 },
    { id:"s5", question:"Hành tinh lớn nhất hệ Mặt Trời?", options:["Trái Đất","Sao Hỏa","Sao Mộc","Sao Thổ"], correct:"Sao Mộc", order_num:4 },
  ],
};

const OPT_COLORS = [
  { bg:"bg-blue-500", light:"bg-blue-50 border-blue-300 text-blue-800" },
  { bg:"bg-orange-500", light:"bg-orange-50 border-orange-300 text-orange-800" },
  { bg:"bg-purple-500", light:"bg-purple-50 border-purple-300 text-purple-800" },
  { bg:"bg-green-500", light:"bg-green-50 border-green-300 text-green-800" },
];

const TIMER_MAX = 25;

/* ── Confetti ── */
function Confetti({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number>();
  useEffect(() => {
    if (!active || !ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const colors = ["#f59e0b","#3b82f6","#10b981","#ef4444","#8b5cf6","#ec4899","#f97316"];
    let pts = Array.from({ length: 130 }, () => ({
      x: Math.random() * canvas.width, y: -20,
      vx: (Math.random() - 0.5) * 5, vy: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 9 + 4, spin: 0, sv: (Math.random() - 0.5) * 0.2,
    }));
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.spin += p.sv; p.vy += 0.07;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
        ctx.restore();
      });
      pts = pts.filter(p => p.y < canvas.height + 40);
      if (pts.length > 0) raf.current = requestAnimationFrame(draw);
    }
    raf.current = requestAnimationFrame(draw);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [active]);
  if (!active) return null;
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-50" style={{ width:"100%", height:"100%" }} />;
}

/* ── Stars ── */
function StarRow({ count, size = 10 }: { count: number; size?: number }) {
  return (
    <div className="flex gap-1">
      {[1,2,3].map(i => (
        <Star key={i} style={{ width: size, height: size }}
          className={i <= count ? "text-yellow-400 fill-yellow-400" : "text-slate-300"} />
      ))}
    </div>
  );
}

function LearnContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { childSession } = useAppStore();

  const lessonId = params.get("lessonId");
  const subject = params.get("subject") || "math";
  const grade = parseInt(params.get("grade") || String(childSession?.grade || 3));

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [curStreak, setCurStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [mascot, setMascot] = useState(MASCOT.ready);
  const [finished, setFinished] = useState(false);
  const [earnedStars, setEarnedStars] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [timer, setTimer] = useState(TIMER_MAX);
  const [comboFlash, setComboFlash] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const subjectInfo = SUBJECTS.find(s => s.id === subject) || SUBJECTS[0];

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(TIMER_MAX);
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setAnswered(true);
          setMascot(MASCOT.timeout);
          setCurStreak(0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (!childSession) { router.replace("/student/enter-code"); return; }
    (async () => {
      if (lessonId) {
        const [{ data: ls }, { data: qs }] = await Promise.all([
          supabase.from("lessons").select("*").eq("id", lessonId).single(),
          supabase.from("lesson_questions").select("*").eq("lesson_id", lessonId).order("order_num"),
        ]);
        setLesson(ls);
        if (qs && qs.length > 0) {
          setQuestions(qs.map((q: Question & { options: unknown }) => ({
            ...q, options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string),
          })));
        } else {
          setQuestions(BUILT_IN[subject] || BUILT_IN.math);
        }
      } else {
        setQuestions(BUILT_IN[subject] || BUILT_IN.math);
      }
      startTimer();
    })();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [childSession, lessonId, subject, grade, router, startTimer]);

  const q = questions[qi];
  const timerPct = (timer / TIMER_MAX) * 100;
  const timerColor = timer > 15 ? "bg-green-400" : timer > 8 ? "bg-yellow-400" : "bg-red-500";

  function handleAnswer(opt: string) {
    if (answered || !q) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(opt);
    setAnswered(true);
    const correct = opt === q.correct;
    if (correct) {
      const ns = curStreak + 1;
      setCurStreak(ns);
      setMaxStreak(m => Math.max(m, ns));
      const xp = ns >= 5 ? 20 : ns >= 3 ? 15 : 10;
      setSessionXp(s => s + xp);
      setScore(s => s + 1);
      if (ns >= 5) { setMascot(MASCOT.streak5); setComboFlash(true); setTimeout(() => setComboFlash(false), 900); }
      else if (ns >= 3) { setMascot(MASCOT.streak3); setComboFlash(true); setTimeout(() => setComboFlash(false), 900); }
      else setMascot(MASCOT.correct);
    } else {
      setCurStreak(0);
      setMascot(MASCOT.wrong);
    }
  }

  async function nextQuestion() {
    if (qi + 1 >= questions.length) { await finishLesson(); return; }
    setQi(i => i + 1);
    setSelected(null);
    setAnswered(false);
    setMascot(MASCOT.next);
    startTimer();
  }

  async function finishLesson() {
    setFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (!childSession) return;
    const total = questions.length;
    const acc = total > 0 ? Math.round((score / total) * 100) : 0;
    const stars = acc >= 90 ? 3 : acc >= 70 ? 2 : acc >= 50 ? 1 : 0;
    setEarnedStars(stars);
    setMascot(MASCOT.finish);
    if (stars >= 2) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4500); }

    await supabase.from("progress").upsert({
      child_id: childSession.id, subject,
      accuracy: acc, streak: maxStreak, xp: sessionXp,
      total_questions: total, correct_questions: score,
      updated_at: new Date().toISOString(),
    }, { onConflict: "child_id,subject" });

    if (lessonId) {
      await supabase.from("child_lesson_progress").upsert({
        child_id: childSession.id, lesson_id: lessonId,
        status: "done", stars, completed_at: new Date().toISOString(),
      }, { onConflict: "child_id,lesson_id" });

      if (lesson) {
        const { data: nextLesson } = await supabase.from("lessons")
          .select("id").eq("subject", subject).eq("grade", grade)
          .gt("order_num", lesson.order_num || 0)
          .order("order_num").limit(1).single();
        if (nextLesson) {
          await supabase.from("child_lesson_progress").upsert({
            child_id: childSession.id, lesson_id: nextLesson.id, status: "available", stars: 0,
          }, { onConflict: "child_id,lesson_id" });
        }
      }
    }
    await supabase.from("quiz_sessions").insert({ child_id: childSession.id, subject, score, total });
  }

  /* ── RESULT SCREEN ── */
  if (finished) {
    const total = questions.length;
    const acc = total > 0 ? Math.round((score / total) * 100) : 0;
    const [title, subtitle, grad] =
      acc >= 90 ? ["XUẤT SẮC! 🏆", "Bạn trả lời gần như hoàn hảo!", "from-yellow-400 to-orange-500"]
    : acc >= 70 ? ["GIỎI LẮM! 🌟", "Tiếp tục phát huy nhé!", "from-blue-400 to-purple-500"]
    : acc >= 50 ? ["KHÁ TỐT! 💪", "Luyện thêm để giỏi hơn nè!", "from-green-400 to-teal-500"]
    :             ["CỐ LÊN! 🤗", "Thử lại và bạn sẽ làm được!", "from-slate-400 to-slate-600"];

    return (
      <>
        <Confetti active={showConfetti} />
        <div className={`min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br ${grad}`}>
          <div className="text-8xl mb-3 animate-bounce">{mascot.emoji}</div>
          <h1 className="font-display font-black text-4xl text-white text-center drop-shadow mb-1">{title}</h1>
          <p className="text-white/80 font-bold text-lg text-center mb-6">{subtitle}</p>

          {/* Star rating */}
          <div className="flex gap-3 mb-6">
            {[1,2,3].map(i => (
              <div key={i} className={`transition-all duration-500 ${i <= earnedStars ? "scale-110" : "scale-90 opacity-40"}`}
                style={{ transitionDelay: `${i * 150}ms` }}>
                <Star className={`w-14 h-14 ${i <= earnedStars ? "text-yellow-300 fill-yellow-300 drop-shadow-lg" : "text-white/30"}`} />
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex gap-3 mb-8 flex-wrap justify-center">
            {[
              { label:"Đúng", value:`${score}/${total}` },
              { label:"Chính xác", value:`${acc}%` },
              { label:"XP", value:`+${sessionXp}` },
              { label:"Streak", value:`${maxStreak}🔥` },
            ].map((s, i) => (
              <div key={i} className="bg-white/20 backdrop-blur rounded-2xl px-4 py-3 text-center min-w-[72px]">
                <div className="font-display font-black text-2xl text-white">{s.value}</div>
                <div className="text-white/70 text-xs font-bold">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 w-full max-w-xs">
            <button onClick={() => router.replace(`/student/journey?subject=${subject}&grade=${grade}`)}
              className="flex-1 bg-white/20 text-white border-2 border-white/30 font-extrabold rounded-2xl py-4 active:scale-95 transition-all">
              🗺️ Bản đồ
            </button>
            <button onClick={() => {
              setQi(0); setSelected(null); setAnswered(false);
              setScore(0); setCurStreak(0); setMaxStreak(0);
              setFinished(false); setSessionXp(0);
              setMascot(MASCOT.ready); setShowConfetti(false);
              startTimer();
            }} className="flex-1 bg-white text-slate-800 font-extrabold rounded-2xl py-4 active:scale-95 transition-all shadow-xl">
              Lại nào! 🚀
            </button>
          </div>
        </div>
      </>
    );
  }

  if (questions.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-5xl animate-bounce">📚</div>
    </div>
  );

  const pct = Math.round((qi / questions.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          {lesson && <p className="text-xs font-extrabold text-slate-400 mb-0.5 truncate">{lesson.title}</p>}
          <div className="flex justify-between text-xs font-extrabold text-slate-400 mb-1">
            <span>Câu {qi + 1}/{questions.length}</span><span>{pct}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${subjectInfo.color} rounded-full transition-all duration-500`}
              style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-1 bg-yellow-100 rounded-xl px-2.5 py-1.5">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
          <span className="font-extrabold text-yellow-700 text-sm">{sessionXp}</span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 bg-slate-100 flex-shrink-0">
        <div className={`h-full ${timerColor} transition-all duration-1000`} style={{ width:`${timerPct}%` }} />
      </div>

      <div className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto">
        {/* Combo flash overlay */}
        {comboFlash && (
          <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center">
            <div className="bg-orange-500 text-white font-display font-black text-4xl rounded-3xl px-8 py-4 shadow-2xl"
              style={{ animation: "scale-in .15s ease-out" }}>
              🔥 {curStreak}x COMBO!
            </div>
          </div>
        )}

        {/* Timer + Streak row */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 rounded-2xl px-3 py-1.5 ${timer <= 8 ? "bg-red-100" : timer <= 15 ? "bg-yellow-100" : "bg-green-100"}`}>
            <span className={`font-display font-black text-xl ${timer <= 8 ? "text-red-600 animate-pulse" : timer <= 15 ? "text-yellow-700" : "text-green-700"}`}>{timer}s</span>
          </div>
          {curStreak >= 3 && (
            <div className="flex items-center gap-1 bg-orange-100 rounded-2xl px-3 py-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-extrabold text-orange-700 text-sm">{curStreak} liên tiếp!</span>
            </div>
          )}
        </div>

        {/* Subject badge */}
        <div className="flex justify-center">
          <span className={`text-sm font-extrabold text-white bg-gradient-to-r ${subjectInfo.color} px-4 py-1.5 rounded-full`}>
            {subjectInfo.emoji} {subjectInfo.label} · Lớp {grade}
          </span>
        </div>

        {/* Question */}
        <div className="bg-white rounded-4xl p-6 shadow-sm border border-slate-100 text-center">
          <p className="font-display font-black text-2xl text-slate-800 leading-tight">{q?.question}</p>
        </div>

        {/* Mascot */}
        <div className={`flex items-center gap-3 rounded-3xl p-3 border transition-all duration-300 ${
          answered && selected === q?.correct ? "bg-green-50 border-green-200"
          : answered ? "bg-red-50 border-red-200"
          : "bg-blue-50 border-blue-100"}`}>
          <span className="text-3xl">{mascot.emoji}</span>
          <p className={`font-bold text-sm flex-1 ${
            answered && selected === q?.correct ? "text-green-700"
            : answered ? "text-red-700" : "text-blue-700"}`}>{mascot.msg}</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {q?.options.map((opt, i) => {
            const col = OPT_COLORS[i];
            let cls: string;
            if (answered) {
              if (opt === q.correct) cls = "bg-green-100 border-2 border-green-400 text-green-800";
              else if (opt === selected) cls = "bg-red-100 border-2 border-red-400 text-red-800";
              else cls = "bg-slate-100 border-2 border-slate-200 text-slate-400 opacity-50";
            } else {
              cls = `${col.light} border-2 active:scale-95 cursor-pointer`;
            }
            return (
              <button key={i} onClick={() => handleAnswer(opt)} disabled={answered}
                className={`${cls} rounded-3xl py-5 px-3 font-display font-black text-lg
                  flex items-center justify-center transition-all duration-150 min-h-[5rem] shadow-sm`}>
                {answered && opt === q.correct && <span className="mr-2 text-xl">✅</span>}
                {answered && opt === selected && opt !== q.correct && <span className="mr-2 text-xl">❌</span>}
                {!answered && (
                  <span className={`mr-2 w-7 h-7 rounded-xl ${col.bg} text-white text-sm font-black flex items-center justify-center flex-shrink-0`}>
                    {["A","B","C","D"][i]}
                  </span>
                )}
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Next button */}
        {answered && (
          <button onClick={nextQuestion}
            className={`w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2
              active:scale-95 transition-all shadow-lg
              ${selected === q?.correct
                ? "bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-green-200"
                : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-200"}`}>
            {qi + 1 >= questions.length ? "🏆 Xem kết quả" : "Câu tiếp theo"}
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-5xl animate-bounce">📚</div></div>}>
      <LearnContent />
    </Suspense>
  );
}