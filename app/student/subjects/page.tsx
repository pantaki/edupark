"use client";
import { useEffect, useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { useRequireChild } from "@/lib/useRequireChild";
import { StudentBottomNav } from "@/components/shared/BottomNav";
import { SUBJECTS, AVATAR_EMOJI } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { Flame, Star, LogOut, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Progress {
  subject: string;
  accuracy: number;
  streak: number;
  xp: number;
}
interface LessonProgress {
  subject: string;
  done: number;
  total: number;
  pct: number;
}
interface Assignment {
  id: string;
  title: string;
  message: string | null;
  emoji_gift: string;
  type: string;
  lesson_id: string | null;
  quiz_id: string | null;
  due_date: string | null;
  status: string;
}
interface Achievement {
  id: string;
  name: string;
  emoji: string;
  earned_at: string;
}

const ZPD_THRESHOLD = 60;
const BRAIN_BREAK_THRESHOLD = 25;

const LOADING_UI = (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-slate-50">
    <div className="text-6xl animate-bounce">📚</div>
  </div>
);

export default function SubjectsPage() {
  const router = useRouter();
  const { childSession, ready } = useRequireChild();
  const { setChildSession } = useAppStore();
  const [progress, setProgress] = useState<Progress[]>([]);
  const [lessonProgress, setLessonProgress] = useState<
    Record<string, LessonProgress>
  >({});
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [recentAchs, setRecentAchs] = useState<Achievement[]>([]);
  const [clock, setClock] = useState("");
  const [showBrainBreak, setShowBrainBreak] = useState(false);
  const [showGiftList, setShowGiftList] = useState(false);
  const [showGiftDetail, setShowGiftDetail] = useState<Assignment | null>(null);
  const studyStartRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!ready || !childSession) return;

    const grade = childSession.grade;
    Promise.all([
      supabase.from("progress").select("*").eq("child_id", childSession.id),
      supabase
        .from("assignments")
        .select("*")
        .eq("child_id", childSession.id)
        .in("status", ["pending", "seen"])
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("child_achievements")
        .select("achievement_id, earned_at, achievements(id,name,emoji)")
        .eq("child_id", childSession.id)
        .order("earned_at", { ascending: false })
        .limit(3),
      supabase
        .from("lessons")
        .select("id, subject")
        .eq("grade", grade)
        .eq("is_parent_created", false),
      supabase
        .from("child_lesson_progress")
        .select("lesson_id, status")
        .eq("child_id", childSession.id)
        .eq("status", "done"),
    ]).then(
      ([
        { data: prog },
        { data: asgn },
        { data: achs },
        { data: allLessons },
        { data: doneLessons },
      ]) => {
        setProgress(prog || []);
        setAssignments((asgn || []) as Assignment[]);
        setRecentAchs(
          (achs || []).map((a: any) => {
            const ach = Array.isArray(a.achievements)
              ? a.achievements[0]
              : a.achievements;
            return {
              id: ach?.id,
              name: ach?.name,
              emoji: ach?.emoji,
              earned_at: a.earned_at,
            };
          }),
        );
        const doneSet = new Set(
          (doneLessons || []).map((d: any) => d.lesson_id),
        );
        const bySubject: Record<string, { done: number; total: number }> = {};
        (allLessons || []).forEach((l: any) => {
          if (!bySubject[l.subject])
            bySubject[l.subject] = { done: 0, total: 0 };
          bySubject[l.subject].total++;
          if (doneSet.has(l.id)) bySubject[l.subject].done++;
        });
        const lpMap: Record<string, LessonProgress> = {};
        Object.entries(bySubject).forEach(([subject, { done, total }]) => {
          lpMap[subject] = {
            subject,
            done,
            total,
            pct: total > 0 ? Math.round((done / total) * 100) : 0,
          };
        });
        setLessonProgress(lpMap);
      },
    );

    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 30000);
    const brainTimer = setInterval(() => {
      const mins = (Date.now() - studyStartRef.current) / 60000;
      if (mins >= BRAIN_BREAK_THRESHOLD) {
        setShowBrainBreak(true);
        clearInterval(brainTimer);
      }
    }, 60000);
    return () => {
      clearInterval(id);
      clearInterval(brainTimer);
    };
  }, [ready, childSession]);

  if (!ready || !childSession) return LOADING_UI;

  const totalXp = progress.reduce((s, p) => s + (p.xp || 0), 0);
  const maxStreak = Math.max(0, ...progress.map((p) => p.streak || 0));
  const weakSubject = SUBJECTS.find((s) => {
    const p = progress.find((pr) => pr.subject === s.id);
    return p && p.accuracy < ZPD_THRESHOLD;
  });

  function handleLogout() {
    setChildSession(null);
    toast.success("Hẹn gặp lại! 👋");
    router.replace("/");
  }

  async function markGiftSeen(gift: Assignment) {
    await supabase
      .from("assignments")
      .update({ status: "seen", seen_at: new Date().toISOString() })
      .eq("id", gift.id);
    setAssignments((prev) =>
      prev.map((a) => (a.id === gift.id ? { ...a, status: "seen" } : a)),
    );
    setShowGiftDetail(null);
    if (!childSession) return;
    if (gift.lesson_id)
      router.push(
        `/student/learn?lessonId=${gift.lesson_id}&subject=math&grade=${childSession.grade}`,
      );
    else if (gift.quiz_id) router.push(`/quiz/join`);
  }

  return (
    <div className="screen-container bg-gradient-to-b from-blue-50 to-slate-50">
      {showBrainBreak && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center pb-[70px]">
          <div className="bg-white rounded-t-4xl w-full max-w-lg p-8 text-center shadow-2xl">
            <div className="text-7xl mb-4 animate-bounce">🐻</div>
            <h2 className="font-display font-black text-2xl text-slate-800 mb-2">
              Mắt con cần nghỉ ngơi rồi!
            </h2>
            <p className="text-slate-500 font-semibold mb-6">
              Con đã học rất chăm chỉ! Hãy đứng dậy, vươn vai cùng bạn Gấu nhé
              🌟
              <br />
              <span className="text-blue-500 font-bold">
                5 phút nghỉ = học hiệu quả hơn!
              </span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBrainBreak(false);
                  studyStartRef.current = Date.now();
                }}
                className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 text-white font-extrabold rounded-2xl py-3.5 active:scale-95 transition-all shadow-lg"
              >
                Nghỉ ngơi rồi! 🙋
              </button>
              <button
                onClick={() => setShowBrainBreak(false)}
                className="border-2 border-slate-200 text-slate-500 font-extrabold rounded-2xl px-4 py-3.5 active:scale-95"
              >
                Học thêm tí
              </button>
            </div>
          </div>
        </div>
      )}

      {showGiftList && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
          onClick={() => setShowGiftList(false)}
        >
          <div
            className="bg-white rounded-t-4xl w-full max-w-lg shadow-2xl flex flex-col"
            style={{ maxHeight: "70vh", paddingBottom: "80px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar — sticky */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>
            {/* Header — sticky */}
            <div className="px-5 pt-1 pb-3 flex items-center justify-between flex-shrink-0 border-b border-slate-100">
              <h2 className="font-display font-black text-xl text-slate-800">
                🎁 Quà từ Ba/Mẹ
              </h2>
              <span className="bg-pink-100 text-pink-600 text-xs font-extrabold px-2.5 py-1 rounded-full">
                {assignments.length} quà
              </span>
            </div>
            {/* Scrollable list — newest first */}
            <div
              className="overflow-y-auto flex-1 px-5 py-3 space-y-2"
              style={{
                paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
              }}
            >
              {[...assignments].reverse().map((gift) => {
                const isSeen = gift.status === "seen";
                return (
                  <button
                    key={gift.id}
                    onClick={() => {
                      setShowGiftList(false);
                      setShowGiftDetail(gift);
                    }}
                    className={`w-full flex items-center gap-3 rounded-2xl p-3.5 border-2 active:scale-[0.98] transition-all text-left
                        ${isSeen ? "bg-slate-50 border-slate-200" : "bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200"}`}
                  >
                    <span
                      className={`text-3xl flex-shrink-0 ${isSeen ? "grayscale opacity-60" : ""}`}
                    >
                      {gift.emoji_gift}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-extrabold text-sm truncate ${isSeen ? "text-slate-500" : "text-slate-800"}`}
                      >
                        {gift.title}
                      </p>
                      {gift.message && (
                        <p className="text-slate-400 text-xs font-semibold truncate italic">
                          &ldquo;{gift.message}&rdquo;
                        </p>
                      )}
                      {gift.due_date && (
                        <p className="text-slate-300 text-xs font-semibold">
                          ⏰ Hạn:{" "}
                          {new Date(gift.due_date).toLocaleDateString("vi-VN")}
                        </p>
                      )}
                    </div>
                    <div
                      className={`flex-shrink-0 text-xs font-extrabold px-2.5 py-1.5 rounded-xl ${isSeen ? "bg-slate-200 text-slate-500" : "bg-pink-500 text-white"}`}
                    >
                      {isSeen ? "Xem lại" : "Mở! 🎁"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showGiftDetail && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
          onClick={() => setShowGiftDetail(null)}
        >
          <div
            className="bg-white rounded-4xl p-7 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-6xl text-center mb-4 animate-bounce">
              {showGiftDetail.emoji_gift}
            </div>
            <h2 className="font-display font-black text-xl text-center text-slate-800 mb-2">
              {showGiftDetail.title}
            </h2>
            {showGiftDetail.message && (
              <div className="bg-pink-50 rounded-2xl p-4 border-2 border-pink-100 mb-4">
                <p className="text-xs font-extrabold text-pink-500 mb-1">
                  💌 Lời nhắn từ Ba/Mẹ:
                </p>
                <p className="text-slate-700 font-semibold italic text-sm">
                  &ldquo;{showGiftDetail.message}&rdquo;
                </p>
              </div>
            )}
            {showGiftDetail.due_date && (
              <p className="text-center text-slate-400 text-xs font-semibold mb-4">
                ⏰ Hạn:{" "}
                {new Date(showGiftDetail.due_date).toLocaleDateString("vi-VN")}
              </p>
            )}
            <button
              onClick={() => markGiftSeen(showGiftDetail)}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-display font-black text-lg rounded-2xl py-3.5 active:scale-95 transition-all shadow-lg"
            >
              🚀 Khám phá ngay!
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center px-4 pt-4 pb-2">
        <span className="font-bold text-slate-400 text-sm">{clock}</span>
        <div className="flex items-center gap-2">
          {maxStreak > 0 && (
            <div className="flex items-center gap-1 bg-orange-100 rounded-xl px-2.5 py-1">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-extrabold text-orange-700 text-sm">
                {maxStreak}🔥
              </span>
            </div>
          )}
          <div className="flex items-center gap-1 bg-yellow-100 rounded-xl px-2.5 py-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
            <span className="font-extrabold text-yellow-700 text-sm">
              {totalXp}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/student/pet"
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-2xl active:scale-95 transition-all border-2 border-purple-100"
          >
            {AVATAR_EMOJI[childSession.avatar] || "🐱"}
          </Link>
          <div>
            <h1 className="font-display font-black text-xl text-slate-800">
              Chào {childSession.name}! 👋
            </h1>
            <p className="text-slate-500 text-sm font-semibold">
              Hôm nay khám phá gì nào?
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl bg-white/80 active:scale-90 transition-all shadow-sm"
        >
          <LogOut className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      <div className="px-4 pt-1 pb-4 space-y-4">
        {assignments.length > 0 &&
          (() => {
            const newCount = assignments.filter(
              (a) => a.status === "pending",
            ).length;
            // Lấy quà mới nhất để preview lời nhắn
            const latest =
              assignments.find((a) => a.status === "pending") || assignments[0];
            return (
              <button
                onClick={() => setShowGiftList(true)}
                className="w-full flex items-center gap-4 bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-3xl p-4 active:scale-[0.98] transition-all shadow-sm"
              >
                <div className="relative flex-shrink-0">
                  <span className="text-4xl">{latest.emoji_gift}</span>
                  {newCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                      {newCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-extrabold text-sm text-slate-800">
                    {newCount > 0
                      ? `Ba/Mẹ gửi ${newCount} quà mới! 🎉`
                      : `${assignments.length} quà từ Ba/Mẹ`}
                  </p>
                  {latest.message && (
                    <p className="text-slate-400 text-xs font-semibold truncate italic">
                      &ldquo;{latest.message}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 bg-pink-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl">
                  Xem →
                </div>
              </button>
            );
          })()}

        {recentAchs.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-3xl p-3.5 border-2 border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-extrabold text-yellow-700 uppercase tracking-wider">
                🏆 Huy hiệu mới nhất
              </p>
              <Link
                href="/student/achievements"
                className="text-xs text-blue-500 font-extrabold"
              >
                Xem tất cả
              </Link>
            </div>
            <div className="flex gap-2">
              {recentAchs.map((a) => (
                <div key={a.id} className="flex flex-col items-center gap-1">
                  <span className="text-3xl">{a.emoji}</span>
                  <p className="text-xs text-slate-600 font-bold text-center leading-tight max-w-16">
                    {a.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {weakSubject && (
          <Link
            href={`/student/journey?subject=${weakSubject.id}&grade=${childSession.grade}`}
            className="flex items-center gap-3 bg-blue-50 rounded-3xl p-3.5 border-2 border-blue-200 active:scale-[0.98] transition-all"
          >
            <span className="text-3xl">{weakSubject.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-blue-800 text-sm">
                Ôn lại {weakSubject.label}?
              </p>
              <p className="text-blue-500 text-xs font-semibold">
                Bé học thêm phần cơ bản sẽ tiến bộ nhanh hơn! 💡
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
          </Link>
        )}

        <div>
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3 px-1">
            🗺️ Khám phá môn học
          </p>
          <div className="grid grid-cols-2 gap-3">
            {SUBJECTS.map((s, i) => {
              const lp = lessonProgress[s.id];
              const pct = lp?.pct ?? 0;
              const done = lp?.done ?? 0;
              const total = lp?.total ?? 0;
              const isWide =
                i === SUBJECTS.length - 1 && SUBJECTS.length % 2 !== 0;
              const isWeak = weakSubject?.id === s.id;
              return (
                <Link
                  key={s.id}
                  href={`/student/journey?subject=${s.id}&grade=${childSession.grade}`}
                  className={`relative bg-gradient-to-br ${s.color} rounded-3xl p-5 flex flex-col items-center gap-2
                    active:scale-95 transition-all duration-150 shadow-lg overflow-hidden cursor-pointer
                    ${isWide ? "col-span-2" : ""} ${isWeak ? "ring-4 ring-yellow-300 ring-offset-2" : ""}`}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -translate-y-4 translate-x-4" />
                  <span className="text-5xl z-10">{s.emoji}</span>
                  <h2 className="font-display font-black text-xl text-white z-10">
                    {s.label}
                  </h2>
                  <div className="w-full z-10">
                    <div className="flex justify-between mb-1">
                      <span className="text-white/70 text-xs font-bold">
                        Tiến độ
                      </span>
                      <span className="text-white font-extrabold text-xs">
                        {total > 0 ? `${done}/${total} bài` : "Chưa có bài"}
                      </span>
                    </div>
                    <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {isWeak && (
                    <span className="absolute top-2 left-2 bg-yellow-300 text-yellow-900 text-xs font-extrabold px-2 py-0.5 rounded-full z-10">
                      💡 Ôn lại!
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/student/pet"
            className="flex flex-col items-center gap-1.5 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl py-3 active:scale-95 transition-all border-2 border-purple-100"
          >
            <span className="text-2xl">🐾</span>
            <span className="text-xs font-extrabold text-purple-700">
              Pet của tôi
            </span>
          </Link>
          <Link
            href="/student/achievements"
            className="flex flex-col items-center gap-1.5 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl py-3 active:scale-95 transition-all border-2 border-yellow-100"
          >
            <span className="text-2xl">🏆</span>
            <span className="text-xs font-extrabold text-yellow-700">
              Huy hiệu
            </span>
          </Link>
          <Link
            href="/quiz/join"
            className="flex flex-col items-center gap-1.5 bg-gradient-to-br from-green-100 to-teal-100 rounded-2xl py-3 active:scale-95 transition-all border-2 border-green-100"
          >
            <span className="text-2xl">🎮</span>
            <span className="text-xs font-extrabold text-green-700">
              Quiz vui
            </span>
          </Link>
        </div>

        <div>
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2 px-1">
            Lớp của bé
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((g) => (
              <div
                key={g}
                className={`flex-1 py-2.5 rounded-2xl font-extrabold text-sm text-center border-2 transition-all
                ${childSession.grade === g ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-200" : "bg-white border-slate-200 text-slate-400"}`}
              >
                {g}
              </div>
            ))}
          </div>
        </div>
      </div>
      <StudentBottomNav />
    </div>
  );
}