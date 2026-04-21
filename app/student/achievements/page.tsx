"use client";
// app/student/achievements/page.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase }           from "@/lib/supabaseClient";
import { StudentBottomNav }   from "@/components/shared/BottomNav";
import { ArrowLeft }          from "lucide-react";
import { useRequireChild } from "@/lib/useRequireChild";

interface Achievement {
  id: string; name: string; description: string; emoji: string;
  category: string; rarity: string;
}
interface EarnedAchievement {
  achievement_id: string; earned_at: string;
  achievements: Achievement;
}

const RARITY_GRAD: Record<string, string> = {
  common:    "from-slate-400 to-slate-500",
  rare:      "from-blue-500 to-indigo-600",
  epic:      "from-purple-500 to-pink-600",
  legendary: "from-yellow-400 to-orange-500",
};
const RARITY_LABEL: Record<string, string> = {
  common:"Thường", rare:"Hiếm", epic:"Sử thi", legendary:"Huyền thoại",
};
const CAT_LABEL: Record<string, string> = {
  subject:"Môn học 📚", streak:"Kiên trì 🔥", social:"Kết nối 💬", special:"Đặc biệt ✨",
};

export default function AchievementsPage() {
  const router = useRouter();
  const { childSession, ready } = useRequireChild();
  const [earned,   setEarned]   = useState<EarnedAchievement[]>([]);
  const [allAchs,  setAllAchs]  = useState<Achievement[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [activeCat,setActiveCat]= useState("all");
  const [newAch,   setNewAch]   = useState<Achievement | null>(null); // pop-up

  useEffect(() => {
    if (!ready || !childSession) return;

    Promise.all([
      supabase.from("achievements").select("*").order("rarity"),
      supabase
        .from("child_achievements")
        .select("achievement_id, earned_at, achievements(*)")
        .eq("child_id", childSession.id),
    ]).then(([{ data: all }, { data: ea }]) => {
      setAllAchs(all || []);
      setEarned(
        (ea || []).map((a: any) => {
          const ach = Array.isArray(a.achievements)
            ? a.achievements[0]
            : a.achievements;

          return {
            achievement_id: a.achievement_id,
            earned_at: a.earned_at,
            achievements: ach, // giờ là object đúng type
          };
        }),
      );
      setLoading(false);
    });
  }, [ready, childSession]);

  const earnedIds = new Set(earned.map(e => e.achievement_id));

  const filtered = allAchs.filter(a =>
    activeCat === "all" || a.category === activeCat
  );

  const categories = ["all", ...Array.from(new Set(allAchs.map(a => a.category)))];

  if (!ready || !childSession)
    return (
      <div className="...">
        <div className="text-5xl animate-bounce">...</div>
      </div>
    );
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-5xl animate-bounce">🏆</div>
    </div>
  );

  return (
    <div className="screen-container bg-gradient-to-br from-yellow-50 to-orange-50">
      {/* New achievement pop-up */}
      {newAch && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
          onClick={() => setNewAch(null)}>
          <div className="bg-white rounded-4xl p-8 text-center max-w-sm w-full shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="text-7xl mb-3 animate-bounce">{newAch.emoji}</div>
            <div className={`inline-block bg-gradient-to-r ${RARITY_GRAD[newAch.rarity]} text-white text-xs font-extrabold px-3 py-1 rounded-full mb-3`}>
              {RARITY_LABEL[newAch.rarity]}
            </div>
            <h2 className="font-display font-black text-2xl text-slate-800 mb-2">{newAch.name}</h2>
            <p className="text-slate-500 font-semibold mb-6">{newAch.description}</p>
            <button onClick={() => setNewAch(null)}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-extrabold rounded-2xl px-8 py-3 active:scale-95 transition-all shadow-lg">
              Tuyệt vời! 🎉
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="font-display font-black text-xl flex-1">Huy hiệu thành tựu</h1>
        <div className="bg-yellow-100 rounded-2xl px-3 py-1.5">
          <span className="font-extrabold text-yellow-700">{earnedIds.size}/{allAchs.length} 🏆</span>
        </div>
      </div>

      {/* Summary strip */}
      <div className="px-4 py-3">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-3xl p-4 flex items-center gap-4">
          <div className="text-5xl">
            {earnedIds.size >= 15 ? "🦄" : earnedIds.size >= 10 ? "🏆" : earnedIds.size >= 5 ? "⭐" : "🌱"}
          </div>
          <div>
            <p className="font-display font-black text-white text-xl leading-tight">
              {earnedIds.size >= 15 ? "Nhà vô địch!" : earnedIds.size >= 10 ? "Học sinh xuất sắc!" : earnedIds.size >= 5 ? "Đang tiến bộ!" : "Mới bắt đầu!"}
            </p>
            <p className="text-white/80 font-bold text-sm">
              {childSession.name} đã mở khoá {earnedIds.size} huy hiệu
            </p>
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="px-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-2xl font-extrabold text-xs border-2 transition-all
              ${activeCat === cat ? "bg-yellow-100 border-yellow-400 text-yellow-800" : "bg-white border-slate-200 text-slate-500"}`}>
            {cat === "all" ? "Tất cả" : CAT_LABEL[cat] || cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-3">
          {filtered.map(ach => {
            const isEarned = earnedIds.has(ach.id);
            const earnedInfo = earned.find(e => e.achievement_id === ach.id);
            return (
              <div key={ach.id}
                className={`rounded-3xl p-3 text-center border-2 transition-all ${
                  isEarned
                    ? "bg-white border-yellow-200 shadow-md"
                    : "bg-slate-100/60 border-slate-200 opacity-50"
                }`}>
                {/* Rarity tag */}
                <div className={`text-xs font-extrabold text-white bg-gradient-to-r ${RARITY_GRAD[ach.rarity]} rounded-full px-1.5 py-0.5 mb-2 inline-block`}>
                  {RARITY_LABEL[ach.rarity]}
                </div>

                <div className={`text-4xl mb-1.5 ${!isEarned ? "grayscale" : ""}`}>
                  {isEarned ? ach.emoji : "🔒"}
                </div>

                <p className={`font-extrabold text-xs leading-tight ${isEarned ? "text-slate-800" : "text-slate-400"}`}>
                  {ach.name}
                </p>

                {isEarned && earnedInfo && (
                  <p className="text-slate-400 text-xs font-semibold mt-1">
                    {new Date(earnedInfo.earned_at).toLocaleDateString("vi-VN")}
                  </p>
                )}

                {!isEarned && (
                  <p className="text-slate-400 text-xs font-semibold mt-1 leading-tight">
                    {ach.description.slice(0, 35)}...
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <StudentBottomNav />
    </div>
  );
}