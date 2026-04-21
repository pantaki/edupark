"use client";
// app/student/shop/page.tsx — Pet Shop

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { StudentBottomNav } from "@/components/shared/BottomNav";
import { usePet } from "@/lib/usePet";
import { supabase } from "@/lib/supabaseClient";
import type { ShopItem, ItemCategory, Rarity } from "@/lib/pet";
import { RARITY_COLOR, RARITY_LABEL } from "@/lib/pet";
import { ArrowLeft, ShoppingCart } from "lucide-react";

const CATEGORIES: { id: ItemCategory | "all"; label: string; emoji: string }[] = [
  { id: "all",        label: "Tất cả", emoji: "🛍️" },
  { id: "food",       label: "Thức ăn", emoji: "🍖" },
  { id: "hat",        label: "Mũ",     emoji: "🎩" },
  { id: "background", label: "Nền",    emoji: "🌸" },
  { id: "accessory",  label: "Phụ kiện",emoji: "✨" },
  { id: "skin",       label: "Áo",     emoji: "👗" },
];

function ShopContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { childSession } = useAppStore();
  const { pet, inventory, loading, buyItem } = usePet(childSession?.id);

  const [items, setItems] = useState<ShopItem[]>([]);
  const [cat, setCat] = useState<ItemCategory | "all">((params.get("cat") as ItemCategory) || "all");
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (!childSession) { router.replace("/student/enter-code"); return; }
    supabase.from("shop_items").select("*").eq("is_active", true).order("price")
      .then(({ data }) => setItems(data || []));
  }, [childSession, router]);

  if (!childSession || loading || !pet) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-5xl animate-bounce">🛒</div>
    </div>
  );

  const filtered = cat === "all" ? items : items.filter(i => i.category === cat);

  const ownedQty = (itemId: string) =>
    inventory.find(i => i.id === itemId)?.quantity || 0;

  async function handleBuy(item: ShopItem) {
    setBuying(item.id);
    await buyItem(item);
    setBuying(null);
  }

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-br from-violet-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur sticky top-0 z-40 px-4 py-3 border-b border-slate-100 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-90">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="font-display font-black text-xl flex-1">🛒 Cửa hàng</h1>
        <div className="flex items-center gap-1.5 bg-amber-100 rounded-2xl px-3 py-1.5">
          <span>🪙</span>
          <span className="font-display font-black text-amber-700">{pet.coins}</span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl font-extrabold text-sm border-2 transition-all active:scale-95
              ${cat === c.id ? "bg-purple-100 border-purple-400 text-purple-700" : "bg-white border-slate-200 text-slate-500"}`}>
            <span>{c.emoji}</span>{c.label}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="px-4 grid grid-cols-2 gap-3">
        {filtered.map(item => {
          const owned = ownedQty(item.id);
          const canAfford = pet.coins >= item.price;
          const rarity = item.rarity as Rarity;

          return (
            <div key={item.id}
              className={`bg-white rounded-3xl overflow-hidden border-2 transition-all ${
                canAfford ? "border-slate-100 shadow-sm" : "border-slate-100 opacity-70"
              }`}>
              {/* Rarity banner */}
              <div className={`bg-gradient-to-r ${RARITY_COLOR[rarity]} px-3 py-1 flex items-center justify-between`}>
                <span className="text-white text-xs font-extrabold">{RARITY_LABEL[rarity]}</span>
                {owned > 0 && (
                  <span className="bg-white/30 text-white text-xs font-black px-1.5 rounded-full">×{owned}</span>
                )}
              </div>

              <div className="p-4">
                {/* Item emoji */}
                <div className="text-5xl text-center mb-2">{item.emoji}</div>

                {/* Name & desc */}
                <h3 className="font-extrabold text-slate-800 text-sm text-center leading-tight mb-1">
                  {item.name}
                </h3>
                <p className="text-slate-400 text-xs text-center font-semibold mb-2 leading-tight">
                  {item.description}
                </p>

                {/* Effect */}
                {item.effect && (
                  <div className="bg-green-50 rounded-xl px-2 py-1 text-center mb-3">
                    <span className="text-green-700 text-xs font-extrabold">{item.effect}</span>
                  </div>
                )}

                {/* Buy button */}
                <button
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford || buying === item.id}
                  className={`w-full py-2.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-95
                    ${canAfford
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-200"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    } ${buying === item.id ? "opacity-50" : ""}`}>
                  {buying === item.id ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <>
                      <span>🪙</span>
                      <span>{item.price}</span>
                      {!canAfford && <span className="text-xs">(Không đủ xu)</span>}
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🏪</div>
          <p className="font-extrabold text-slate-500">Không có món nào trong mục này</p>
        </div>
      )}

      {/* How to earn coins banner */}
      <div className="mx-4 mt-4 bg-gradient-to-r from-amber-400 to-orange-400 rounded-3xl p-4">
        <h3 className="font-display font-black text-white text-base mb-2">💡 Cách kiếm xu</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon:"📚", label:"Hoàn thành bài học", val:"+20🪙" },
            { icon:"🏆", label:"Quiz chiến thắng", val:"+30🪙" },
            { icon:"⭐", label:"Điểm hoàn hảo", val:"+50🪙" },
            { icon:"🔥", label:"Streak 7 ngày", val:"+40🪙" },
          ].map((r, i) => (
            <div key={i} className="bg-white/20 rounded-2xl px-3 py-2 flex items-center gap-2">
              <span className="text-xl">{r.icon}</span>
              <div>
                <p className="text-white text-xs font-extrabold leading-tight">{r.label}</p>
                <p className="text-white/80 text-xs font-bold">{r.val}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <StudentBottomNav />
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-5xl animate-bounce">🛒</div></div>}>
      <ShopContent />
    </Suspense>
  );
}