"use client";
// app/student/shop/page.tsx — Pet Shop

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { StudentBottomNav } from "@/components/shared/BottomNav";
import { usePet } from "@/lib/usePet";
import { supabase } from "@/lib/supabaseClient";
import type { ShopItem, ItemCategory, Rarity } from "@/lib/pet";
import { RARITY_COLOR, RARITY_LABEL, PET_CATALOG } from "@/lib/pet";
import PetSprite from "@/components/pet/PetSprite";
import { ArrowLeft, Star, Zap, Heart, Pizza } from "lucide-react";
import { toast } from "sonner";

type ShopCategory = ItemCategory | "all" | "pet";

const CATEGORIES: { id: ShopCategory; label: string; emoji: string }[] = [
  { id: "all",        label: "Tất cả",   emoji: "🛍️" },
  { id: "pet",        label: "Pet",       emoji: "🐾" },
  { id: "food",       label: "Thức ăn",  emoji: "🍖" },
  { id: "hat",        label: "Mũ",       emoji: "🎩" },
  { id: "background", label: "Nền",      emoji: "🌸" },
  { id: "accessory",  label: "Phụ kiện", emoji: "✨" },
  { id: "skin",       label: "Áo",       emoji: "👗" },
];

function ShopContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { childSession } = useAppStore();
  const { pet, ownedPetIds, inventory, loading, buyItem, refetch } = usePet(childSession?.id);

  const [items, setItems] = useState<ShopItem[]>([]);
  const [cat, setCat] = useState<ShopCategory>((params.get("cat") as ShopCategory) || "all");
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

  const ownedQty = (itemId: string) =>
    inventory.find(i => i.id === itemId)?.quantity || 0;

  async function handleBuy(item: ShopItem) {
    setBuying(item.id);
    await buyItem(item);
    setBuying(null);
  }

  async function handleBuyPet(petId: string, price: number) {
    if (!childSession || !pet) return;
    if (pet.coins < price) {
      toast.error(`Không đủ xu! Cần ${price} 🪙`);
      return;
    }
    setBuying(petId);

    // Trừ xu
    const { error: coinErr } = await supabase
      .from("pets")
      .update({ coins: pet.coins - price })
      .eq("id", pet.id);
    if (coinErr) { toast.error("Lỗi trừ xu!"); setBuying(null); return; }

    // Thêm vào pet_inventory
    const { error: invErr } = await supabase
      .from("pet_inventory")
      .insert({ child_id: childSession.id, item_id: petId, quantity: 1 });
    if (invErr) { toast.error("Lỗi lưu pet!"); setBuying(null); return; }

    // Log coin ledger
    await supabase.from("coin_ledger").insert({
      child_id: childSession.id,
      delta: -price,
      reason: "pet_buy",
    });

    toast.success(`Đã mua pet! 🎉 Vào trang Pet để đổi nhé!`);
    refetch();
    setBuying(null);
  }

  // Pet catalog — chỉ hiện pet có giá > 0 (pet trả phí)
  const shopPets = PET_CATALOG.filter(p => p.price > 0);

  const filteredItems = cat === "all"
    ? items
    : cat === "pet"
      ? []
      : items.filter(i => i.category === cat);

  const showPets = cat === "all" || cat === "pet";

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

      {/* ── Pet section ── */}
      {showPets && (
        <div className="px-4 mb-4">
          {cat === "all" && (
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-black text-lg text-slate-800">🐾 Pet mới</h2>
              <button onClick={() => setCat("pet")} className="text-purple-500 font-extrabold text-sm">Xem tất cả</button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {(cat === "all" ? shopPets.slice(0, 4) : shopPets).map(p => {
              const owned = ownedPetIds.includes(p.id);
              const canAfford = pet.coins >= p.price;
              const lockedByLevel = pet.level < p.requiredLevel;

              return (
                <div key={p.id}
                  className={`bg-white rounded-3xl overflow-hidden border-2 transition-all shadow-sm
                    ${owned ? "border-purple-300" : canAfford && !lockedByLevel ? "border-slate-100" : "border-slate-100 opacity-70"}`}>

                  {/* Banner */}
                  <div className={`px-3 py-1 flex items-center justify-between
                    ${owned ? "bg-gradient-to-r from-purple-400 to-pink-400"
                      : lockedByLevel ? "bg-gradient-to-r from-slate-400 to-slate-500"
                      : "bg-gradient-to-r from-violet-500 to-purple-500"}`}>
                    <span className="text-white text-xs font-extrabold">
                      {owned ? "✓ Đã sở hữu" : lockedByLevel ? `🔒 Lv.${p.requiredLevel}` : "✨ Mới"}
                    </span>
                    <span className="text-white/80 text-xs font-bold flex items-center gap-0.5">
                      <Star className="w-3 h-3" /> Lv.{p.requiredLevel}+
                    </span>
                  </div>

                  <div className="p-3">
                    {/* Sprite preview */}
                    <div className="flex justify-center mb-2 h-16 items-center">
                      {p.spriteType === "sprite" ? (
                        <PetSprite petId={p.petdexId} state="idle" size={60} />
                      ) : (
                        <span className="text-5xl">{p.emoji}</span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-slate-800 text-sm text-center mb-1">{p.name}</h3>
                    <p className="text-slate-400 text-xs text-center font-semibold mb-2 leading-tight line-clamp-2">
                      {p.description}
                    </p>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-1 justify-center mb-3">
                      {p.stats.xpBonus > 0 && (
                        <span className="flex items-center gap-0.5 text-xs bg-purple-50 text-purple-600 font-extrabold px-1.5 py-0.5 rounded-lg">
                          <Zap className="w-3 h-3" />+{p.stats.xpBonus}% XP
                        </span>
                      )}
                      {p.stats.happinessDecay > 0 && (
                        <span className="flex items-center gap-0.5 text-xs bg-pink-50 text-pink-500 font-extrabold px-1.5 py-0.5 rounded-lg">
                          <Heart className="w-3 h-3" />-{p.stats.happinessDecay}% HP
                        </span>
                      )}
                      {p.stats.hungerDecay > 0 && (
                        <span className="flex items-center gap-0.5 text-xs bg-orange-50 text-orange-500 font-extrabold px-1.5 py-0.5 rounded-lg">
                          <Pizza className="w-3 h-3" />-{p.stats.hungerDecay}% đói
                        </span>
                      )}
                    </div>

                    {/* Buy button */}
                    <button
                      onClick={() => !owned && !lockedByLevel && handleBuyPet(p.id, p.price)}
                      disabled={owned || lockedByLevel || !canAfford || buying === p.id}
                      className={`w-full py-2.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-95
                        ${owned
                          ? "bg-purple-100 text-purple-600 cursor-default"
                          : lockedByLevel
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : canAfford
                              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-200"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        } ${buying === p.id ? "opacity-50" : ""}`}>
                      {buying === p.id ? (
                        <span className="animate-spin">⏳</span>
                      ) : owned ? (
                        "✓ Đã có"
                      ) : lockedByLevel ? (
                        `Mở lúc Lv.${p.requiredLevel}`
                      ) : (
                        <>🪙 {p.price}{!canAfford && <span className="text-xs">(Không đủ)</span>}</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Items section (Supabase shop_items) ── */}
      {filteredItems.length > 0 && (
        <div className="px-4">
          {cat === "all" && (
            <h2 className="font-display font-black text-lg text-slate-800 mb-3">🛍️ Vật phẩm</h2>
          )}
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map(item => {
              const owned = ownedQty(item.id);
              const canAfford = pet.coins >= item.price;
              const rarity = item.rarity as Rarity;

              return (
                <div key={item.id}
                  className={`bg-white rounded-3xl overflow-hidden border-2 transition-all ${
                    canAfford ? "border-slate-100 shadow-sm" : "border-slate-100 opacity-70"
                  }`}>
                  <div className={`bg-gradient-to-r ${RARITY_COLOR[rarity]} px-3 py-1 flex items-center justify-between`}>
                    <span className="text-white text-xs font-extrabold">{RARITY_LABEL[rarity]}</span>
                    {owned > 0 && (
                      <span className="bg-white/30 text-white text-xs font-black px-1.5 rounded-full">×{owned}</span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-5xl text-center mb-2">{item.emoji}</div>
                    <h3 className="font-extrabold text-slate-800 text-sm text-center leading-tight mb-1">{item.name}</h3>
                    <p className="text-slate-400 text-xs text-center font-semibold mb-2 leading-tight">{item.description}</p>
                    {item.effect && (
                      <div className="bg-green-50 rounded-xl px-2 py-1 text-center mb-3">
                        <span className="text-green-700 text-xs font-extrabold">{item.effect}</span>
                      </div>
                    )}
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
                        <>🪙 {item.price}{!canAfford && <span className="text-xs">(Không đủ)</span>}</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!showPets && filteredItems.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🏪</div>
          <p className="font-extrabold text-slate-500">Không có món nào trong mục này</p>
        </div>
      )}

      {/* Earn coins banner */}
      <div className="mx-4 mt-4 bg-gradient-to-r from-amber-400 to-orange-400 rounded-3xl p-4">
        <h3 className="font-display font-black text-white text-base mb-2">💡 Cách kiếm xu</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon:"📚", label:"Hoàn thành bài học", val:"+20🪙" },
            { icon:"🏆", label:"Quiz chiến thắng",   val:"+30🪙" },
            { icon:"⭐", label:"Điểm hoàn hảo",      val:"+50🪙" },
            { icon:"🔥", label:"Streak 7 ngày",       val:"+40🪙" },
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
