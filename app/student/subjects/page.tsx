"use client";
// app/student/subjects/page.tsx — v3: Gift inbox + Brain break + ZPD + Pet card

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { StudentBottomNav } from "@/components/shared/BottomNav";
import { SUBJECTS, AVATAR_EMOJI } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import {
  Flame,
  Star,
  LogOut,
  Gift,
  Trophy,
  ChevronRight,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Progress {
  subject: string;
  accuracy: number;
  streak: number;
  xp: number;
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
}
interface Achievement {
  id: string;
  name: string;
  emoji: string;
  earned_at: string;
}

// ZPD: if accuracy < 60% in a subject, suggest basic lesson
const ZPD_THRESHOLD = 60;

const BRAIN_BREAK_THRESHOLD = 25; // minutes

export default function SubjectsPage() {
  const router = useRouter();
  const { childSession, setChildSession } = useAppStore();
  const [progress, setProgress] = useState<Progress[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [recentAchs, setRecentAchs] = useState<Achievement[]>([]);
  const [clock, setClock] = useState("");
  const [showBrainBreak, setShowBrainBreak] = useState(false);
  const [showGiftDetail, setShowGiftDetail] = useState<Assignment | null>(null);
  const studyStartRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!childSession) {
      router.replace("/student/enter-code");
      return;
    }

    Promise.all([
      supabase.from("progress").select("*").eq("child_id", childSession.id),
      supabase
        .from("assignments")
        .select("*")
        .eq("child_id", childSession.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("child_achievements")
        .select("achievement_id, earned_at, achievements(id,name,emoji)")
        .eq("child_id", childSession.id)
        .order("earned_at", { ascending: false })
        .limit(3),
    ]).then(([{ data: prog }, { data: asgn }, { data: achs }]) => {
      setProgress(prog || []);
      setAssignments((asgn || []) as Assignment[]);
      // Type-safe flatten
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
    });

    // Clock
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const id = setInterval(tick, 30000);

    // Brain break timer: check every minute
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
  }, [childSession, router]);


  if (!childSession) return null;

  const totalXp = progress.reduce((s, p) => s + (p.xp || 0), 0);
  const maxStreak = Math.max(0, ...progress.map((p) => p.streak || 0));

  // ZPD suggestion: find weakest subject
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
    setAssignments((prev) => prev.filter((a) => a.id !== gift.id));
    setShowGiftDetail(null);
    if (!childSession) return;
    // Navigate
    if (gift.lesson_id)
      router.push(
        `/student/learn?lessonId=${gift.lesson_id}&subject=math&grade=${childSession.grade}`,
      );
    else if (gift.quiz_id) router.push(`/quiz/join`);
  }

  return (
    <div className="screen-container bg-gradient-to-b from-blue-50 to-slate-50">
      {/* ── Brain break modal ── */}
      {showBrainBreak && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
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

      {/* ── Gift detail modal ── */}
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

      {/* ── Status bar ── */}
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

      {/* ── Hero greeting ── */}
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
        {/* ── Gift inbox ── */}
        {assignments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              🎁 Quà tặng từ Ba/Mẹ ({assignments.length})
            </p>
            {assignments.map((gift) => (
              <button
                key={gift.id}
                onClick={() => setShowGiftDetail(gift)}
                className="w-full flex items-center gap-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-3xl p-3.5 border-2 border-pink-200 active:scale-[0.98] transition-all shadow-sm"
              >
                <span className="text-3xl flex-shrink-0">
                  {gift.emoji_gift}
                </span>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-extrabold text-slate-800 text-sm truncate">
                    {gift.title}
                  </p>
                  {gift.message && (
                    <p className="text-slate-500 text-xs font-semibold truncate italic">
                      &ldquo;{gift.message}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 bg-pink-500 text-white text-xs font-extrabold px-2.5 py-1.5 rounded-xl">
                  Mở!
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Recent achievements ── */}
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

        {/* ── ZPD smart suggestion ── */}
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

        {/* ── Subject grid ── */}
        <div>
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3 px-1">
            🗺️ Khám phá môn học
          </p>
          <div className="grid grid-cols-2 gap-3">
            {SUBJECTS.map((s, i) => {
              const prog = progress.find((p) => p.subject === s.id);
              const acc = Math.round(prog?.accuracy || 0);
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
                  {prog && (
                    <div className="w-full z-10">
                      <div className="flex justify-between mb-1">
                        <span className="text-white/70 text-xs font-bold">
                          Tiến độ
                        </span>
                        <span className="text-white font-extrabold text-xs">
                          {acc}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-700"
                          style={{ width: `${acc}%` }}
                        />
                      </div>
                    </div>
                  )}
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

        {/* ── Quick actions row ── */}
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

        {/* ── Grade selector (display only) ── */}
        <div>
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2 px-1">
            Lớp của bé
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((g) => (
              <div
                key={g}
                className={`flex-1 py-2.5 rounded-2xl font-extrabold text-sm text-center border-2 transition-all
                  ${
                    childSession.grade === g
                      ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-200"
                      : "bg-white border-slate-200 text-slate-400"
                  }`}
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
