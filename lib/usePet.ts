"use client";
// lib/usePet.ts — React hook for Pet System

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Pet, ShopItem, InventoryItem,
  addXpToPet, computePetState, computeHappinessDecay, computeHungerDecay,
  FOOD_EFFECTS, PET_XP_REWARDS, COIN_REWARDS,
  xpForNextLevel,
} from "@/lib/pet";
import { toast } from "sonner";

export function usePet(childId: string | undefined) {
  const [pet, setPet] = useState<Pet | null>(null);
  const [needsPetSelection, setNeedsPetSelection] = useState(false);
  const [ownedPetIds, setOwnedPetIds] = useState<string[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelUpAnim, setLevelUpAnim] = useState(false);
  const prevLevel = useRef(1);

  type PetProgress = {
    xp: number;
    level: number;
    xp_to_next: number;
  };

  // ── Fetch pet (show selection if not exists) ───────────────────
  const fetchPet = useCallback(async () => {
    if (!childId) return;
    let { data: petData } = await supabase
      .from("pets")
      .select("*")
      .eq("child_id", childId)
      .single();

    if (!petData) {
      setNeedsPetSelection(true);
      setLoading(false);
      return;
    }

    if (petData) {
      const updatedHappiness = computeHappinessDecay(petData);
      const updatedHunger = computeHungerDecay(petData);
      const updatedState = computePetState({
        ...petData,
        happiness: updatedHappiness,
        hunger: updatedHunger,
      });

      if (
        updatedHappiness !== petData.happiness ||
        updatedHunger !== petData.hunger
      ) {
        await supabase
          .from("pets")
          .update({
            happiness: updatedHappiness,
            hunger: updatedHunger,
            state: updatedState,
          })
          .eq("id", petData.id);
        petData = {
          ...petData,
          happiness: updatedHappiness,
          hunger: updatedHunger,
          state: updatedState,
        };
      }

      prevLevel.current = petData.level;
      setPet(petData);

      // Lấy danh sách pet IDs đã sở hữu từ pet_inventory
      // Chỉ lấy item_id có prefix "junie","bubu","peanut",... (pet catalog IDs)
      const PET_IDS = ["junie","bubu","peanut","bella","totoro","douos-douos","super-piglet","kitsune","luffy","academicasi","wukong-4"];
      const { data: petItems } = await supabase
        .from("pet_inventory")
        .select("item_id")
        .eq("child_id", childId)
        .in("item_id", PET_IDS);
      const ids = (petItems ?? []).map((r: { item_id: string }) => r.item_id);
      // User đã chọn pet nếu có ít nhất 1 pet trong inventory
      const hasChosen = ids.length > 0;
      setOwnedPetIds(hasChosen ? ids : []);
    }
    setLoading(false);
  }, [childId]);

  // ── Fetch inventory ────────────────────────────────────────────
  // FIX: pet_inventory.item_id là text slug (food_apple, food_cake...)
  // KHÔNG có FK constraint nên Supabase không auto-join được shop_items(*)
  // → fetch 2 bảng riêng rồi merge thủ công
  const fetchInventory = useCallback(async () => {
    if (!childId) return;

    // Bước 1: lấy tất cả rows của child trong pet_inventory
    const { data: invRows, error: invErr } = await supabase
      .from("pet_inventory")
      .select("id, child_id, item_id, quantity, equipped")
      .eq("child_id", childId);

    if (invErr || !invRows || invRows.length === 0) {
      setInventory([]);
      return;
    }

    // Bước 2: lấy danh sách item_id cần fetch
    const itemIds = invRows.map((r) => r.item_id);

    // Bước 3: fetch shop_items tương ứng
    const { data: shopItems, error: shopErr } = await supabase
      .from("shop_items")
      .select("*")
      .in("id", itemIds);

    if (shopErr || !shopItems) {
      setInventory([]);
      return;
    }

    // Bước 4: merge — với mỗi invRow, tìm shopItem theo item_id = shop_items.id
    const shopMap = new Map<string, ShopItem>(
      shopItems.map((s: ShopItem) => [s.id, s]),
    );

    const merged: InventoryItem[] = invRows
      .map((row) => {
        const shopItem = shopMap.get(row.item_id);
        if (!shopItem) return null; // item tồn tại trong inv nhưng không có trong shop_items
        return {
          ...shopItem,
          quantity: row.quantity,
          equipped: row.equipped,
        } as InventoryItem;
      })
      .filter(Boolean) as InventoryItem[];

    setInventory(merged);
  }, [childId]);

  useEffect(() => {
    fetchPet();
    fetchInventory();
  }, [fetchPet, fetchInventory]);

  // ── Realtime pet updates ───────────────────────────────────────
  useEffect(() => {
    if (!pet?.id) return;
    const ch = supabase
      .channel(`pet-${pet.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pets",
          filter: `id=eq.${pet.id}`,
        },
        (payload) => {
          const updated = payload.new as Pet;
          if (updated.level > prevLevel.current) {
            setLevelUpAnim(true);
            toast.success(
              `🎉 ${updated.name} lên cấp ${updated.level}! +${COIN_REWARDS.pet_levelup} xu!`,
            );
            setTimeout(() => setLevelUpAnim(false), 3000);
            prevLevel.current = updated.level;
          }
          setPet(updated);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [pet?.id]);

  // ── Helper: update pet in DB + state ──────────────────────────
  async function updatePet(patch: Partial<Pet>) {
    if (!pet) return;
    const merged = { ...pet, ...patch };
    merged.state = computePetState(merged);
    await supabase
      .from("pets")
      .update({
        ...patch,
        state: merged.state,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pet.id);
    setPet(merged);
  }

  // ── Helper: gain XP + handle level up ─────────────────────────
  async function gainXp(xpGain: number) {
    if (!pet || !childId) return;

    const progress = addXpToPet(pet, xpGain);
    const didLevelUp = progress.level > pet.level;
    const coinBonus = didLevelUp ? COIN_REWARDS.pet_levelup : 0;

    const patch: Partial<Pet> = {
      ...progress,
      coins: pet.coins + coinBonus,
      happiness: Math.min(100, pet.happiness + (didLevelUp ? 20 : 0)),
    };

    await updatePet(patch);

    if (didLevelUp) {
      await supabase.from("coin_ledger").insert({
        child_id: childId,
        delta: coinBonus,
        reason: "pet_levelup",
      });
      await supabase.from("pet_activities").insert({
        child_id: childId,
        activity: "level_up",
        xp_gained: xpGain,
      });
    }
  }

  // ── FEED ───────────────────────────────────────────────────────
  async function feedPet(foodItemId: string) {
    if (!pet || !childId) return false;

    // FIX: item.id trong inventory đã là slug (food_apple, food_cake...)
    // vì fetchInventory merge từ shop_items.id = slug text
    const effect = FOOD_EFFECTS[foodItemId];
    if (!effect) {
      console.error(
        "[feedPet] Không tìm thấy effect cho:",
        foodItemId,
        "\nFOOD_EFFECTS keys:",
        Object.keys(FOOD_EFFECTS),
      );
      toast.error("Lỗi: không tìm thấy thông tin thức ăn!");
      return false;
    }

    // Kiểm tra inventory (dùng item.id = slug)
    const invItem = inventory.find((i) => i.id === foodItemId);
    if (!invItem || invItem.quantity < 1) {
      toast.error("Không còn thức ăn này!");
      return false;
    }

    // FIX: pet_inventory dùng column "item_id" (không phải "id")
    // khi update/delete phải filter theo item_id, không phải id
    const newQty = invItem.quantity - 1;
    if (newQty <= 0) {
      await supabase
        .from("pet_inventory")
        .delete()
        .eq("child_id", childId)
        .eq("item_id", foodItemId); // ← FIX: item_id thay vì id
    } else {
      await supabase
        .from("pet_inventory")
        .update({ quantity: newQty })
        .eq("child_id", childId)
        .eq("item_id", foodItemId); // ← FIX: item_id thay vì id
    }

    // Apply effect lên pet
    const newHunger = Math.min(100, pet.hunger + effect.hunger);
    const newHappiness = Math.min(100, pet.happiness + effect.happiness);
    await updatePet({
      hunger: newHunger,
      happiness: newHappiness,
      state: "eating",
      last_fed_at: new Date().toISOString(),
    });

    // XP + activity log
    await gainXp(effect.xp);
    await supabase.from("pet_activities").insert({
      child_id: childId,
      activity: "fed",
      xp_gained: effect.xp,
      happiness_delta: effect.happiness,
    });

    // Refresh inventory để UI cập nhật số lượng
    fetchInventory();
    toast.success(
      `${pet.name} ăn ngon lắm! +${effect.hunger} no bụng, +${effect.happiness} vui 🍪`,
    );

    // Reset về trạng thái bình thường sau 2s
    setTimeout(() => {
      updatePet({
        state: computePetState({
          ...pet,
          hunger: newHunger,
          happiness: newHappiness,
        }),
      });
    }, 2000);

    return true;
  }

  // ── PET (touch) ────────────────────────────────────────────────
  async function touchPet() {
    if (!pet || !childId) return;
    const newHappiness = Math.min(100, pet.happiness + 8);
    await updatePet({
      happiness: newHappiness,
      state: "happy",
      last_pet_at: new Date().toISOString(),
    });
    await supabase.from("pet_activities").insert({
      child_id: childId,
      activity: "petted",
      xp_gained: 0,
      happiness_delta: 8,
    });
    setTimeout(
      () =>
        updatePet({
          state: computePetState({ ...pet, happiness: newHappiness }),
        }),
      2000,
    );
  }

  // ── BUY ITEM ───────────────────────────────────────────────────
  async function buyItem(item: ShopItem): Promise<boolean> {
    if (!pet || !childId) return false;
    if (pet.coins < item.price) {
      toast.error(`Không đủ xu! Cần ${item.price} 🪙`);
      return false;
    }

    const newCoins = pet.coins - item.price;
    await supabase.from("pets").update({ coins: newCoins }).eq("id", pet.id);
    setPet((p) => (p ? { ...p, coins: newCoins } : p));

    // FIX: upsert dùng item_id (slug), không phải id (UUID của pet_inventory row)
    const { data: existing } = await supabase
      .from("pet_inventory")
      .select("quantity")
      .eq("child_id", childId)
      .eq("item_id", item.id) // ← item.id = slug từ shop_items
      .single();

    if (existing) {
      await supabase
        .from("pet_inventory")
        .update({ quantity: existing.quantity + 1 })
        .eq("child_id", childId)
        .eq("item_id", item.id);
    } else {
      await supabase
        .from("pet_inventory")
        .insert({ child_id: childId, item_id: item.id, quantity: 1 });
    }

    await supabase
      .from("coin_ledger")
      .insert({ child_id: childId, delta: -item.price, reason: "item_buy" });

    fetchInventory();
    toast.success(`Đã mua ${item.name}! 🛒`);
    return true;
  }

  // ── EQUIP ITEM ─────────────────────────────────────────────────
  async function equipItem(item: InventoryItem) {
    if (!pet || !childId) return;
    const field: Record<string, keyof Pet> = {
      hat: "hat_item",
      background: "bg_item",
      accessory: "accessory",
      skin: "color_skin",
    };
    const col = field[item.category];
    if (!col) return;

    const isCurrentlyEquipped = pet[col] === item.id;
    const newVal = isCurrentlyEquipped ? null : item.id;

    await supabase
      .from("pets")
      .update({ [col]: newVal })
      .eq("id", pet.id);
    setPet((p) => (p ? { ...p, [col]: newVal } : p));
    toast.success(
      isCurrentlyEquipped
        ? `Đã tháo ${item.name}`
        : `Đã trang bị ${item.name}! ✨`,
    );
  }

  // ── EARN COINS ─────────────────────────────────────────────────
  async function earnCoins(amount: number, reason: string) {
    if (!pet || !childId) return;
    const newCoins = pet.coins + amount;
    await supabase.from("pets").update({ coins: newCoins }).eq("id", pet.id);
    setPet((p) => (p ? { ...p, coins: newCoins } : p));
    await supabase
      .from("coin_ledger")
      .insert({ child_id: childId, delta: amount, reason });
  }

  // ── EARN XP FROM STUDY ─────────────────────────────────────────
  async function onLessonComplete(isPerfect: boolean) {
    if (!childId) return;
    const xp = isPerfect
      ? PET_XP_REWARDS.perfect_score
      : PET_XP_REWARDS.lesson_complete;
    const coins = isPerfect
      ? COIN_REWARDS.perfect_score
      : COIN_REWARDS.lesson_complete;
    await gainXp(xp);
    await earnCoins(coins, isPerfect ? "perfect_score" : "lesson_complete");
    await supabase
      .from("pet_activities")
      .insert({ child_id: childId, activity: "lesson_done", xp_gained: xp });
  }

  // ── CREATE PET (sau khi chọn lần đầu) ────────────────────────────
  // catalogId: slug trong PET_CATALOG (vd "junie"), species: value DB hợp lệ
  async function createPet(catalogId: string, species: string, name: string): Promise<boolean> {
    if (!childId) return false;
    const { error } = await supabase.from("pets").insert({
      child_id: childId,
      name: name.trim(),
      species,
      level: 1, xp: 0, xp_to_next: 100,
      happiness: 80, hunger: 80, state: "idle", coins: 50,
    });
    if (error) {
      console.error("[createPet] error:", error);
      toast.error(`Không tạo được pet: ${error.message}`);
      return false;
    }
    // Mark pet đã chọn vào inventory
    await supabase.from("pet_inventory")
      .upsert({ child_id: childId, item_id: catalogId, quantity: 1 }, { onConflict: "child_id,item_id" });

    const { data: newPet, error: fetchErr } = await supabase
      .from("pets").select("*").eq("child_id", childId).single();
    if (fetchErr || !newPet) {
      toast.error(`Lỗi đọc pet: ${fetchErr?.message}`);
      return false;
    }
    setPet(newPet);
    setOwnedPetIds([catalogId]);
    setNeedsPetSelection(false);
    return true;
  }

  // ── RENAME PET (chỉ đổi tên) ──────────────────────────────────
  async function renamePet(name: string): Promise<boolean> {
    if (!pet) return false;
    const { error } = await supabase
      .from("pets")
      .update({ name: name.trim() })
      .eq("id", pet.id);
    if (error) {
      toast.error(`Lỗi: ${error.message}`);
      return false;
    }
    setPet((p) => (p ? { ...p, name: name.trim() } : p));
    setNeedsPetSelection(false);
    toast.success(`Đã đổi tên thành ${name.trim()}! 🏷️`);
    return true;
  }

  // ── CHANGE PET (đổi pet, giữ coins + level) ────────────────────
  async function changePet(catalogId: string, species: string, name: string): Promise<boolean> {
    if (!pet || !childId) return false;
    const { data: updated, error } = await supabase
      .from("pets")
      .update({ species, name: name.trim(), state: "idle", happiness: 80, hunger: 80 })
      .eq("id", pet.id).select().single();
    if (error) {
      console.error("[changePet] error:", error);
      toast.error("Không đổi được pet, thử lại nhé!");
      return false;
    }
    // Mark pet mới vào inventory
    await supabase.from("pet_inventory")
      .upsert({ child_id: childId, item_id: catalogId, quantity: 1 }, { onConflict: "child_id,item_id" });

    if (updated) {
      setPet(updated);
      setOwnedPetIds(prev => prev.includes(catalogId) ? prev : [...prev, catalogId]);
      setNeedsPetSelection(false);
    }
    return true;
  }

  // ── EQUIP ROOM BG ──────────────────────────────────────────────
  async function equipRoomBg(bgId: string) {
    if (!pet) return;
    await supabase.from("pets").update({ room_bg: bgId }).eq("id", pet.id);
    setPet(p => p ? { ...p, room_bg: bgId } : p);
    toast.success("Đã đổi phòng! 🏠");
  }

  // ── TOGGLE ROOM DECO ───────────────────────────────────────────
  async function toggleRoomDeco(decoId: string) {
    if (!pet) return;
    const current = pet.room_decos ?? [];
    const next = current.includes(decoId)
      ? current.filter(d => d !== decoId)
      : [...current, decoId];
    await supabase.from("pets").update({ room_decos: next }).eq("id", pet.id);
    setPet(p => p ? { ...p, room_decos: next } : p);
  }

  return {
    pet,
    needsPetSelection,
    inventory,
    loading,
    levelUpAnim,
    feedPet,
    touchPet,
    buyItem,
    equipItem,
    earnCoins,
    onLessonComplete,
    gainXp,
    createPet,
    changePet,
    renamePet,
    equipRoomBg,
    toggleRoomDeco,
    ownedPetIds,
    setNeedsPetSelection,
    refetch: fetchPet,
  };
}