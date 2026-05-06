"use client";

import { useState } from "react";
import { ArrowLeft, Zap, Heart, Pizza, Star } from "lucide-react";
import PetSprite, { type PetSpriteState } from "./PetSprite";
import { PET_CATALOG, type PetCatalogEntry } from "@/lib/pet";

const PREVIEW_STATES: PetSpriteState[] = ["waving", "jumping", "idle", "running"];

interface PetSelectScreenProps {
  // Danh sách pet IDs bé đã sở hữu (mua hoặc nhận miễn phí)
  ownedPetIds: string[];
  // Pet đang active hiện tại (null = lần đầu)
  currentPetId: string | null;
  // catalogId + species tách riêng để caller dùng đúng value cho DB
  onSelect: (catalogId: string, species: string, petName: string) => Promise<boolean>;
  onRenameOnly: (petName: string) => Promise<boolean>;
  onBack?: () => void;
}

export default function PetSelectScreen({
  ownedPetIds,
  currentPetId,
  onSelect,
  onRenameOnly,
  onBack,
}: PetSelectScreenProps) {
  const isFirstTime = currentPetId === null;
  const freePets = PET_CATALOG.filter((p) => p.price === 0);
  const selectablePets = isFirstTime
    ? freePets
    : PET_CATALOG.filter((p) => ownedPetIds.includes(p.id));

  const onlyOnePet = selectablePets.length === 1 && !isFirstTime;

  const initialSelected = onlyOnePet
    ? selectablePets[0].id
    : (currentPetId ?? freePets[0]?.id ?? null);

  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const [name, setName] = useState("");
  const [previewStateIdx, setPreviewStateIdx] = useState(0);
  const [confirming, setConfirming] = useState(false);

  const selectedPet = PET_CATALOG.find((p) => p.id === selectedId);
  const previewState = PREVIEW_STATES[previewStateIdx];

  function cyclePreview() {
    setPreviewStateIdx((i) => (i + 1) % PREVIEW_STATES.length);
  }

  async function handleConfirm() {
    if (!selectedId || !name.trim()) return;
    setConfirming(true);
    let ok: boolean;
    if (onlyOnePet) {
      ok = await onRenameOnly(name.trim());
    } else {
      const entry = PET_CATALOG.find((p) => p.id === selectedId)!;
      ok = await onSelect(entry.id, entry.species, name.trim());
    }
    if (!ok) setConfirming(false);
  }

  const title = isFirstTime
    ? "Chọn người bạn đồng hành!"
    : onlyOnePet
      ? "Đổi tên pet"
      : "Chọn pet";

  const subtitle = isFirstTime
    ? "Bé sẽ cùng học và lớn lên với pet này 🌱"
    : onlyOnePet
      ? "Mua thêm pet ở cửa hàng để đổi pet nhé!"
      : "Chọn pet bé muốn dùng";

  return (
    <div
      className="min-h-screen flex flex-col pb-10"
      style={{ background: "linear-gradient(160deg, #fdf2f8 0%, #ede9fe 50%, #dbeafe 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center px-4 pt-10 pb-2 gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 active:scale-90 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
        )}
        <div>
          <h1 className="font-display font-black text-2xl text-slate-800">{title}</h1>
          <p className="text-slate-500 text-sm font-semibold">{subtitle}</p>
        </div>
      </div>

      {/* Preview */}
      <div className="flex flex-col items-center py-4">
        <div
          className="w-44 h-44 rounded-3xl bg-white/80 border-2 border-purple-100 shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all"
          onClick={selectedPet?.spriteType === "sprite" ? cyclePreview : undefined}
        >
          {selectedPet?.spriteType === "sprite" ? (
            <PetSprite petId={selectedPet.petdexId} state={previewState} size={130} />
          ) : selectedPet ? (
            <span className="text-7xl">{selectedPet.emoji}</span>
          ) : (
            <span className="text-5xl">🐾</span>
          )}
        </div>
        {selectedPet?.spriteType === "sprite" && (
          <p className="text-xs text-slate-400 font-semibold mt-2">Bấm để xem thêm động tác</p>
        )}
      </div>

      {/* Stats badge */}
      {selectedPet && (
        <div className="mx-4 mb-4 bg-white/80 rounded-2xl p-3 border border-purple-100 flex gap-3 justify-center">
          <div className="flex items-center gap-1 text-purple-600 font-extrabold text-xs">
            <Zap className="w-3.5 h-3.5" />
            +{selectedPet.stats.xpBonus}% XP
          </div>
          <div className="flex items-center gap-1 text-pink-500 font-extrabold text-xs">
            <Heart className="w-3.5 h-3.5" />
            -{selectedPet.stats.happinessDecay}% mất HP
          </div>
          <div className="flex items-center gap-1 text-orange-500 font-extrabold text-xs">
            <Pizza className="w-3.5 h-3.5" />
            -{selectedPet.stats.hungerDecay}% đói
          </div>
          <div className="flex items-center gap-1 text-amber-500 font-extrabold text-xs">
            <Star className="w-3.5 h-3.5" />
            Lv.{selectedPet.requiredLevel}+
          </div>
        </div>
      )}

      {/* Pet cards — chỉ hiện nếu có nhiều hơn 1 lựa chọn */}
      {!onlyOnePet && (
        <div className="grid grid-cols-3 gap-3 mx-4 mb-4">
          {selectablePets.map((pet) => (
            <button
              key={pet.id}
              onClick={() => { setSelectedId(pet.id); setPreviewStateIdx(0); }}
              className={`rounded-2xl p-3 border-2 text-center transition-all active:scale-95
                ${selectedId === pet.id
                  ? "bg-purple-100 border-purple-400 shadow-lg scale-105"
                  : "bg-white/80 border-white"
                }`}
            >
              <div className="w-14 h-14 mx-auto rounded-xl bg-purple-50 flex items-center justify-center mb-2 overflow-hidden">
                {pet.spriteType === "sprite" ? (
                  <PetSprite petId={pet.petdexId} state="idle" size={52} />
                ) : (
                  <span className="text-3xl">{pet.emoji}</span>
                )}
              </div>
              <p className="font-extrabold text-slate-700 text-xs">{pet.name}</p>
              {selectedId === pet.id && (
                <span className="mt-1 inline-block text-xs bg-purple-500 text-white rounded-full px-2 py-0.5 font-bold">
                  ✓ Chọn
                </span>
              )}
            </button>
          ))}

          {/* Slot mua thêm */}
          <button
            className="rounded-2xl p-3 border-2 border-dashed border-slate-200 bg-white/40 text-center opacity-70 active:scale-95 transition-all"
            onClick={() => {/* navigate to shop */}}
          >
            <div className="w-14 h-14 mx-auto rounded-xl bg-slate-100 flex items-center justify-center mb-2">
              <span className="text-2xl">🛒</span>
            </div>
            <p className="font-extrabold text-slate-400 text-xs">Mua thêm</p>
          </button>
        </div>
      )}

      {/* Nếu chỉ có 1 pet — hiện thông báo */}
      {onlyOnePet && selectablePets[0] && (
        <div className="mx-4 mb-4 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="font-extrabold text-amber-700 text-sm">Chỉ có 1 pet</p>
            <p className="text-amber-600 text-xs font-semibold mt-0.5">
              Mua thêm pet ở cửa hàng để có thể đổi giữa các pet nhé!
            </p>
          </div>
        </div>
      )}

      {/* Tên pet */}
      <div className="mx-4 mb-4">
        <label className="block font-extrabold text-slate-700 text-sm mb-2">
          {onlyOnePet ? "Đổi tên pet 🏷️" : "Đặt tên cho pet 🏷️"}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          placeholder={selectedPet?.name ?? "Nhập tên..."}
          maxLength={20}
          className="w-full rounded-2xl border-2 border-purple-200 bg-white px-4 py-3 font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-purple-400 text-base"
        />
      </div>

      {/* Confirm */}
      <div className="mx-4">
        <button
          disabled={!name.trim() || confirming || (!isFirstTime && !onlyOnePet && !selectedId)}
          onClick={handleConfirm}
          className="w-full bg-purple-500 disabled:opacity-40 text-white font-extrabold text-lg rounded-2xl py-4 shadow-lg shadow-purple-200 active:scale-95 transition-all"
        >
          {confirming
            ? "Đang lưu..."
            : onlyOnePet
              ? "Đổi tên"
              : isFirstTime
                ? "Bắt đầu hành trình! 🚀"
                : "Đổi pet"}
        </button>
      </div>
    </div>
  );
}
