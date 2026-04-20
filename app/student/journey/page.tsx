"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabaseClient";
import { SUBJECTS } from "@/lib/utils";
import { ArrowLeft, Lock, Play, Star, ChevronRight, Flame } from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  subject: string;
  grade: number;
  level: "basic" | "medium" | "advanced";
  chapter: string;
  order_num: number;
}
interface LessonProgress {
  lesson_id: string;
  status: "locked" | "available" | "done";
  stars: number;
}

const LEVEL_LABEL: Record<string, string> = {
  basic: "Cơ bản",
  medium: "Nâng cao",
  advanced: "Thử thách",
};
const LEVEL_COLOR: Record<string, string> = {
  basic: "from-green-400 to-teal-500",
  medium: "from-blue-500 to-indigo-600",
  advanced: "from-purple-500 to-pink-600",
};
const LEVEL_BG: Record<string, string> = {
  basic: "bg-green-50 border-green-200",
  medium: "bg-blue-50 border-blue-200",
  advanced: "bg-purple-50 border-purple-200",
};

const MASCOT_MOODS = {
  idle:    { emoji: "🦉", msg: "Chọn bài để bắt đầu nhé! 📚" },
  locked:  { emoji: "🦉", msg: "Hoàn thành bài trước để mở khoá! 🔐" },
  done:    { emoji: "🦉", msg: "Bài này bạn đã hoàn thành rồi! ⭐" },
  go:      { emoji: "🦉", msg: "Cùng chinh phục nào! 🚀" },
};

function StarRow({ count, size = "sm" }: { count: number; size?: "sm" | "md" }) {
  const sz = size === "md" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map(i => (
        <Star key={i} className={`${sz} ${i <= count ? "text-yellow-400 fill-yellow-400" : "text-slate-300"}`} />
      ))}
    </div>
  );
}

function JourneyContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { childSession } = useAppStore();

  const subject = params.get("subject") || "math";
  const grade = parseInt(params.get("grade") || String(childSession?.grade || 3));

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, LessonProgress>>({});
  const [loading, setLoading] = useState(true);
  const [mascot, setMascot] = useState(MASCOT_MOODS.idle);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  const subjectInfo = SUBJECTS.find(s => s.id === subject) || SUBJECTS[0];

  const load = useCallback(async () => {
    if (!childSession) return;

    const [{ data: prog }, { data: pr }] = await Promise.all([
      supabase
        .from("child_lesson_progress")
        .select("*")
        .eq("child_id", childSession.id),
      supabase
        .from("progress")
        .select("streak")
        .eq("child_id", childSession.id)
        .eq("subject", subject)
        .maybeSingle(),
    ]);

    setStreak(pr?.streak || 0);

    // Build progress map from assigned lessons
    const pMap: Record<string, LessonProgress> = {};
    const assignedLessonIds: string[] = [];
    (prog || []).forEach((p: LessonProgress) => {
      pMap[p.lesson_id] = p;
      assignedLessonIds.push(p.lesson_id);
    });

    // Fetch lesson details for assigned lessons (any grade)
    let lessons: Lesson[] = [];
    if (assignedLessonIds.length > 0) {
      const { data: assignedLessons } = await supabase
        .from("lessons")
        .select("*")
        .in("id", assignedLessonIds)
        .eq("subject", subject);
      lessons = (assignedLessons || []).filter(
        (l: Lesson) => l.subject === subject,
      );
    }

    // Also add lessons from current grade (for backward compatibility)
    const { data: gradeLessons } = await supabase
      .from("lessons")
      .select("*")
      .eq("subject", subject)
      .eq("grade", grade)
      .order("order_num");

    // Merge: assigned lessons first, then add unassigned grade lessons
    const lessonIds = new Set(lessons.map((l: Lesson) => l.id));
    (gradeLessons || []).forEach((l: Lesson) => {
      if (!lessonIds.has(l.id)) {
        lessons.push(l);
      }
    });
    lessons.sort(
      (a: Lesson, b: Lesson) => (a.order_num || 0) - (b.order_num || 0),
    );

    setLessons(lessons);

    // Auto-unlock first lesson if no progress yet
    if (lessons.length > 0) {
      const firstId = lessons[0].id;
      if (!pMap[firstId]) {
        pMap[firstId] = { lesson_id: firstId, status: "available", stars: 0 };
        await supabase.from("child_lesson_progress").upsert(
          {
            child_id: childSession.id,
            lesson_id: firstId,
            status: "available",
            stars: 0,
          },
          { onConflict: "child_id,lesson_id" },
        );
      }
    }

    setProgressMap(pMap);
    setLoading(false);
  }, [childSession, subject, grade]);

  useEffect(() => {
    if (!childSession) { router.replace("/student/enter-code"); return; }
    load();
  }, [childSession, load, router]);

  function getStatus(lessonId: string): "locked" | "available" | "done" {
    return progressMap[lessonId]?.status || "locked";
  }
  function getStars(lessonId: string): number {
    return progressMap[lessonId]?.stars || 0;
  }

  // Group lessons by chapter
  const chapters = lessons.reduce<Record<string, Lesson[]>>((acc, l) => {
    const ch = l.chapter || "Chương 1";
    if (!acc[ch]) acc[ch] = [];
    acc[ch].push(l);
    return acc;
  }, {});

  const totalDone = lessons.filter(l => getStatus(l.id) === "done").length;
  const totalLessons = lessons.length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-6xl animate-bounce">📚</div>
    </div>
  );

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: "linear-gradient(180deg, #f0f4ff 0%, #faf9ff 60%)" }}
    >
      {/* ── Header ── */}
      <div
        className={`bg-gradient-to-r ${subjectInfo.color} px-4 pt-12 pb-16 relative overflow-hidden`}
      >
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-10 translate-x-10" />
        <div className="absolute bottom-0 left-10 w-24 h-24 rounded-full bg-white/10 translate-y-8" />

        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/80 mb-4 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" /> Quay lại
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-4xl">{subjectInfo.emoji}</span>
              <h1 className="font-display font-black text-2xl text-white drop-shadow">
                {subjectInfo.label} – Lớp {grade}
              </h1>
            </div>
            {Object.keys(chapters)[0] && (
              <p className="text-white/80 text-sm font-semibold ml-1">
                {Object.keys(chapters)[0]}
              </p>
            )}
            <div className="flex gap-3 mt-3">
              {streak > 0 && (
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur rounded-2xl px-3 py-1.5">
                  <Flame className="w-4 h-4 text-orange-200" />
                  <span className="text-white font-extrabold text-sm">
                    {streak} ngày
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur rounded-2xl px-3 py-1.5">
                <Star className="w-4 h-4 text-yellow-200 fill-yellow-200" />
                <span className="text-white font-extrabold text-sm">
                  {lessons.reduce((s, l) => s + getStars(l.id), 0)} sao
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur rounded-2xl px-3 py-1.5">
                <span className="text-white font-extrabold text-sm">
                  {totalDone}/{totalLessons} bài
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-700"
              style={{
                width:
                  totalLessons > 0
                    ? `${Math.round((totalDone / totalLessons) * 100)}%`
                    : "0%",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Mascot ── */}
      <div className="px-4 mt-2">
        <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/60 px-4 py-3 flex items-center gap-3 border border-slate-100">
          <span className="text-3xl">{mascot.emoji}</span>
          <p className="font-bold text-slate-700 text-sm flex-1">
            {mascot.msg}
          </p>
        </div>
      </div>

      {/* ── Journey Map ── */}
      <div className="px-4 pt-6 space-y-10">
        {Object.entries(chapters).map(([chapterName, chapterLessons]) => (
          <div key={chapterName}>
            {/* Chapter header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="font-extrabold text-slate-500 text-xs uppercase tracking-widest px-2">
                {chapterName}
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Zigzag nodes */}
            <div className="relative">
              {/* Connector line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 -translate-x-1/2 z-0" />

              <div className="space-y-6 relative z-10">
                {chapterLessons.map((lesson, idx) => {
                  const status = getStatus(lesson.id);
                  const stars = getStars(lesson.id);
                  const isLeft = idx % 2 === 0;
                  const isActive = activeLesson === lesson.id;

                  return (
                    <div
                      key={lesson.id}
                      className={`flex items-center gap-4 ${isLeft ? "flex-row" : "flex-row-reverse"}`}
                    >
                      {/* Node circle */}
                      <button
                        className={`relative flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90
                          ${
                            status === "done"
                              ? "bg-gradient-to-br from-yellow-400 to-orange-400 shadow-lg shadow-orange-200"
                              : status === "available"
                                ? `bg-gradient-to-br ${subjectInfo.color} shadow-lg shadow-blue-200 ${isActive ? "scale-110 ring-4 ring-white ring-offset-2 ring-offset-blue-100" : ""}`
                                : "bg-slate-200 shadow-inner"
                          }`}
                        onClick={() => {
                          if (status === "locked") {
                            setMascot(MASCOT_MOODS.locked);
                            setActiveLesson(lesson.id);
                          } else if (status === "done") {
                            setMascot(MASCOT_MOODS.done);
                            setActiveLesson(lesson.id);
                          } else {
                            setMascot(MASCOT_MOODS.go);
                            setActiveLesson(lesson.id);
                          }
                        }}
                      >
                        {status === "done" ? (
                          <div className="flex flex-col items-center">
                            <Star className="w-6 h-6 text-white fill-white" />
                            <StarRow count={stars} />
                          </div>
                        ) : status === "available" ? (
                          <Play className="w-7 h-7 text-white fill-white" />
                        ) : (
                          <Lock className="w-6 h-6 text-slate-400" />
                        )}

                        {/* Pulse ring for available */}
                        {status === "available" && (
                          <span className="absolute inset-0 rounded-full animate-ping bg-white/30" />
                        )}
                      </button>

                      {/* Card */}
                      <div
                        className={`flex-1 transition-all duration-200 ${isActive ? "scale-[1.02]" : ""}`}
                      >
                        <div
                          className={`rounded-3xl p-4 border-2 ${
                            status === "locked"
                              ? "bg-slate-100 border-slate-200 opacity-60"
                              : status === "done"
                                ? "bg-white border-yellow-200 shadow-md shadow-yellow-100"
                                : `bg-white border-2 ${LEVEL_BG[lesson.level]} shadow-md`
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`text-xs font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r ${LEVEL_COLOR[lesson.level]} text-white`}
                                >
                                  {LEVEL_LABEL[lesson.level]}
                                </span>
                              </div>
                              <h3
                                className={`font-extrabold text-base leading-tight ${status === "locked" ? "text-slate-400" : "text-slate-800"}`}
                              >
                                {lesson.title}
                              </h3>
                              {status === "done" && (
                                <div className="mt-1.5">
                                  <StarRow count={stars} size="md" />
                                </div>
                              )}
                            </div>

                            {/* Action button */}
                            {status !== "locked" && isActive && (
                              <button
                                onClick={() =>
                                  router.push(
                                    `/student/learn?lessonId=${lesson.id}&subject=${subject}&grade=${grade}`,
                                  )
                                }
                                className={`ml-3 flex-shrink-0 flex items-center gap-1 px-4 py-2 rounded-2xl font-extrabold text-sm text-white bg-gradient-to-r ${
                                  status === "done"
                                    ? "from-yellow-400 to-orange-400"
                                    : LEVEL_COLOR[lesson.level]
                                } active:scale-95 transition-all shadow-md`}
                              >
                                {status === "done" ? "Luyện lại" : "Bắt đầu"}
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {lessons.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <p className="font-extrabold text-slate-500 text-lg">
              Chưa có bài học nào
            </p>
            <p className="text-slate-400 text-sm mt-2">
              Bài học cho môn này đang được chuẩn bị
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JourneyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-6xl animate-bounce">📚</div></div>}>
      <JourneyContent />
    </Suspense>
  );
}