"use client";
// app/student/pet/page.tsx  — Pet Room: main interaction screen

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { StudentBottomNav } from "@/components/shared/BottomNav";
import PetAvatar from "@/components/pet/PetAvatar";
import PetStatusBar from "@/components/pet/PetStatusBar";
import { usePet } from "@/lib/usePet";
import { SPECIES_CONFIG, STATE_MESSAGES, FOOD_EFFECTS } from "@/lib/pet";
import type { InventoryItem } from "@/lib/pet";
import { ShoppingBag, Settings, Heart, Star, Zap } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type Tab = "home" | "feed" | "dress";

export default function PetRoomPage() {
  const router = useRouter();
  const { childSession } = useAppStore();
  const { pet, inventory, loading, levelUpAnim, feedPet, touchPet, equipItem } = usePet(childSession?.id);
  const [tab, setTab] = useState<Tab>("home");
  const [feeding, setFeeding] = useState(false);
  const [nameEditOpen, setNameEditOpen] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!childSession) router.replace("/student/enter-code");
  }, [childSession, router]);

  if (!childSession || loading || !pet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="text-7xl animate-bounce mb-4">🐾</div>
          <p className="font-display font-black text-slate-500 text-xl">Đang gọi pet...</p>
        </div>
      </div>
    );
  }

  const foodItems = inventory.filter(i => i.category === "food");
  const wearItems = inventory.filter(i => ["hat","background","accessory","skin"].includes(i.category));

  async function handleFeed(item: InventoryItem) {
    setFeeding(true);
    await feedPet(item.id);
    setFeeding(false);
  }

  const cfg = SPECIES_CONFIG[pet.species as keyof typeof SPECIES_CONFIG];

  return (
    <div className="min-h-screen pb-20 select-none"
      style={{ background: "linear-gradient(160deg, #fdf2f8 0%, #ede9fe 50%, #dbeafe 100%)" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-12 pb-2">
        <div>
          <h1 className="font-display font-black text-2xl text-slate-800">
            🐾 {pet.name}
          </h1>
          <p className="text-slate-500 text-sm font-semibold">{cfg?.label || pet.species} • Cấp {pet.level}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/student/shop"
            className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 active:scale-90 transition-all">
            <ShoppingBag className="w-5 h-5 text-slate-600" />
          </Link>
        </div>
      </div>

      {/* ── Coin + XP quick bar ── */}
      <div className="px-4 mb-2">
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 bg-amber-100 rounded-2xl px-3 py-1.5">
            <span className="text-base">🪙</span>
            <span className="font-extrabold text-amber-700">{pet.coins} xu</span>
          </div>
          <div className="flex items-center gap-1.5 bg-purple-100 rounded-2xl px-3 py-1.5">
            <Star className="w-4 h-4 text-purple-600 fill-purple-400" />
            <span className="font-extrabold text-purple-700">Lv.{pet.level}</span>
          </div>
          {levelUpAnim && (
            <div className="flex items-center gap-1.5 bg-yellow-400 rounded-2xl px-3 py-1.5 animate-bounce">
              <Zap className="w-4 h-4 text-yellow-900" />
              <span className="font-extrabold text-yellow-900">LEVEL UP!</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Pet Stage ── */}
      <div className="flex flex-col items-center py-4 px-4">
        <div className="relative">
          {/* Level up burst */}
          {levelUpAnim && (
            <div className="absolute inset-0 rounded-full animate-ping bg-yellow-300 opacity-40 pointer-events-none z-20" />
          )}
          <PetAvatar
            pet={pet}
            size="xl"
            showMessage
            onClick={async () => {
              await touchPet();
              toast(`${pet.name} thích được vuốt ve! 💕`, { icon: "🐾" });
            }}
            className="drop-shadow-xl"
          />
        </div>

        {/* Tap hint */}
        <p className="text-slate-400 text-xs font-bold mt-2 animate-pulse">
          Chạm vào {pet.name} để vuốt ve 💕
        </p>
      </div>

      {/* ── Status bars ── */}
      <div className="mx-4 bg-white/80 backdrop-blur rounded-3xl p-4 shadow-sm border border-white mb-4">
        <PetStatusBar pet={pet} />
      </div>

      {/* ── Tabs ── */}
      <div className="mx-4 mb-4">
        <div className="flex gap-2 bg-white/60 backdrop-blur rounded-2xl p-1.5 border border-white">
          {[
            { id: "home" as Tab, label: "Nhà", icon: "🏠" },
            { id: "feed" as Tab, label: "Cho ăn", icon: "🍖" },
            { id: "dress" as Tab, label: "Trang trí", icon: "🎨" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-extrabold text-sm transition-all
                ${tab === t.id ? "bg-white shadow-md text-slate-800" : "text-slate-500"}`}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Home ── */}
      {tab === "home" && (
        <div className="px-4 space-y-3">
          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={async () => { await touchPet(); }}
              className="bg-pink-500 text-white rounded-3xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-all shadow-lg shadow-pink-200">
              <span className="text-3xl">💕</span>
              <span className="font-extrabold text-sm">Vuốt ve</span>
              <span className="text-xs opacity-80">+8 hạnh phúc</span>
            </button>

            <button
              onClick={() => setTab("feed")}
              className="bg-orange-500 text-white rounded-3xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-all shadow-lg shadow-orange-200">
              <span className="text-3xl">🍖</span>
              <span className="font-extrabold text-sm">Cho ăn</span>
              <span className="text-xs opacity-80">{foodItems.length} loại thức ăn</span>
            </button>

            <Link href="/student/shop"
              className="bg-purple-500 text-white rounded-3xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-all shadow-lg shadow-purple-200">
              <span className="text-3xl">🛒</span>
              <span className="font-extrabold text-sm">Cửa hàng</span>
              <span className="text-xs opacity-80">Mua đồ cho pet</span>
            </Link>

            <button
              onClick={() => setTab("dress")}
              className="bg-teal-500 text-white rounded-3xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-all shadow-lg shadow-teal-200">
              <span className="text-3xl">🎨</span>
              <span className="font-extrabold text-sm">Trang trí</span>
              <span className="text-xs opacity-80">Thay đồ & phụ kiện</span>
            </button>
          </div>

          {/* Low happiness warning */}
          {pet.happiness < 30 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-3 flex items-center gap-3">
              <span className="text-3xl">😢</span>
              <div>
                <p className="font-extrabold text-red-700 text-sm">{pet.name} đang buồn lắm!</p>
                <p className="text-red-500 text-xs font-semibold">Vuốt ve và cho ăn để bé vui lên nhé!</p>
              </div>
            </div>
          )}
          {pet.hunger < 20 && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-3 flex items-center gap-3">
              <span className="text-3xl">🍽️</span>
              <div>
                <p className="font-extrabold text-orange-700 text-sm">{pet.name} đói bụng rồi!</p>
                <p className="text-orange-500 text-xs font-semibold">Mua thức ăn ở cửa hàng rồi cho bé ăn nhé!</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Feed ── */}
      {tab === "feed" && (
        <div className="px-4 space-y-3">
          {foodItems.length === 0 ? (
            <div className="bg-white/80 rounded-3xl p-8 text-center border border-white">
              <div className="text-5xl mb-3">🍽️</div>
              <p className="font-extrabold text-slate-600">Không có thức ăn!</p>
              <p className="text-slate-400 text-sm mt-1">Mua thức ăn ở cửa hàng nhé</p>
              <Link href="/student/shop?cat=food"
                className="mt-4 inline-flex items-center gap-2 bg-orange-500 text-white font-extrabold rounded-2xl px-5 py-3 active:scale-95 transition-all shadow-lg shadow-orange-200">
                🛒 Đến cửa hàng
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {foodItems.map(item => {
                const effect = FOOD_EFFECTS[item.id];
                return (
                  <button key={item.id} onClick={() => handleFeed(item)} disabled={feeding}
                    className="bg-white/90 backdrop-blur rounded-3xl p-4 text-left border-2 border-white active:scale-95 transition-all shadow-sm disabled:opacity-50">
                    <div className="text-4xl mb-2">{item.emoji}</div>
                    <p className="font-extrabold text-slate-800 text-sm">{item.name}</p>
                    <p className="text-slate-400 text-xs font-semibold">Số lượng: {item.quantity}</p>
                    {effect && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-xs bg-orange-100 text-orange-700 font-extrabold px-1.5 py-0.5 rounded-lg">
                          +{effect.hunger} 🍖
                        </span>
                        <span className="text-xs bg-pink-100 text-pink-700 font-extrabold px-1.5 py-0.5 rounded-lg">
                          +{effect.happiness} ❤️
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Dress ── */}
      {tab === "dress" && (
        <div className="px-4 space-y-4">
          {wearItems.length === 0 ? (
            <div className="bg-white/80 rounded-3xl p-8 text-center border border-white">
              <div className="text-5xl mb-3">🎨</div>
              <p className="font-extrabold text-slate-600">Chưa có phụ kiện nào!</p>
              <Link href="/student/shop"
                className="mt-4 inline-flex items-center gap-2 bg-purple-500 text-white font-extrabold rounded-2xl px-5 py-3 active:scale-95 transition-all shadow-lg shadow-purple-200">
                🛒 Đến cửa hàng
              </Link>
            </div>
          ) : (
            ["hat","background","accessory","skin"].map(cat => {
              const catItems = wearItems.filter(i => i.category === cat);
              if (!catItems.length) return null;
              const catLabel: Record<string, string> = { hat:"Mũ 🎩", background:"Nền 🌸", accessory:"Phụ kiện ✨", skin:"Áo 👗" };
              return (
                <div key={cat}>
                  <p className="font-extrabold text-slate-700 mb-2">{catLabel[cat]}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {catItems.map(item => {
                      const isEquipped = pet.hat_item === item.id || pet.bg_item === item.id ||
                        pet.accessory === item.id || pet.color_skin === item.id;
                      return (
                        <button key={item.id} onClick={() => equipItem(item)}
                          className={`rounded-2xl p-3 text-center border-2 transition-all active:scale-95 ${
                            isEquipped
                              ? "bg-purple-100 border-purple-400 shadow-md"
                              : "bg-white/80 border-white"
                          }`}>
                          <div className="text-3xl mb-1">{item.emoji}</div>
                          <p className="text-xs font-extrabold text-slate-700 leading-tight">{item.name}</p>
                          {isEquipped && (
                            <span className="text-xs bg-purple-500 text-white rounded-full px-2 py-0.5 font-bold mt-1 inline-block">
                              Đang đội
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <StudentBottomNav />
    </div>
  );
}