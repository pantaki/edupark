"use client";
// app/student/pet/page.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentBottomNav } from "@/components/shared/BottomNav";
import PetAvatar from "@/components/pet/PetAvatar";
import PetStatusBar from "@/components/pet/PetStatusBar";
import PetSelectScreen from "@/components/pet/PetSelectScreen";
import PetRoom, { ROOM_BACKGROUNDS, ROOM_DECOS } from "@/components/pet/PetRoom";
import PetRoomModal from "@/components/pet/PetRoomModal";
import { usePet } from "@/lib/usePet";
import { SPECIES_CONFIG, FOOD_EFFECTS, getPetCatalogById } from "@/lib/pet";
import type { InventoryItem } from "@/lib/pet";
import { ShoppingBag, Maximize2, Star, Zap } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRequireChild } from "@/lib/useRequireChild";

type Tab = "home" | "feed" | "dress" | "room";

export default function PetRoomPage() {
  const router = useRouter();
  const { childSession, ready } = useRequireChild();
  const {
    pet, needsPetSelection, ownedPetIds, inventory, loading, levelUpAnim,
    feedPet, touchPet, equipItem, createPet, changePet, renamePet,
    equipRoomBg, toggleRoomDeco, setNeedsPetSelection,
  } = usePet(childSession?.id);
  const [tab, setTab] = useState<Tab>("home");
  const [feeding, setFeeding] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!childSession) router.replace("/student/enter-code");
  }, [ready]);

  if (!ready || !childSession || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="text-7xl animate-bounce mb-4">🐾</div>
          <p className="font-display font-black text-slate-500 text-xl">Đang gọi pet...</p>
        </div>
      </div>
    );
  }

  if (needsPetSelection) {
    // User cũ có pet nhưng chưa chọn qua catalog (ownedPetIds rỗng)
    const isLegacyUser = !!pet && ownedPetIds.length === 0;
    // currentPetId: null = lần đầu hoặc legacy user → cho chọn pet mới
    const currentPetId = (!pet || isLegacyUser) ? null : (ownedPetIds[0] ?? null);
    return (
      <PetSelectScreen
        ownedPetIds={ownedPetIds}
        currentPetId={currentPetId}
        onSelect={(catalogId, species, petName) =>
          pet
            ? changePet(catalogId, species, petName)
            : createPet(catalogId, species, petName)
        }
        onRenameOnly={(petName) => renamePet(petName)}
        onBack={pet && !isLegacyUser ? () => setNeedsPetSelection(false) : undefined}
      />
    );
  }

  if (!pet) return null;

  const foodItems = inventory.filter(i => i.category === "food");
  const wearItems = inventory.filter(i => ["hat","background","accessory","skin"].includes(i.category));
  const cfg = SPECIES_CONFIG[pet.species as keyof typeof SPECIES_CONFIG];
  const currentRoomDecos = pet.room_decos ?? [];

  async function handleFeed(item: InventoryItem) {
    setFeeding(true);
    await feedPet(item.id);
    setFeeding(false);
  }

  return (
    <>
      {/* ── Full-screen room modal ── */}
      {roomOpen && (
        <PetRoomModal
          pet={pet}
          inventory={inventory}
          levelUpAnim={levelUpAnim}
          onClose={() => setRoomOpen(false)}
          onTouch={touchPet}
          onFeed={handleFeed}
        />
      )}

      <div className="min-h-screen pb-20 select-none"
        style={{ background: "linear-gradient(160deg, #fdf2f8 0%, #ede9fe 60%, #dbeafe 100%)" }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 pt-10 pb-3">
          <div>
            <h1 className="font-display font-black text-2xl text-slate-800">🐾 {pet.name}</h1>
            <p className="text-slate-500 text-sm font-semibold">{cfg?.label || pet.species} • Cấp {pet.level}</p>
          </div>
          <div className="flex gap-2">
            {levelUpAnim && (
              <div className="flex items-center gap-1 bg-yellow-400 rounded-2xl px-2 py-1.5 animate-bounce">
                <Zap className="w-3.5 h-3.5 text-yellow-900" />
                <span className="font-extrabold text-yellow-900 text-xs">LV UP!</span>
              </div>
            )}
            <button onClick={() => setNeedsPetSelection(true)}
              className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-white/80 active:scale-90 transition-all">
              <span className="text-lg">🔄</span>
            </button>
            <Link href="/student/shop"
              className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-white/80 active:scale-90 transition-all">
              <ShoppingBag className="w-5 h-5 text-slate-600" />
            </Link>
          </div>
        </div>

        {/* ── Pet room preview card — click để mở full ── */}
        <div className="mx-4 mb-4 relative">
          {/* overflow-visible để speech bubble không bị cắt */}
          <div
            className="rounded-3xl overflow-visible cursor-pointer active:scale-[0.98] transition-all shadow-xl"
            style={{ isolation: "isolate" }}
            onClick={() => setRoomOpen(true)}
          >
            <div className="rounded-3xl overflow-hidden">
              <PetRoom
                bgId={pet.room_bg ?? "room_default"}
                equippedDecoIds={currentRoomDecos}
                height={320}
                petHeightPx={195}
              >
                {/* height=195px = chiều cao sprite xl (208 * 180/192) */}
                <div className="relative" style={{ height: 195 }}>
                  {levelUpAnim && (
                    <div className="absolute inset-0 rounded-full animate-ping bg-yellow-300 opacity-40 pointer-events-none z-20" />
                  )}
                  <PetAvatar
                    pet={pet}
                    size="xl"
                    showMessage
                    noFrame
                    onClick={async () => {
                      await touchPet();
                      toast(`${pet.name} thích được vuốt ve! 💕`, { icon: "🐾" });
                    }}
                  />
                </div>
              </PetRoom>
            </div>

            {/* Expand hint */}
            <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur rounded-xl px-2 py-1 flex items-center gap-1 shadow-sm">
              <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-xs font-extrabold text-slate-600">Mở rộng</span>
            </div>
          </div>

          {/* Tap hint dưới phòng */}
          <p className="text-center text-slate-400 text-xs font-bold mt-2 animate-pulse">
            Bấm vào phòng để tương tác 💕
          </p>
        </div>

        {/* ── Stats card ── */}
        <div className="mx-4 bg-white/80 backdrop-blur rounded-3xl p-4 shadow-sm border border-white mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
              <Star className="w-4 h-4 text-purple-600 fill-purple-400" />
            </div>
            <span className="font-extrabold text-purple-700">Lv.{pet.level}</span>
            <div className="flex items-center gap-1 ml-auto bg-amber-100 rounded-xl px-2 py-1">
              <span className="text-sm">🪙</span>
              <span className="font-extrabold text-amber-700 text-sm">{pet.coins}</span>
            </div>
          </div>
          <PetStatusBar pet={pet} />
        </div>

        {/* ── Tabs ── */}
        <div className="mx-4 mb-4">
          <div className="flex gap-1.5 bg-white/60 backdrop-blur rounded-2xl p-1.5 border border-white shadow-sm">
            {([
              { id: "home" as Tab, label: "Nhà",    icon: "🏠" },
              { id: "feed" as Tab, label: "Cho ăn", icon: "🍖" },
              { id: "dress" as Tab, label: "Đồ",    icon: "🎨" },
              { id: "room" as Tab, label: "Phòng",  icon: "🛋️" },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center py-2 rounded-xl font-extrabold text-xs transition-all
                  ${tab === t.id ? "bg-purple-500 text-white shadow-md" : "text-slate-500"}`}>
                <span className="text-base mb-0.5">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab: Home ── */}
        {tab === "home" && (
          <div className="px-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={async () => { await touchPet(); toast(`${pet.name} vui lắm! 💕`, { icon: "🐾" }); }}
                className="bg-pink-500 text-white rounded-3xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-all shadow-lg shadow-pink-200">
                <span className="text-3xl">💕</span>
                <span className="font-extrabold text-sm">Vuốt ve</span>
                <span className="text-xs opacity-80">+8 hạnh phúc</span>
              </button>
              <button onClick={() => setTab("feed")}
                className="bg-orange-500 text-white rounded-3xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-all shadow-lg shadow-orange-200">
                <span className="text-3xl">🍖</span>
                <span className="font-extrabold text-sm">Cho ăn</span>
                <span className="text-xs opacity-80">{foodItems.length} loại thức ăn</span>
              </button>
              <button onClick={() => setRoomOpen(true)}
                className="bg-teal-500 text-white rounded-3xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-all shadow-lg shadow-teal-200">
                <span className="text-3xl">🏠</span>
                <span className="font-extrabold text-sm">Vào phòng</span>
                <span className="text-xs opacity-80">Chơi cùng pet</span>
              </button>
              <Link href="/student/shop"
                className="bg-purple-500 text-white rounded-3xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-all shadow-lg shadow-purple-200">
                <span className="text-3xl">🛒</span>
                <span className="font-extrabold text-sm">Cửa hàng</span>
                <span className="text-xs opacity-80">Mua đồ cho pet</span>
              </Link>
            </div>
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
                      className="bg-white/90 backdrop-blur rounded-3xl p-4 text-left border border-white active:scale-95 transition-all shadow-sm disabled:opacity-50">
                      <div className="text-4xl mb-2">{item.emoji}</div>
                      <p className="font-extrabold text-slate-800 text-sm">{item.name}</p>
                      <p className="text-slate-400 text-xs font-semibold">×{item.quantity}</p>
                      {effect && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-xs bg-orange-100 text-orange-700 font-extrabold px-1.5 py-0.5 rounded-lg">+{effect.hunger} 🍖</span>
                          <span className="text-xs bg-pink-100 text-pink-700 font-extrabold px-1.5 py-0.5 rounded-lg">+{effect.happiness} ❤️</span>
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
                const catLabel: Record<string, string> = { hat:"Mũ 🎩", background:"Nền pet 🌸", accessory:"Phụ kiện ✨", skin:"Áo 👗" };
                return (
                  <div key={cat}>
                    <p className="font-extrabold text-slate-700 mb-2">{catLabel[cat]}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {catItems.map(item => {
                        const isEquipped = pet.hat_item === item.id || pet.bg_item === item.id ||
                          pet.accessory === item.id || pet.color_skin === item.id;
                        return (
                          <button key={item.id} onClick={() => equipItem(item)}
                            className={`rounded-2xl p-3 text-center border-2 transition-all active:scale-95
                              ${isEquipped ? "bg-purple-100 border-purple-400 shadow-md" : "bg-white/80 border-white"}`}>
                            <div className="text-3xl mb-1">{item.emoji}</div>
                            <p className="text-xs font-extrabold text-slate-700 leading-tight">{item.name}</p>
                            {isEquipped && <span className="text-xs bg-purple-500 text-white rounded-full px-2 py-0.5 font-bold mt-1 inline-block">Đang đội</span>}
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

        {/* ── Tab: Room ── */}
        {tab === "room" && (
          <div className="px-4 space-y-4">
            {/* Nút mở phòng full */}
            <button onClick={() => setRoomOpen(true)}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-extrabold rounded-3xl py-4 flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-teal-200">
              <Maximize2 className="w-5 h-5" />
              Vào phòng đầy đủ
            </button>

            {/* Chọn nền phòng */}
            <div>
              <p className="font-extrabold text-slate-700 mb-2">🏠 Nền phòng</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {ROOM_BACKGROUNDS.map(bg => {
                  const active = (pet.room_bg ?? "room_default") === bg.id;
                  const canUse = bg.price === 0 || inventory.some(i => i.id === bg.id);
                  return (
                    <button key={bg.id}
                      onClick={() => canUse && equipRoomBg(bg.id)}
                      className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all active:scale-95 w-[72px]
                        ${active ? "border-purple-400 bg-purple-50 shadow-md" : canUse ? "border-slate-100 bg-white" : "border-slate-100 bg-slate-50 opacity-50"}`}>
                      <div className="w-10 h-10 rounded-xl border border-slate-200 overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${bg.wallColor}, ${bg.floorColor})` }} />
                      <p className="text-xs font-extrabold text-slate-600 text-center leading-tight">{bg.name}</p>
                      {bg.price > 0 && !canUse && <p className="text-xs text-slate-400">🪙{bg.price}</p>}
                      {active && <span className="text-xs bg-purple-500 text-white rounded-full px-1.5 font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Đồ trang trí */}
            <div>
              <p className="font-extrabold text-slate-700 mb-2">🛋️ Đồ trang trí <span className="text-slate-400 font-semibold text-sm">({currentRoomDecos.length} đang dùng)</span></p>
              <div className="grid grid-cols-3 gap-2">
                {ROOM_DECOS.map(deco => {
                  const equipped = currentRoomDecos.includes(deco.id);
                  const owned = inventory.some(i => i.id === deco.id) || deco.price === 0;
                  return (
                    <button key={deco.id}
                      onClick={() => owned && toggleRoomDeco(deco.id)}
                      className={`rounded-2xl p-3 text-center border-2 transition-all active:scale-95
                        ${equipped ? "bg-teal-100 border-teal-400 shadow-md"
                          : owned ? "bg-white border-slate-100"
                          : "bg-slate-50 border-slate-100 opacity-50"}`}>
                      <div className="text-3xl mb-1">{deco.emoji}</div>
                      <p className="text-xs font-extrabold text-slate-700 leading-tight">{deco.name}</p>
                      {!owned && <p className="text-xs text-slate-400 mt-0.5">🪙{deco.price}</p>}
                      {equipped && <span className="text-xs bg-teal-500 text-white rounded-full px-1.5 py-0.5 font-bold mt-1 inline-block">✓ Đặt</span>}
                    </button>
                  );
                })}
              </div>
              <Link href="/student/shop?cat=room_deco"
                className="mt-3 inline-flex items-center gap-1 text-purple-500 font-extrabold text-xs">
                🛒 Mua thêm đồ trang trí
              </Link>
            </div>
          </div>
        )}

        <StudentBottomNav />
      </div>
    </>
  );
}
