"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireChild } from "@/lib/useRequireChild";
import { supabase } from "@/lib/supabaseClient";
import { SUBJECTS } from "@/lib/utils";
import {
  ArrowLeft,
  Lock,
  Play,
  Star,
  ChevronRight,
  Flame,
  Gift,
} from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  subject: string;
  grade: number;
  level: "basic" | "medium" | "advanced";
  chapter: string;
  order_num: number;
  is_parent_created?: boolean;
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
  idle: { emoji: "🦉", msg: "Chọn bài để bắt đầu nhé! 📚" },
  locked: { emoji: "🦉", msg: "Hoàn thành bài trước để mở khoá! 🔐" },
  done: { emoji: "🦉", msg: "Bài này bạn đã hoàn thành rồi! ⭐" },
  go: { emoji: "🦉", msg: "Cùng chinh phục nào! 🚀" },
  gift: { emoji: "🦉", msg: "Quà từ Ba/Mẹ – luôn mở sẵn! 🎁" },
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

/* ── Map background — full height, path + trees distributed top to bottom ── */
function MapBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden style={{ zIndex: 0 }}>
      {/* Full-height sky gradient */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(180deg, #c0a8f0 0%, #b090e0 15%, #98c8b0 45%, #70b888 70%, #4e9e68 100%)"
      }} />

      {/* Clouds top */}
      <svg className="absolute top-4 left-0 w-full opacity-65" viewBox="0 0 400 60" preserveAspectRatio="xMidYMid slice">
        <ellipse cx="60"  cy="22" rx="44" ry="17" fill="white" opacity="0.6"/>
        <ellipse cx="88"  cy="14" rx="30" ry="13" fill="white" opacity="0.6"/>
        <ellipse cx="33"  cy="20" rx="24" ry="11" fill="white" opacity="0.45"/>
        <ellipse cx="295" cy="30" rx="38" ry="15" fill="white" opacity="0.5"/>
        <ellipse cx="326" cy="22" rx="26" ry="12" fill="white" opacity="0.5"/>
        <ellipse cx="270" cy="28" rx="20" ry="10" fill="white" opacity="0.38"/>
      </svg>

      {/* Clouds mid */}
      <svg className="absolute left-0 w-full opacity-25" style={{ top: "30%" }} viewBox="0 0 400 40" preserveAspectRatio="xMidYMid slice">
        <ellipse cx="80"  cy="18" rx="35" ry="13" fill="white"/>
        <ellipse cx="108" cy="12" rx="22" ry="10" fill="white"/>
        <ellipse cx="310" cy="22" rx="30" ry="12" fill="white"/>
        <ellipse cx="338" cy="15" rx="20" ry="9"  fill="white"/>
      </svg>

      {/* Castle top-right */}
      <svg className="absolute top-10 right-3 opacity-20" width="72" height="84" viewBox="0 0 72 84">
        <rect x="6"  y="36" width="60" height="48" fill="#6b46c1" rx="2"/>
        <rect x="0"  y="26" width="16" height="28" fill="#7c3aed" rx="2"/>
        <rect x="56" y="26" width="16" height="28" fill="#7c3aed" rx="2"/>
        <rect x="27" y="16" width="18" height="28" fill="#8b5cf6" rx="2"/>
        <rect x="2"  y="20" width="4" height="7" fill="#5b21b6"/>
        <rect x="8"  y="20" width="4" height="7" fill="#5b21b6"/>
        <rect x="58" y="20" width="4" height="7" fill="#5b21b6"/>
        <rect x="64" y="20" width="4" height="7" fill="#5b21b6"/>
        <rect x="29" y="10" width="5" height="7" fill="#6d28d9"/>
        <rect x="38" y="10" width="5" height="7" fill="#6d28d9"/>
        <rect x="28" y="54" width="16" height="30" fill="#5b21b6" rx="8 8 0 0"/>
      </svg>

      {/* Winding path — full height using % positioning */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 900" preserveAspectRatio="xMidYMid slice">
        <path d="M200,900 Q172,780 192,660 Q212,540 182,430 Q152,320 200,210 Q242,100 205,0"
          fill="none" stroke="#a07040" strokeWidth="34" strokeLinecap="round" opacity="0.45"/>
        <path d="M200,900 Q172,780 192,660 Q212,540 182,430 Q152,320 200,210 Q242,100 205,0"
          fill="none" stroke="#d4a86a" strokeWidth="24" strokeLinecap="round" opacity="0.6"/>
        <path d="M200,900 Q172,780 192,660 Q212,540 182,430 Q152,320 200,210 Q242,100 205,0"
          fill="none" stroke="#e8c490" strokeWidth="11" strokeLinecap="round" opacity="0.38"/>
      </svg>

      {/* Trees LEFT — 4 positions spread top→bottom */}
      <svg className="absolute opacity-65" style={{ left: 4,  top: "12%" }} width="44" height="68" viewBox="0 0 44 68">
        <rect x="19" y="46" width="6" height="22" fill="#92400e" rx="2"/>
        <ellipse cx="22" cy="34" rx="18" ry="24" fill="#16a34a"/>
        <ellipse cx="22" cy="24" rx="13" ry="17" fill="#22c55e"/>
      </svg>
      <svg className="absolute opacity-58" style={{ left: 12, top: "36%" }} width="32" height="50" viewBox="0 0 32 50">
        <rect x="13" y="34" width="5" height="16" fill="#92400e" rx="2"/>
        <ellipse cx="16" cy="24" rx="13" ry="18" fill="#15803d"/>
        <ellipse cx="16" cy="16" rx="9"  height="13" fill="#16a34a"/>
      </svg>
      <svg className="absolute opacity-70" style={{ left: 2,  top: "58%" }} width="50" height="78" viewBox="0 0 50 78">
        <rect x="22" y="54" width="7" height="24" fill="#92400e" rx="2"/>
        <ellipse cx="25" cy="40" rx="21" ry="30" fill="#166534"/>
        <ellipse cx="25" cy="29" rx="15" ry="21" fill="#16a34a"/>
      </svg>
      <svg className="absolute opacity-60" style={{ left: 10, top: "80%" }} width="36" height="56" viewBox="0 0 36 56">
        <rect x="15" y="38" width="5" height="18" fill="#92400e" rx="2"/>
        <ellipse cx="18" cy="27" rx="14" ry="20" fill="#15803d"/>
        <ellipse cx="18" cy="19" rx="10" ry="13" fill="#22c55e"/>
      </svg>

      {/* Trees RIGHT — 4 positions spread top→bottom */}
      <svg className="absolute opacity-62" style={{ right: 3,  top: "6%"  }} width="48" height="74" viewBox="0 0 48 74">
        <rect x="21" y="50" width="7" height="24" fill="#92400e" rx="2"/>
        <ellipse cx="24" cy="36" rx="20" ry="28" fill="#166534"/>
        <ellipse cx="24" cy="26" rx="14" ry="19" fill="#16a34a"/>
      </svg>
      <svg className="absolute opacity-55" style={{ right: 14, top: "30%" }} width="34" height="54" viewBox="0 0 34 54">
        <rect x="14" y="37" width="5" height="17" fill="#92400e" rx="2"/>
        <ellipse cx="17" cy="26" rx="14" ry="20" fill="#15803d"/>
        <ellipse cx="17" cy="18" rx="10" ry="13" fill="#22c55e"/>
      </svg>
      <svg className="absolute opacity-68" style={{ right: 2,  top: "52%" }} width="52" height="82" viewBox="0 0 52 82">
        <rect x="23" y="57" width="7" height="25" fill="#92400e" rx="2"/>
        <ellipse cx="26" cy="42" rx="22" ry="32" fill="#166534"/>
        <ellipse cx="26" cy="30" rx="16" ry="22" fill="#16a34a"/>
      </svg>
      <svg className="absolute opacity-57" style={{ right: 10, top: "74%" }} width="38" height="60" viewBox="0 0 38 60">
        <rect x="16" y="41" width="6" height="19" fill="#92400e" rx="2"/>
        <ellipse cx="19" cy="30" rx="16" ry="22" fill="#15803d"/>
        <ellipse cx="19" cy="21" rx="11" ry="14" fill="#22c55e"/>
      </svg>

      {/* Flowers scattered at multiple heights */}
      {([
        { x: 26,  top: "17%", c: "#f472b6" }, { x: 50,  top: "20%", c: "#fb923c" },
        { x: 18,  top: "43%", c: "#a78bfa" }, { x: 44,  top: "46%", c: "#34d399" },
        { x: 28,  top: "68%", c: "#f472b6" }, { x: 52,  top: "71%", c: "#fbbf24" },
        { x: 334, top: "13%", c: "#a78bfa" }, { x: 357, top: "16%", c: "#f472b6" },
        { x: 340, top: "40%", c: "#34d399" }, { x: 361, top: "43%", c: "#fb923c" },
        { x: 332, top: "66%", c: "#f472b6" }, { x: 355, top: "69%", c: "#a78bfa" },
      ] as {x:number; top:string; c:string}[]).map((f, i) => (
        <svg key={i} className="absolute opacity-82" style={{ left: f.x, top: f.top, width: 16, height: 20 }} viewBox="0 0 16 20">
          <rect x="7" y="9" width="2" height="11" fill="#86efac" rx="1"/>
          <circle cx="8" cy="6" r="5" fill={f.c} opacity="0.9"/>
          <circle cx="8" cy="6" r="3" fill="#fef08a"/>
        </svg>
      ))}

      {/* Stars — top quarter only */}
      {([{ x: 20, top: "4%" }, { x: 112, top: "2%" }, { x: 246, top: "5%" }, { x: 354, top: "7%" }, { x: 180, top: "1.5%" }] as {x:number;top:string}[]).map((s, i) => (
        <div key={i} className="absolute text-yellow-100 text-xs animate-pulse"
          style={{ left: s.x, top: s.top, animationDelay: `${i * 0.45}s` }}>✦</div>
      ))}
    </div>
  );
}

const LOADING_UI = (
  <div
    className="min-h-screen flex items-center justify-center"
    style={{
      background: "linear-gradient(180deg,#c9b3f5 0%,#90cfa8 60%,#4ea068 100%)",
    }}
  >
    <div className="text-6xl animate-bounce">📚</div>
  </div>
);

function JourneyContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { childSession, ready } = useRequireChild();

  const subject = params.get("subject") || "math";
  const grade = parseInt(
    params.get("grade") || String(childSession?.grade || 3),
  );

  const [standardLessons, setStandardLessons] = useState<Lesson[]>([]);
  const [assignedLessons, setAssignedLessons] = useState<Lesson[]>([]); // Ba/Mẹ giao — nối vào map
  const [progressMap, setProgressMap] = useState<
    Record<string, LessonProgress>
  >({});
  const [loading, setLoading] = useState(true);
  const [mascot, setMascot] = useState(MASCOT_MOODS.idle);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  const subjectInfo = SUBJECTS.find((s) => s.id === subject) || SUBJECTS[0];

  const load = useCallback(async () => {
    if (!childSession) return;

    const [{ data: prog }, { data: pr }, { data: stdLessons }, { data: asgn }] =
      await Promise.all([
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
        supabase
          .from("lessons")
          .select("*")
          .eq("subject", subject)
          .eq("grade", grade)
          .eq("is_parent_created", false)
          .order("order_num"),
        supabase
          .from("assignments")
          .select("lesson_id, type, lessons(subject, grade)")
          .eq("child_id", childSession.id)
          .not("lesson_id", "is", null),
      ]);

    setStreak(pr?.streak || 0);

    const pMap: Record<string, LessonProgress> = {};
    (prog || []).forEach((p: LessonProgress) => {
      pMap[p.lesson_id] = p;
    });

    const standard: Lesson[] = stdLessons || [];

    // Mở bài đầu tiên của bài học hệ thống
    if (standard.length > 0 && !pMap[standard[0].id]) {
      pMap[standard[0].id] = {
        lesson_id: standard[0].id,
        status: "available",
        stars: 0,
      };
      await supabase
        .from("child_lesson_progress")
        .upsert(
          {
            child_id: childSession.id,
            lesson_id: standard[0].id,
            status: "available",
            stars: 0,
          },
          { onConflict: "child_id,lesson_id" },
        );
    }

    // Lọc assignments theo đúng subject + grade của màn hình hiện tại
    const filteredAsgn = (asgn || []).filter(
      (a: any) => a.lessons?.subject === subject && a.lessons?.grade === grade,
    );

    // Chỉ lấy bài Ba/Mẹ giao (type="lesson") — quà (type="gift") chỉ hiện ở Home
    const assignedIds = new Set(
      filteredAsgn
        .filter((a: any) => a.type === "lesson")
        .map((a: any) => a.lesson_id as string),
    );

    let assigned: Lesson[] = [];

    const allParentIds = [...assignedIds].filter(Boolean);
    if (allParentIds.length > 0) {
      const { data: parentLessons } = await supabase
        .from("lessons")
        .select("*")
        .in("id", allParentIds);
      assigned = (parentLessons || []).filter((l) => assignedIds.has(l.id));

      if (assigned.length > 0 && !pMap[assigned[0].id]) {
        pMap[assigned[0].id] = {
          lesson_id: assigned[0].id,
          status: "available",
          stars: 0,
        };
        await supabase
          .from("child_lesson_progress")
          .upsert(
            {
              child_id: childSession.id,
              lesson_id: assigned[0].id,
              status: "available",
              stars: 0,
            },
            { onConflict: "child_id,lesson_id" },
          );
      }
    }

    setStandardLessons(standard);
    setAssignedLessons(assigned);
    setProgressMap(pMap);
    setLoading(false);
  }, [childSession, subject, grade]);

  useEffect(() => {
    if (!ready) return;
    load();
  }, [ready, load]);

  function getStatus(
    lessonId: string,
    alwaysOpen = false,
  ): "locked" | "available" | "done" {
    if (alwaysOpen)
      return progressMap[lessonId]?.status === "done" ? "done" : "available";
    return progressMap[lessonId]?.status || "locked";
  }
  function getStars(lessonId: string) {
    return progressMap[lessonId]?.stars || 0;
  }

  const allMapLessons = [...standardLessons, ...assignedLessons];
  const totalDone = allMapLessons.filter(
    (l) => getStatus(l.id) === "done",
  ).length;
  const totalLessons = allMapLessons.length;
  const totalStars = standardLessons.reduce((s, l) => s + getStars(l.id), 0);
  const allMapDone = totalLessons > 0 && totalDone === totalLessons;

  const chapters = standardLessons.reduce<Record<string, Lesson[]>>(
    (acc, l) => {
      const ch = l.chapter || "Chương 1";
      if (!acc[ch]) acc[ch] = [];
      acc[ch].push(l);
      return acc;
    },
    {},
  );

  if (!ready || loading) return LOADING_UI;

  function LessonNode({
    lesson,
    idx,
    isGift = false,
    isAssigned = false,
  }: {
    lesson: Lesson;
    idx: number;
    isGift?: boolean;
    isAssigned?: boolean;
  }) {
    const status = getStatus(lesson.id, isGift);
    const stars = getStars(lesson.id);
    const isLeft = idx % 2 === 0;
    const isActive = activeLesson === lesson.id;

    const nodeBg = isGift
      ? status === "done"
        ? "bg-gradient-to-br from-yellow-400 to-orange-400 shadow-lg shadow-orange-200"
        : "bg-gradient-to-br from-pink-400 to-purple-500 shadow-lg shadow-purple-200"
      : isAssigned
        ? status === "done"
          ? "bg-gradient-to-br from-yellow-400 to-orange-400 shadow-lg shadow-orange-200"
          : status === "available"
            ? "bg-gradient-to-br from-orange-400 to-pink-500 shadow-lg shadow-orange-200"
            : "bg-slate-300 shadow-inner"
        : status === "done"
          ? "bg-gradient-to-br from-yellow-400 to-orange-400 shadow-lg shadow-orange-200"
          : status === "available"
            ? `bg-gradient-to-br ${subjectInfo.color} shadow-lg`
            : "bg-slate-300 shadow-inner";

    const cardBg =
      status === "locked"
        ? "bg-white/50 border-white/40 opacity-60"
        : status === "done"
          ? "bg-white/85 border-yellow-200/80 shadow-md"
          : isGift
            ? "bg-gradient-to-br from-pink-50/90 to-purple-50/90 border-purple-200 shadow-md"
            : isAssigned
              ? "bg-white/85 border-orange-200 shadow-md"
              : `bg-white/85 border-2 ${LEVEL_BG[lesson.level]} shadow-md`;

    const badge = isGift ? (
      <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 text-white">
        🎁 Quà Ba/Mẹ
      </span>
    ) : isAssigned ? (
      <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-400 to-pink-500 text-white">
        📌 Ba/Mẹ giao
      </span>
    ) : (
      <span
        className={`text-xs font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r ${LEVEL_COLOR[lesson.level]} text-white`}
      >
        {LEVEL_LABEL[lesson.level]}
      </span>
    );

    return (
      <div
        className={`flex items-center gap-4 ${isLeft ? "flex-row" : "flex-row-reverse"}`}
      >
        <button
          className={`relative flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90
            ${nodeBg} ${isActive && status !== "locked" ? "scale-110 ring-4 ring-white ring-offset-2" : ""}`}
          onClick={() => {
            if (isGift)
              setMascot(
                status === "done" ? MASCOT_MOODS.done : MASCOT_MOODS.gift,
              );
            else if (status === "locked") setMascot(MASCOT_MOODS.locked);
            else if (status === "done") setMascot(MASCOT_MOODS.done);
            else setMascot(MASCOT_MOODS.go);
            setActiveLesson(isActive ? null : lesson.id);
          }}
        >
          {status === "done" ? (
            <div className="flex flex-col items-center">
              <Star className="w-6 h-6 text-white fill-white" />
              <StarRow count={stars} />
            </div>
          ) : isGift ? (
            <Gift className="w-7 h-7 text-white" />
          ) : status === "available" ? (
            <Play className="w-7 h-7 text-white fill-white" />
          ) : (
            <Lock className="w-6 h-6 text-slate-400" />
          )}
          {status === "available" && (
            <span className="absolute inset-0 rounded-full animate-ping bg-white/30" />
          )}
        </button>

        <div
          className={`flex-1 transition-all duration-200 ${isActive ? "scale-[1.02]" : ""}`}
        >
          <div
            className={`rounded-3xl p-4 border-2 backdrop-blur-sm ${cardBg}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">{badge}</div>
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
              {(status !== "locked" || isGift) && isActive && (
                <button
                  onClick={() =>
                    router.push(
                      `/student/learn?lessonId=${lesson.id}&subject=${subject}&grade=${grade}`,
                    )
                  }
                  className={`ml-3 flex-shrink-0 flex items-center gap-1 px-4 py-2 rounded-2xl font-extrabold text-sm text-white
                    bg-gradient-to-r ${isGift ? "from-pink-400 to-purple-500" : isAssigned ? "from-orange-400 to-pink-500" : status === "done" ? "from-yellow-400 to-orange-400" : LEVEL_COLOR[lesson.level]}
                    active:scale-95 transition-all shadow-md`}
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
  }

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden">
      <MapBackground />

      {/* Header */}
      <div
        className={`bg-gradient-to-br ${subjectInfo.color} px-4 pt-12 pb-6 relative z-10 overflow-hidden rounded-b-4xl shadow-lg`}
      >
        <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
        <div className="absolute top-20 left-0 w-20 h-20 rounded-full bg-white/8 -translate-x-6" />
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/80 mb-5 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" /> Quay lại
        </button>

        {/* Title row */}
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">{subjectInfo.emoji}</span>
          <div>
            <h1 className="font-display font-black text-xl text-white drop-shadow leading-tight">
              {subjectInfo.label} – Lớp {grade}
            </h1>
            {Object.keys(chapters)[0] && (
              <p className="text-white/70 text-xs font-semibold">
                {Object.keys(chapters)[0]}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-2 mt-3 flex-wrap">
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
              {totalStars} sao
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur rounded-2xl px-3 py-1.5">
            <span className="text-white font-extrabold text-sm">
              {totalDone}/{totalLessons} bài
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-white/60 text-xs font-bold">Tiến độ</span>
            <span className="text-white font-extrabold text-xs">
              {totalLessons > 0
                ? Math.round((totalDone / totalLessons) * 100)
                : 0}
              %
            </span>
          </div>
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
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

      {/* Mascot */}
      <div className="px-4 mt-2 relative z-10">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg px-4 py-3 flex items-center gap-3 border border-white/60">
          <span className="text-3xl">{mascot.emoji}</span>
          <p className="font-bold text-slate-700 text-sm flex-1">
            {mascot.msg}
          </p>
        </div>
      </div>

      {/* Bài học map */}
      <div className="px-4 pt-5 space-y-10 relative z-10">
        {Object.entries(chapters).map(([ch, lessons]) => (
          <div key={ch}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-white/50" />
              <span className="font-extrabold text-white/90 text-xs uppercase tracking-widest px-3 py-1 bg-white/25 backdrop-blur rounded-full drop-shadow-sm">
                {ch}
              </span>
              <div className="flex-1 h-px bg-white/50" />
            </div>
            <div className="relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 -translate-x-1/2 z-0" />
              <div className="space-y-6 relative z-10">
                {lessons.map((l, i) => (
                  <LessonNode key={l.id} lesson={l} idx={i} />
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Bài Ba/Mẹ giao — nối tiếp vào map */}
        {assignedLessons.length > 0 && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-orange-300/50" />
              <span className="font-extrabold text-white/90 text-xs uppercase tracking-widest px-3 py-1 bg-orange-400/60 backdrop-blur rounded-full">
                📌 Ba/Mẹ giao thêm
              </span>
              <div className="flex-1 h-px bg-orange-300/50" />
            </div>
            <div className="relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-orange-200/50 -translate-x-1/2 z-0" />
              <div className="space-y-6 relative z-10">
                {assignedLessons.map((l, i) => (
                  <LessonNode key={l.id} lesson={l} idx={i} isAssigned />
                ))}
              </div>
            </div>
          </>
        )}

        {/* All done banner */}
        {allMapDone && (
          <div className="bg-white/80 backdrop-blur rounded-3xl p-5 border-2 border-yellow-200/80 text-center shadow-lg mx-1">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-extrabold text-slate-800 mb-1">
              Bạn đã hoàn thành tất cả!
            </p>
            <p className="text-slate-500 text-sm">
              Tuyệt vời lắm, tiếp tục học thêm nhé!
            </p>
          </div>
        )}

        {standardLessons.length === 0 && assignedLessons.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <p className="font-extrabold text-white drop-shadow text-lg">
              Chưa có bài học nào
            </p>
            <p className="text-white/70 text-sm mt-2">
              Bài học đang được chuẩn bị
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JourneyPage() {
  return (
    <Suspense fallback={LOADING_UI}>
      <JourneyContent />
    </Suspense>
  );
}