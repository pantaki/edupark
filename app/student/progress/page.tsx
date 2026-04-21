"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { StudentBottomNav } from "@/components/shared/BottomNav";
import { SUBJECTS, AVATAR_EMOJI } from "@/lib/utils";
import { Flame, Star, Target, ArrowLeft } from "lucide-react";
import { useRequireChild } from "@/lib/useRequireChild";


interface Progress { subject: string; accuracy: number; streak: number; xp: number; correct_questions: number; total_questions: number; }
interface Session { id: string; subject: string; score: number; total: number; completed_at: string; }

export default function ProgressPage() {
  const router = useRouter();
  const { childSession, ready } = useRequireChild();
  const [progress, setProgress] = useState<Progress[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const progressChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sessionChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadProgress = async () => {
     if (!ready || !childSession) return;
    const [{ data: prog }, { data: sess }] = await Promise.all([
      supabase.from("progress").select("*").eq("child_id", childSession.id),
      supabase
        .from("quiz_sessions")
        .select("*")
        .eq("child_id", childSession.id)
        .order("completed_at", { ascending: false })
        .limit(10),
    ]);
    setProgress(prog || []);
    setSessions(sess || []);
  };

  useEffect(() => {
    if (!ready || !childSession) return;
    loadProgress().then(() => setLoading(false));

    if (progressChannelRef.current)
      supabase.removeChannel(progressChannelRef.current);
    if (sessionChannelRef.current)
      supabase.removeChannel(sessionChannelRef.current);

    const progressChannel = supabase
      .channel(`student-progress-${childSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "progress",
          filter: `child_id=eq.${childSession.id}`,
        },
        (payload) => {
          const newProg = payload.new as Progress;
          setProgress((prev) => {
            const exists = prev.find((p) => p.subject === newProg.subject);
            if (exists)
              return prev.map((p) =>
                p.subject === newProg.subject ? newProg : p,
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
          filter: `child_id=eq.${childSession.id}`,
        },
        (payload) => {
          const updatedProg = payload.new as Progress;
          setProgress((prev) =>
            prev.map((p) =>
              p.subject === updatedProg.subject ? updatedProg : p,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "progress",
          filter: `child_id=eq.${childSession.id}`,
        },
        (payload) => {
          const oldProg = payload.old as Progress;
          setProgress((prev) =>
            prev.filter((p) => p.subject !== oldProg.subject),
          );
        },
      )
      .subscribe();

    const sessionChannel = supabase
      .channel(`student-session-${childSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quiz_sessions",
          filter: `child_id=eq.${childSession.id}`,
        },
        (payload) => {
          setSessions((prev) => [payload.new as Session, ...prev].slice(0, 10));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "quiz_sessions",
          filter: `child_id=eq.${childSession.id}`,
        },
        (payload) => {
          const updated = payload.new as Session;
          setSessions((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s)),
          );
        },
      )
      .subscribe();

    progressChannelRef.current = progressChannel;
    sessionChannelRef.current = sessionChannel;

    return () => {
      if (progressChannelRef.current)
        supabase.removeChannel(progressChannelRef.current);
      if (sessionChannelRef.current)
        supabase.removeChannel(sessionChannelRef.current);
    };
  }, [ready, childSession]);

  if (!ready || !childSession)
    return (
      <div className="...">
        <div className="text-5xl animate-bounce">...</div>
      </div>
    );

  const totalXp = progress.reduce((s, p) => s + (p.xp || 0), 0);
  const maxStreak = Math.max(0, ...progress.map(p => p.streak || 0));
  const totalCorrect = progress.reduce((s, p) => s + (p.correct_questions || 0), 0);
  const totalQs = progress.reduce((s, p) => s + (p.total_questions || 0), 0);
  const avgAcc = totalQs > 0 ? Math.round((totalCorrect / totalQs) * 100) : 0;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-5xl animate-bounce">📊</div></div>;

  return (
    <div className="screen-container">
      <div className="page-header">
        <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <h1 className="font-display font-black text-xl flex-1">Tiến độ học tập</h1>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-4">
        {/* Profile summary */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-4xl p-5 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center text-3xl">
              {AVATAR_EMOJI[childSession.avatar] || "🐱"}
            </div>
            <div>
              <h2 className="font-display font-black text-2xl">{childSession.name}</h2>
              <p className="text-white/70 font-bold">Lớp {childSession.grade} · Mã: {childSession.code}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Flame className="w-4 h-4" />, label: "Streak", value: `${maxStreak}d` },
              { icon: <Star className="w-4 h-4" />, label: "Tổng XP", value: totalXp },
              { icon: <Target className="w-4 h-4" />, label: "Chính xác", value: `${avgAcc}%` },
            ].map((s, i) => (
              <div key={i} className="bg-white/20 rounded-2xl p-3 text-center">
                <div className="flex justify-center mb-1 opacity-80">{s.icon}</div>
                <div className="font-display font-black text-xl">{s.value}</div>
                <div className="text-white/60 text-xs font-bold">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Subject progress */}
        <div className="card space-y-4">
          <h2 className="font-display font-black text-lg text-slate-800">📊 Từng môn học</h2>
          {SUBJECTS.map(s => {
            const p = progress.find(pr => pr.subject === s.id);
            const acc = Math.round(p?.accuracy || 0);
            return (
              <div key={s.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{s.emoji}</span>
                    <div>
                      <p className="font-extrabold text-slate-700">{s.label}</p>
                      <p className="text-slate-400 text-xs font-semibold">{p?.correct_questions || 0}/{p?.total_questions || 0} câu đúng</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-black text-blue-600 text-lg">{acc}%</p>
                    <p className="text-yellow-600 text-xs font-extrabold">XP {p?.xp || 0}</p>
                  </div>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${s.color} rounded-full transition-all duration-700`} style={{ width: `${acc}%` }} />
                </div>
                {!p && <p className="text-slate-400 text-xs font-semibold mt-1">Chưa học môn này</p>}
              </div>
            );
          })}
        </div>

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <div className="card space-y-3">
            <h2 className="font-display font-black text-lg text-slate-800">📝 Buổi học gần đây</h2>
            {sessions.map(s => {
              const sub = SUBJECTS.find(sx => sx.id === s.subject);
              const acc = Math.round((s.score / s.total) * 100);
              return (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <span className="text-2xl">{sub?.emoji || "📚"}</span>
                  <div className="flex-1">
                    <p className="font-extrabold text-slate-700">{sub?.label || s.subject}</p>
                    <p className="text-slate-400 text-xs font-semibold">
                      {new Date(s.completed_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-display font-black ${acc >= 80 ? "text-green-500" : acc >= 60 ? "text-yellow-500" : "text-red-400"}`}>
                      {s.score}/{s.total}
                    </p>
                    <p className="text-slate-400 text-xs font-extrabold">{acc}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {progress.length === 0 && sessions.length === 0 && (
          <div className="card text-center py-10">
            <div className="text-5xl mb-3">📭</div>
            <p className="font-extrabold text-slate-600">Chưa có dữ liệu học tập</p>
            <p className="text-slate-400 text-sm mt-1 font-semibold">Bắt đầu học để xem tiến độ nhé!</p>
          </div>
        )}
      </div>

      <StudentBottomNav />
    </div>
  );
}
