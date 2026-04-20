"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ParentBottomNav } from "@/components/shared/BottomNav";
import { AVATAR_EMOJI } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { LogOut, Plus, Trophy, Flame, Target } from "lucide-react";

interface Child {
  id: string; name: string; code: string; avatar: string; grade: number;
}
interface Progress {
  child_id: string; subject: string; accuracy: number; streak: number; xp: number; correct_questions: number; total_questions: number;
}
interface Session {
  id: string;
  child_id: string;
  subject: string;
  score: number;
  total: number;
  completed_at: string;
}

export default function ParentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string | null } | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const progressChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async (uid: string) => {
    const [{ data: profile }, { data: kids }] = await Promise.all([
      supabase.from("users").select("*").eq("id", uid).single(),
      supabase.from("children").select("*").eq("parent_id", uid).order("created_at"),
    ]);
    setUser(profile);
    setChildren(kids || []);
    if (kids?.length) {
      setSelected(kids[0].id);
      const { data: prog } = await supabase.from("progress").select("*").in("child_id", kids.map((k: Child) => k.id));
      const { data: sess } = await supabase
        .from("quiz_sessions")
        .select("*")
        .in(
          "child_id",
          kids.map((k: Child) => k.id),
        )
        .order("completed_at", { ascending: false })
        .limit(20);
      setProgress(prog || []);
      setSessions(sess || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/parent/login"); return; }
      load(session.user.id);
    });
  }, [load, router]);

  useEffect(() => {
    if (!selected) return;
    if (progressChannelRef.current) supabase.removeChannel(progressChannelRef.current);

    const channel = supabase
      .channel(`parent-progress-${selected}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "progress",
          filter: `child_id=eq.${selected}`,
        },
        (payload) => {
          const newProg = payload.new as Progress;
          setProgress((prev) => {
            const existing = prev.find(
              (p) =>
                p.subject === newProg.subject &&
                p.child_id === newProg.child_id,
            );
            if (existing)
              return prev.map((p) =>
                p.subject === newProg.subject && p.child_id === newProg.child_id
                  ? newProg
                  : p,
              );
            return [...prev, newProg];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "progress",
          filter: `child_id=eq.${selected}`,
        },
        (payload) => {
          const updatedProg = payload.new as Progress;
          setProgress((prev) =>
            prev.map((p) =>
              p.subject === updatedProg.subject &&
              p.child_id === updatedProg.child_id
                ? updatedProg
                : p,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quiz_sessions",
          filter: `child_id=eq.${selected}`,
        },
        (payload) => {
          setSessions((prev) => [payload.new as Session, ...prev].slice(0, 20));
        },
      )
      .subscribe();

    progressChannelRef.current = channel;
    return () => {
      if (progressChannelRef.current) supabase.removeChannel(progressChannelRef.current);
    };
  }, [selected]);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Đã đăng xuất!");
    router.replace("/");
  }

  const child = children.find(c => c.id === selected);
  const childProgress = progress.filter(p => p.child_id === selected);
  const totalXp = childProgress.reduce((s, p) => s + (p.xp || 0), 0);
  const maxStreak = Math.max(0, ...childProgress.map(p => p.streak || 0));
  const avgAccuracy = childProgress.length
    ? Math.round(childProgress.reduce((s, p) => s + (p.accuracy || 0), 0) / childProgress.length)
    : 0;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-5xl animate-bounce">📚</div>
    </div>
  );

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 pt-12 pb-20">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-white/70 text-sm font-bold">Xin chào,</p>
            <h1 className="font-display text-2xl font-black text-white">
              {user?.name || "Ba / Mẹ"} 👋
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white/20 rounded-2xl p-2.5 active:scale-95 transition-all"
          >
            <LogOut className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 -mt-12 pb-4 space-y-4">
        {/* Child selector */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl font-extrabold text-sm transition-all duration-150 border-2
                  ${selected === c.id ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}
              >
                <span className="text-xl">
                  {AVATAR_EMOJI[c.avatar] || "🐱"}
                </span>
                {c.name}
              </button>
            ))}
            <Link
              href="/parent/children"
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl font-extrabold text-sm border-2 border-dashed border-green-300 text-green-600 bg-green-50"
            >
              <Plus className="w-4 h-4" /> Thêm con
            </Link>
          </div>

          {child && (
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl p-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl">
                  {AVATAR_EMOJI[child.avatar] || "🐱"}
                </span>
                <div>
                  <p className="font-display font-black text-lg text-slate-800">
                    {child.name}
                  </p>
                  <p className="text-slate-500 text-sm font-bold">
                    Lớp {child.grade} • Mã:{" "}
                    <span className="text-blue-600 font-extrabold">
                      {child.code}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: <Flame className="w-5 h-5" />,
              label: "Streak",
              value: `${maxStreak} ngày`,
              color: "from-orange-400 to-red-500",
            },
            {
              icon: <Trophy className="w-5 h-5" />,
              label: "Tổng XP",
              value: totalXp,
              color: "from-yellow-400 to-orange-500",
            },
            {
              icon: <Target className="w-5 h-5" />,
              label: "Chính xác",
              value: `${avgAccuracy}%`,
              color: "from-green-400 to-teal-500",
            },
          ].map((s, i) => (
            <div
              key={i}
              className={`bg-gradient-to-br ${s.color} rounded-3xl p-4 text-white`}
            >
              <div className="opacity-80 mb-1">{s.icon}</div>
              <div className="font-display font-black text-xl">{s.value}</div>
              <div className="text-white/70 text-xs font-bold mt-0.5">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Subject progress */}
        {childProgress.length > 0 && (
          <div className="card space-y-3">
            <h2 className="font-display font-black text-lg text-slate-800">
              📊 Tiến độ từng môn
            </h2>
            {childProgress.map((p) => {
              const subjectMap: Record<
                string,
                { label: string; emoji: string; color: string }
              > = {
                math: { label: "Toán học", emoji: "🔢", color: "bg-blue-500" },
                viet: {
                  label: "Tiếng Việt",
                  emoji: "📖",
                  color: "bg-orange-500",
                },
                eng: { label: "Tiếng Anh", emoji: "🌍", color: "bg-green-500" },
                science: {
                  label: "Khoa học",
                  emoji: "🔬",
                  color: "bg-yellow-500",
                },
              };
              const s = subjectMap[p.subject] || {
                label: p.subject,
                emoji: "📚",
                color: "bg-slate-500",
              };
              const acc = Math.round(p.accuracy || 0);
              return (
                <div key={p.subject}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span>{s.emoji}</span>
                      <span className="font-extrabold text-slate-700">
                        {s.label}
                      </span>
                    </div>
                    <span className="font-black text-blue-600">{acc}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${s.color} rounded-full transition-all duration-700`}
                      style={{ width: `${acc}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    {p.correct_questions || 0}/{p.total_questions || 0} câu đúng
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {childProgress.length === 0 && selected && (
          <div className="card text-center py-8">
            <div className="text-5xl mb-3">📭</div>
            <p className="font-extrabold text-slate-500">
              Con chưa học bài nào
            </p>
            <p className="text-slate-400 text-sm mt-1 font-semibold">
              Chia sẻ mã{" "}
              <span className="text-blue-600 font-black">{child?.code}</span>{" "}
              cho con nhé!
            </p>
          </div>
        )}

        {/* Recent quiz sessions */}
        {sessions.filter((s) => s.child_id === selected).length > 0 && (
          <div className="card space-y-3">
            <h2 className="font-display font-black text-lg text-slate-800">
              📝 Bài kiểm tra gần đây
            </h2>
            <div className="space-y-2">
              {sessions
                .filter((s) => s.child_id === selected)
                .slice(0, 5)
                .map((sess) => {
                  const subjectMap: Record<
                    string,
                    { label: string; emoji: string; color: string }
                  > = {
                    math: {
                      label: "Toán học",
                      emoji: "🔢",
                      color: "bg-blue-100 text-blue-800",
                    },
                    viet: {
                      label: "Tiếng Việt",
                      emoji: "📖",
                      color: "bg-orange-100 text-orange-800",
                    },
                    eng: {
                      label: "Tiếng Anh",
                      emoji: "🌍",
                      color: "bg-green-100 text-green-800",
                    },
                    science: {
                      label: "Khoa học",
                      emoji: "🔬",
                      color: "bg-yellow-100 text-yellow-800",
                    },
                  };
                  const s = subjectMap[sess.subject] || {
                    label: sess.subject,
                    emoji: "📚",
                    color: "bg-slate-100 text-slate-800",
                  };
                  const date = new Date(sess.completed_at);
                  const timeStr = date.toLocaleString("vi-VN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={sess.id}
                      className={`flex items-center justify-between rounded-2xl px-4 py-3 ${s.color}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{s.emoji}</span>
                        <div>
                          <p className="font-extrabold">{s.label}</p>
                          <p className="text-xs opacity-70">{timeStr}</p>
                        </div>
                      </div>
                      <div className="font-display font-black text-lg">
                        {sess.score}%
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/parent/chat"
            className="card-hover flex flex-col items-center gap-2 py-5 text-center"
          >
            <span className="text-3xl">💬</span>
            <span className="font-extrabold text-slate-700">Chat với con</span>
          </Link>
          <Link
            href="/quiz/join"
            className="card-hover flex flex-col items-center gap-2 py-5 text-center"
          >
            <span className="text-3xl">🎮</span>
            <span className="font-extrabold text-slate-700">Phòng Quiz</span>
          </Link>
        </div>
      </div>

      <ParentBottomNav />
    </div>
  );
}