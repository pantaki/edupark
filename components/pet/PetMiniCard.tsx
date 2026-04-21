"use client";
// components/pet/PetMiniCard.tsx
// Compact pet widget for home page — shows pet + quick status + coins

import Link from "next/link";
import { usePet } from "@/lib/usePet";
import PetAvatar from "./PetAvatar";
import { computePetState } from "@/lib/pet";

interface PetMiniCardProps {
  childId: string;
}

export default function PetMiniCard({ childId }: PetMiniCardProps) {
  const { pet, loading } = usePet(childId);

  if (loading || !pet) {
    return (
      <Link href="/student/pet"
        className="flex items-center gap-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-3xl p-3 border-2 border-purple-100 active:scale-95 transition-all">
        <div className="w-14 h-14 bg-white/60 rounded-2xl flex items-center justify-center text-2xl animate-pulse">🐾</div>
        <div>
          <p className="font-extrabold text-purple-700 text-sm">Đang gọi pet...</p>
        </div>
      </Link>
    );
  }

  const state = computePetState(pet);
  const stateLabel: Record<string, string> = {
    idle: "Đang chờ bạn",
    happy: "Đang vui vẻ 😊",
    sad: "Cần được chăm sóc 😢",
    excited: "Hứng khởi lắm! 🎉",
    sleep: "Đang ngủ 😴",
    eating: "Đang ăn 😋",
    studying: "Đang học cùng 📚",
  };

  const happinessColor = pet.happiness >= 70 ? "text-green-600" : pet.happiness >= 40 ? "text-yellow-600" : "text-red-500";

  return (
    <Link href="/student/pet"
      className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl p-3 border-2 border-purple-100 active:scale-95 transition-all shadow-sm">
      {/* Mini pet */}
      <PetAvatar pet={{ ...pet, state }} size="sm" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-display font-black text-slate-800 text-base leading-none">{pet.name}</p>
          <span className="text-xs bg-purple-100 text-purple-700 font-extrabold px-1.5 py-0.5 rounded-full">
            Lv.{pet.level}
          </span>
        </div>
        <p className={`text-xs font-bold ${happinessColor} mt-0.5`}>
          {stateLabel[state] || stateLabel.idle}
        </p>

        {/* Mini bars */}
        <div className="flex gap-2 mt-1.5">
          <div className="flex items-center gap-1">
            <span className="text-xs">❤️</span>
            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-pink-400 rounded-full" style={{ width: `${pet.happiness}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs">🍖</span>
            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pet.hunger}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Coins */}
      <div className="flex-shrink-0 text-right">
        <div className="flex items-center gap-1 bg-amber-100 rounded-xl px-2 py-1">
          <span className="text-xs">🪙</span>
          <span className="font-extrabold text-amber-700 text-xs">{pet.coins}</span>
        </div>
      </div>
    </Link>
  );
}