"use client";
// Full-screen pet room modal — phòng lớn + actions

import { useEffect } from "react";
import { X, ShoppingBag } from "lucide-react";
import Link from "next/link";
import PetRoom from "./PetRoom";
import PetAvatar from "./PetAvatar";
import type { Pet, InventoryItem } from "@/lib/pet";
import { FOOD_EFFECTS } from "@/lib/pet";
import { toast } from "sonner";

interface PetRoomModalProps {
  pet: Pet;
  inventory: InventoryItem[];
  onClose: () => void;
  onTouch: () => Promise<void>;
  onFeed: (item: InventoryItem) => Promise<void>;
  levelUpAnim: boolean;
}

export default function PetRoomModal({
  pet,
  inventory,
  onClose,
  onTouch,
  onFeed,
  levelUpAnim,
}: PetRoomModalProps) {
  const foodItems = inventory.filter(i => i.category === "food");

  // Lock body scroll khi modal mở
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* ── Full room ── */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <PetRoom
          bgId={pet.room_bg ?? "room_default"}
          equippedDecoIds={pet.room_decos ?? []}
          height={undefined}
          fullHeight
        >
          {/* Pet — height cố định để PetRoom tính top chính xác */}
          <div className="relative" style={{ height: 195 }}>
            {levelUpAnim && (
              <div className="absolute inset-0 rounded-full animate-ping bg-yellow-300 opacity-40 pointer-events-none z-20" />
            )}
            <PetAvatar
              pet={pet}
              size="xl"
              showMessage
              noFrame
              bubbleTop
              onClick={async () => {
                await onTouch();
                toast(`${pet.name} thích được vuốt ve! 💕`, { icon: "🐾" });
              }}
            />
          </div>
        </PetRoom>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 bg-white/90 backdrop-blur rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all"
        >
          <X className="w-5 h-5 text-slate-700" />
        </button>

        {/* Pet name + level badge */}
        <div className="absolute top-4 left-4 z-30 bg-white/90 backdrop-blur rounded-2xl px-3 py-2 shadow-lg">
          <p className="font-display font-black text-slate-800 text-sm">{pet.name}</p>
          <p className="text-slate-500 text-xs font-bold">Lv.{pet.level} • {pet.happiness}/100 ❤️</p>
        </div>
      </div>

      {/* ── Actions drawer ── */}
      <div className="bg-white rounded-t-3xl shadow-2xl px-4 pt-4 pb-8 safe-bottom">
        {/* Handle */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

        {/* Quick stat row */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          <div className="flex-shrink-0 flex items-center gap-1.5 bg-amber-100 rounded-2xl px-3 py-1.5">
            <span>🪙</span>
            <span className="font-extrabold text-amber-700 text-sm">{pet.coins} xu</span>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1.5 bg-pink-100 rounded-2xl px-3 py-1.5">
            <span>❤️</span>
            <span className="font-extrabold text-pink-600 text-sm">{pet.happiness}/100</span>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1.5 bg-orange-100 rounded-2xl px-3 py-1.5">
            <span>🍖</span>
            <span className="font-extrabold text-orange-600 text-sm">{pet.hunger}/100</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <button
            onClick={async () => {
              await onTouch();
              toast(`${pet.name} vui lắm! 💕`, { icon: "🐾" });
            }}
            className="flex flex-col items-center gap-1.5 bg-pink-500 text-white rounded-2xl py-3 active:scale-95 transition-all shadow-md shadow-pink-200"
          >
            <span className="text-2xl">💕</span>
            <span className="text-xs font-extrabold">Vuốt ve</span>
          </button>

          {foodItems.length > 0 ? (
            <button
              onClick={() => onFeed(foodItems[0])}
              className="flex flex-col items-center gap-1.5 bg-orange-500 text-white rounded-2xl py-3 active:scale-95 transition-all shadow-md shadow-orange-200"
            >
              <span className="text-2xl">{foodItems[0].emoji}</span>
              <span className="text-xs font-extrabold">Cho ăn</span>
            </button>
          ) : (
            <Link href="/student/shop?cat=food"
              className="flex flex-col items-center gap-1.5 bg-orange-200 text-orange-600 rounded-2xl py-3 active:scale-95 transition-all"
            >
              <span className="text-2xl">🍽️</span>
              <span className="text-xs font-extrabold">Mua ăn</span>
            </Link>
          )}

          <Link href="/student/shop"
            className="flex flex-col items-center gap-1.5 bg-purple-500 text-white rounded-2xl py-3 active:scale-95 transition-all shadow-md shadow-purple-200"
          >
            <ShoppingBag className="w-6 h-6" />
            <span className="text-xs font-extrabold">Shop</span>
          </Link>

          <button
            onClick={onClose}
            className="flex flex-col items-center gap-1.5 bg-slate-100 text-slate-600 rounded-2xl py-3 active:scale-95 transition-all"
          >
            <span className="text-2xl">⬇️</span>
            <span className="text-xs font-extrabold">Thu nhỏ</span>
          </button>
        </div>

        {/* Food quick-select nếu có nhiều loại */}
        {foodItems.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {foodItems.map(item => {
              const effect = FOOD_EFFECTS[item.id];
              return (
                <button key={item.id}
                  onClick={() => onFeed(item)}
                  className="flex-shrink-0 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-2xl px-3 py-2 active:scale-95 transition-all"
                >
                  <span className="text-xl">{item.emoji}</span>
                  <div className="text-left">
                    <p className="text-xs font-extrabold text-slate-700">{item.name}</p>
                    <p className="text-xs text-slate-400">×{item.quantity} {effect ? `+${effect.hunger}🍖` : ""}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
