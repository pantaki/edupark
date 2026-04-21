"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { StudentBottomNav } from "@/components/shared/BottomNav";
import { DarkModeToggle } from "@/components/shared/DarkModeToggle";
import { SUBJECTS, AVATAR_EMOJI } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { Flame, Star, LogOut } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Progress { subject: string; accuracy: number; streak: number; xp: number; }
interface LessonStat {
  done: number;
  total: number;
}

export default function SubjectsPage() {
  const router = useRouter();
  const { childSession, setChildSession } = useAppStore();
  const [progress, setProgress] = useState<Progress[]>([]);
  const [lessonStats, setLessonStats] = useState<Record<string, LessonStat>>(
    {},
  );
  const [clock, setClock] = useState("");

  useEffect(() => {
    if (!childSession) { router.replace("/student/enter-code"); return; }

    const loadData = async () => {
      const [{ data: prog }, { data: lessonProgress }] = await Promise.all([
        supabase.from("progress").select("*").eq("child_id", childSession.id),
        supabase
          .from("child_lesson_progress")
          .select("lesson_id,status")
          .eq("child_id", childSession.id),
      ]);

      setProgress(prog || []);

      // Get all lesson IDs assigned to this child
      const lessonIds = (lessonProgress || []).map(
        (p: { lesson_id: string }) => p.lesson_id,
      );

      if (lessonIds.length === 0) {
        setLessonStats({});
        return;
      }

      // Fetch lesson details for assigned lessons
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id,subject")
        .in("id", lessonIds);

      const stats: Record<string, LessonStat> = {};
      (lessons || []).forEach((lesson: { id: string; subject: string }) => {
        stats[lesson.subject] = stats[lesson.subject] || { done: 0, total: 0 };
        stats[lesson.subject].total += 1;
      });

      (lessonProgress || []).forEach(
        (item: { lesson_id: string; status: string }) => {
          const lesson = (lessons || []).find(
            (l: { id: string }) => l.id === item.lesson_id,
          );
          if (lesson && item.status === "done") {
            stats[lesson.subject] = stats[lesson.subject] || {
              done: 0,
              total: 0,
            };
            stats[lesson.subject].done += 1;
          }
        },
      );

      setLessonStats(stats);
    };;

    loadData();

    const tick = () => setClock(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [childSession, router]);

  if (!childSession) return null;

  const totalXp = progress.reduce((s, p) => s + (p.xp || 0), 0);
  const maxStreak = Math.max(0, ...progress.map(p => p.streak || 0));

  function handleLogout() {
    setChildSession(null);
    toast.success("Hẹn gặp lại! 👋");
    router.replace("/");
  }

  return (
    <div className="screen-container bg-slate-50 dark:bg-slate-900">
      {/* Status bar */}
      <div className="flex justify-between items-center px-4 pt-4 pb-2">
        <span className="font-bold text-slate-400 dark:text-slate-500 text-sm">
          {clock}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 rounded-xl px-2.5 py-1">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="font-extrabold text-orange-700 dark:text-orange-400 text-sm">
              {maxStreak}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl px-2.5 py-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="font-extrabold text-yellow-700 dark:text-yellow-400 text-sm">
              {totalXp}
            </span>
          </div>
          <DarkModeToggle />
        </div>
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-2xl">
            {AVATAR_EMOJI[childSession.avatar] || "🐱"}
          </div>
          <div>
            <h1 className="font-display font-black text-xl text-slate-800 dark:text-white">
              Chào {childSession.name}! 👋
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">
              Hôm nay muốn học gì nào?
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 active:scale-90 transition-all"
        >
          <LogOut className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </button>
      </div>

      <div className="px-4 pt-2 pb-4 space-y-4">
        {/* Subject grid */}
        <div>
          <p className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1">
            Chọn môn học
          </p>
          <div className="grid grid-cols-2 gap-3">
            {SUBJECTS.map((s, i) => {
              const prog = progress.find((p) => p.subject === s.id);
              const acc = Math.round(prog?.accuracy || 0);
              const stat = lessonStats[s.id];
              const isWide =
                i === SUBJECTS.length - 1 && SUBJECTS.length % 2 !== 0;
              const showProgress = Boolean(prog || stat?.total);
              const percent = stat?.total
                ? Math.round((stat.done / stat.total) * 100)
                : acc;
              return (
                <Link
                  key={s.id}
                  href={`/student/journey?subject=${s.id}&grade=${childSession.grade}`}
                  className={`relative bg-gradient-to-br ${s.color} rounded-3xl p-5 flex flex-col items-center gap-2
                    active:scale-95 transition-all duration-150 shadow-lg overflow-hidden cursor-pointer
                    ${isWide ? "col-span-2" : ""}`}
                >
                  {/* BG decoration */}
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -translate-y-4 translate-x-4" />
                  <span className="text-5xl z-10">{s.emoji}</span>
                  <h2 className="font-display font-black text-xl text-white z-10">
                    {s.label}
                  </h2>
                  {showProgress && (
                    <div className="w-full z-10">
                      <div className="flex justify-between mb-1">
                        <span className="text-white/70 text-xs font-bold">
                          {stat?.total ? "Tiến độ" : "Chính xác"}
                        </span>
                        <span className="text-white font-extrabold text-xs">
                          {stat?.total
                            ? `${stat.done}/${stat.total} bài`
                            : `${acc}%`}
                        </span>
                      </div>
                      <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Grade selector */}
        <div>
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3 px-1">
            Lớp của bạn
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((g) => (
              <div
                key={g}
                className={`flex-1 py-3 rounded-2xl font-extrabold text-sm text-center border-2 transition-all
                  ${childSession.grade === g ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-200" : "bg-white border-slate-200 text-slate-500"}`}
              >
                {g}
              </div>
            ))}
          </div>
        </div>

        {/* Quick quiz join */}
        <Link
          href="/quiz/join"
          className="flex items-center gap-4 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-3xl p-4 active:scale-95 transition-all shadow-lg shadow-yellow-200"
        >
          <span className="text-4xl">🎮</span>
          <div>
            <h3 className="font-display font-black text-lg text-yellow-900">
              Chơi Quiz cùng bạn!
            </h3>
            <p className="text-yellow-800/70 text-sm font-semibold">
              Nhập mã phòng để vào chơi
            </p>
          </div>
        </Link>
      </div>

      <StudentBottomNav />
    </div>
  );
}