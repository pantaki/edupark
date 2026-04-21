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

const DEFAULT_PET_SPECIES = "cat";
const DEFAULT_PET_NAME = "Mochi";

export function usePet(childId: string | undefined) {
  const [pet, setPet] = useState<Pet | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelUpAnim, setLevelUpAnim] = useState(false);
  const prevLevel = useRef(1);

  type PetProgress = {
    xp: number;
    level: number;
    xp_to_next: number;
  };

  // ── Fetch pet (create if not exists) ──────────────────────────
  const fetchPet = useCallback(async () => {
    if (!childId) return;
    let { data: petData } = await supabase
      .from("pets").select("*").eq("child_id", childId).single();

    if (!petData) {
      // Create default pet
      const { data: newPet } = await supabase.from("pets").insert({
        child_id: childId,
        name: DEFAULT_PET_NAME,
        species: DEFAULT_PET_SPECIES,
        level: 1, xp: 0, xp_to_next: 100,
        happiness: 80, hunger: 80,
        state: "idle", coins: 50,
      }).select().single();
      petData = newPet;
    }

    if (petData) {
      // Apply time-based decay
      const updatedHappiness = computeHappinessDecay(petData);
      const updatedHunger    = computeHungerDecay(petData);
      const updatedState     = computePetState({ ...petData, happiness: updatedHappiness, hunger: updatedHunger });

      // Only update DB if values changed
      if (updatedHappiness !== petData.happiness || updatedHunger !== petData.hunger) {
        await supabase.from("pets").update({
          happiness: updatedHappiness,
          hunger: updatedHunger,
          state: updatedState,
        }).eq("id", petData.id);
        petData = { ...petData, happiness: updatedHappiness, hunger: updatedHunger, state: updatedState };
      }

      prevLevel.current = petData.level;
      setPet(petData);
    }
    setLoading(false);
  }, [childId]);

  // ── Fetch inventory ────────────────────────────────────────────
  const fetchInventory = useCallback(async () => {
    if (!childId) return;
    const { data } = await supabase
      .from("pet_inventory")
      .select("*, shop_items(*)")
      .eq("child_id", childId);

    if (data) {
      setInventory(data.map((row: {
        quantity: number; equipped: boolean;
        shop_items: ShopItem;
      }) => ({
        ...row.shop_items,
        quantity: row.quantity,
        equipped: row.equipped,
      })));
    }
  }, [childId]);

  useEffect(() => {
    fetchPet();
    fetchInventory();
  }, [fetchPet, fetchInventory]);

  // ── Realtime pet updates ───────────────────────────────────────
  useEffect(() => {
    if (!pet?.id) return;
    const ch = supabase.channel(`pet-${pet.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pets", filter: `id=eq.${pet.id}` },
        (payload) => {
          const updated = payload.new as Pet;
          // Check level up
          if (updated.level > prevLevel.current) {
            setLevelUpAnim(true);
            toast.success(`🎉 ${updated.name} lên cấp ${updated.level}! +${COIN_REWARDS.pet_levelup} xu!`);
            setTimeout(() => setLevelUpAnim(false), 3000);
            prevLevel.current = updated.level;
          }
          setPet(updated);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [pet?.id]);

  // ── Helper: update pet in DB + state ──────────────────────────
  async function updatePet(patch: Partial<Pet>) {
    if (!pet) return;
    const merged = { ...pet, ...patch };
    merged.state = computePetState(merged);
    await supabase.from("pets").update({ ...patch, state: merged.state, updated_at: new Date().toISOString() }).eq("id", pet.id);
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
    const effect = FOOD_EFFECTS[foodItemId];
    if (!effect) return false;

    // Check inventory
    const invItem = inventory.find(i => i.id === foodItemId);
    if (!invItem || invItem.quantity < 1) {
      toast.error("Không còn thức ăn này!");
      return false;
    }

    // Consume 1 from inventory
    const newQty = invItem.quantity - 1;
    if (newQty <= 0) {
      await supabase.from("pet_inventory").delete().eq("child_id", childId).eq("item_id", foodItemId);
    } else {
      await supabase.from("pet_inventory").update({ quantity: newQty }).eq("child_id", childId).eq("item_id", foodItemId);
    }

    // Apply effect
    const newHunger    = Math.min(100, pet.hunger + effect.hunger);
    const newHappiness = Math.min(100, pet.happiness + effect.happiness);
    await updatePet({
      hunger: newHunger,
      happiness: newHappiness,
      state: "eating",
      last_fed_at: new Date().toISOString(),
    });

    // XP + activity
    await gainXp(effect.xp);
    await supabase.from("pet_activities").insert({
      child_id: childId, activity: "fed",
      xp_gained: effect.xp, happiness_delta: effect.happiness,
    });

    // Refresh inventory
    fetchInventory();
    toast.success(`${pet.name} ăn ngon lắm! +${effect.happiness} vui 🍪`);

    // Reset to happy/idle after 2s
    setTimeout(() => updatePet({ state: computePetState({ ...pet, hunger: newHunger, happiness: newHappiness }) }), 2000);
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
      child_id: childId, activity: "petted", xp_gained: 0, happiness_delta: 8,
    });
    setTimeout(() => updatePet({ state: computePetState({ ...pet, happiness: newHappiness }) }), 2000);
  }

  // ── BUY ITEM ───────────────────────────────────────────────────
  async function buyItem(item: ShopItem): Promise<boolean> {
    if (!pet || !childId) return false;
    if (pet.coins < item.price) {
      toast.error(`Không đủ xu! Cần ${item.price} 🪙`);
      return false;
    }

    // Deduct coins
    const newCoins = pet.coins - item.price;
    await supabase.from("pets").update({ coins: newCoins }).eq("id", pet.id);
    setPet(p => p ? { ...p, coins: newCoins } : p);

    // Add to inventory (upsert — increment quantity if already owned)
    const { data: existing } = await supabase.from("pet_inventory")
      .select("quantity").eq("child_id", childId).eq("item_id", item.id).single();

    if (existing) {
      await supabase.from("pet_inventory")
        .update({ quantity: existing.quantity + 1 })
        .eq("child_id", childId).eq("item_id", item.id);
    } else {
      await supabase.from("pet_inventory").insert({ child_id: childId, item_id: item.id, quantity: 1 });
    }

    // Log
    await supabase.from("coin_ledger").insert({ child_id: childId, delta: -item.price, reason: "item_buy" });

    fetchInventory();
    toast.success(`Đã mua ${item.name}! 🛒`);
    return true;
  }

  // ── EQUIP ITEM ─────────────────────────────────────────────────
  async function equipItem(item: InventoryItem) {
    if (!pet || !childId) return;
    const field: Record<string, keyof Pet> = {
      hat:        "hat_item",
      background: "bg_item",
      accessory:  "accessory",
      skin:       "color_skin",
    };
    const col = field[item.category];
    if (!col) return;

    const isCurrentlyEquipped = pet[col] === item.id;
    const newVal = isCurrentlyEquipped ? null : item.id;

    await supabase.from("pets").update({ [col]: newVal }).eq("id", pet.id);
    setPet(p => p ? { ...p, [col]: newVal } : p);
    toast.success(isCurrentlyEquipped ? `Đã tháo ${item.name}` : `Đã trang bị ${item.name}! ✨`);
  }

  // ── EARN COINS (called after lesson/quiz complete) ─────────────
  async function earnCoins(amount: number, reason: string) {
    if (!pet || !childId) return;
    const newCoins = pet.coins + amount;
    await supabase.from("pets").update({ coins: newCoins }).eq("id", pet.id);
    setPet(p => p ? { ...p, coins: newCoins } : p);
    await supabase.from("coin_ledger").insert({ child_id: childId, delta: amount, reason });
  }

  // ── EARN XP FROM STUDY ─────────────────────────────────────────
  async function onLessonComplete(isPerfect: boolean) {
    if (!childId) return;
    const xp = isPerfect ? PET_XP_REWARDS.perfect_score : PET_XP_REWARDS.lesson_complete;
    const coins = isPerfect ? COIN_REWARDS.perfect_score : COIN_REWARDS.lesson_complete;
    await gainXp(xp);
    await earnCoins(coins, isPerfect ? "perfect_score" : "lesson_complete");
    await supabase.from("pet_activities").insert({ child_id: childId, activity: "lesson_done", xp_gained: xp });
  }

  return {
    pet, inventory, loading, levelUpAnim,
    feedPet, touchPet, buyItem, equipItem,
    earnCoins, onLessonComplete, gainXp,
    refetch: fetchPet,
  };
}