"use client";
// components/pet/PetStatusBar.tsx

import type { Pet } from "@/lib/pet";
import { xpForNextLevel } from "@/lib/pet";

interface PetStatusBarProps {
  pet: Pet;
  compact?: boolean;
}

function Bar({ label, value, max = 100, color, icon }: {
  label: string; value: number; max?: number; color: string; icon: string;
}) {
  const pct = Math.round(Math.min((value / max) * 100, 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-slate-500 flex items-center gap-1">
          <span>{icon}</span>{label}
        </span>
        <span className="text-xs font-black text-slate-600">{value}/{max}</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function PetStatusBar({ pet, compact = false }: PetStatusBarProps) {
  const xpPct = Math.round((pet.xp / pet.xp_to_next) * 100);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-pink-50 rounded-xl px-2 py-1">
          <span className="text-sm">❤️</span>
          <span className="text-xs font-extrabold text-pink-700">{pet.happiness}</span>
        </div>
        <div className="flex items-center gap-1 bg-orange-50 rounded-xl px-2 py-1">
          <span className="text-sm">🍖</span>
          <span className="text-xs font-extrabold text-orange-700">{pet.hunger}</span>
        </div>
        <div className="flex items-center gap-1 bg-yellow-50 rounded-xl px-2 py-1">
          <span className="text-sm">⭐</span>
          <span className="text-xs font-extrabold text-yellow-700">Lv.{pet.level}</span>
        </div>
        <div className="flex items-center gap-1 bg-amber-50 rounded-xl px-2 py-1">
          <span className="text-sm">🪙</span>
          <span className="text-xs font-extrabold text-amber-700">{pet.coins}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Level + XP */}
      <div className="flex items-center gap-3 mb-1">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl px-3 py-1.5 font-display font-black text-lg flex-shrink-0">
          Lv.{pet.level}
        </div>
        <div className="flex-1">
          <div className="flex justify-between mb-1">
            <span className="text-xs font-extrabold text-purple-500">✨ XP</span>
            <span className="text-xs font-bold text-slate-400">{pet.xp}/{pet.xp_to_next}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full transition-all duration-700"
              style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </div>

      <Bar label="Hạnh phúc" value={pet.happiness} color={
        pet.happiness >= 70 ? "bg-gradient-to-r from-pink-400 to-red-400" :
        pet.happiness >= 40 ? "bg-gradient-to-r from-yellow-400 to-orange-400" :
        "bg-gradient-to-r from-slate-400 to-slate-500"
      } icon="❤️" />

      <Bar label="No bụng" value={pet.hunger} color={
        pet.hunger >= 70 ? "bg-gradient-to-r from-orange-400 to-amber-400" :
        pet.hunger >= 40 ? "bg-gradient-to-r from-yellow-400 to-orange-400" :
        "bg-gradient-to-r from-red-400 to-red-500"
      } icon="🍖" />

      {/* Coins */}
      <div className="flex items-center justify-between bg-amber-50 rounded-2xl px-3 py-2 border border-amber-100">
        <span className="font-extrabold text-amber-700 text-sm flex items-center gap-1.5">
          🪙 Xu của bé
        </span>
        <span className="font-display font-black text-amber-600 text-lg">{pet.coins}</span>
      </div>
    </div>
  );
}