// lib/pet.ts — Pet System với PNG mascot EduPark

export type PetSpecies =
  | "cat"
  | "dog"
  | "dragon"
  | "bunny"
  | "fox"
  | "bear"
  | "dino"
  | "unicorn";
export type PetState =
  | "idle"
  | "happy"
  | "sad"
  | "excited"
  | "sleep"
  | "eating"
  | "studying"
  | "thinking"
  | "cheer";
export type ItemCategory = "hat" | "background" | "accessory" | "food" | "skin";
export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface Pet {
  id: string;
  child_id: string;
  name: string;
  species: PetSpecies;
  level: number;
  xp: number;
  xp_to_next: number;
  happiness: number;
  hunger: number;
  state: PetState;
  color_skin: string;
  hat_item: string | null;
  bg_item: string | null;
  accessory: string | null;
  coins: number;
  last_fed_at: string;
  last_pet_at: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  emoji: string;
  price: number;
  rarity: Rarity;
  effect: string;
}
export interface InventoryItem extends ShopItem {
  quantity: number;
  equipped: boolean;
}
export type PetProgress = { xp: number; level: number; xp_to_next: number };

// ── PNG mascot config ─────────────────────────────────────────
// Đặt files vào /public/pets/cat/idle.png, happy.png, ...
// Tên file map 1:1 với PetState

export const PET_IMAGE_STATES: PetState[] = [
  "idle",
  "happy",
  "excited",
  "thinking",
  "sad",
  "sleep",
  "eating",
  "cheer",
];

// Map state → tên file PNG (trong /public/pets/{species}/)
export const STATE_TO_IMAGE: Record<PetState, string> = {
  idle: "idle",
  happy: "happy",
  excited: "excited",
  thinking: "thinking",
  sad: "sad",
  sleep: "sleepy", // file: sleepy.png
  eating: "eating",
  studying: "thinking", // dùng chung thinking khi học
  cheer: "cheer",
};

// Fallback emoji khi chưa có PNG (sẽ tự ẩn khi có ảnh)
export const STATE_EMOJI_FALLBACK: Record<PetState, string> = {
  idle: "🐱",
  happy: "😸",
  excited: "🤩",
  thinking: "🤔",
  sad: "😿",
  sleep: "😴",
  eating: "😋",
  studying: "📚",
  cheer: "🎉",
};

// ── Species config ────────────────────────────────────────────
export const SPECIES_CONFIG: Record<
  PetSpecies,
  {
    label: string;
    unlockLevel: number;
    hasCustomImages: boolean; // true = có PNG trong /public/pets/
    colors: Record<string, string>;
    frames: Record<PetState, string[]>; // giữ lại để fallback
  }
> = {
  cat: {
    label: "Mèo EduPark",
    unlockLevel: 1,
    hasCustomImages: true, // ← có PNG từ designer
    colors: {
      default: "#f5d6c8",
      gray: "#b0b0b0",
      orange: "#f4a261",
      black: "#333",
    },
    frames: {
      idle: ["🐱"],
      happy: ["😸"],
      sad: ["😿"],
      excited: ["🤩"],
      sleep: ["😴"],
      eating: ["😋"],
      studying: ["🤔"],
      thinking: ["🤔"],
      cheer: ["🎉"],
    },
  },
  dog: {
    label: "Chó con",
    unlockLevel: 1,
    hasCustomImages: false,
    colors: { default: "#e8c99a" },
    frames: {
      idle: ["🐶"],
      happy: ["🐶"],
      sad: ["🐶"],
      excited: ["🐕"],
      sleep: ["😴"],
      eating: ["😋"],
      studying: ["🐶"],
      thinking: ["🐶"],
      cheer: ["🐶"],
    },
  },
  bear: {
    label: "Gấu dễ thương",
    unlockLevel: 2,
    hasCustomImages: false,
    colors: { default: "#a16207" },
    frames: {
      idle: ["🐻"],
      happy: ["🐻"],
      sad: ["🐻"],
      excited: ["🐻"],
      sleep: ["😴"],
      eating: ["🐻"],
      studying: ["🐻"],
      thinking: ["🐻"],
      cheer: ["🐻"],
    },
  },
  bunny: {
    label: "Thỏ bông",
    unlockLevel: 1,
    hasCustomImages: false,
    colors: { default: "#fce4ec" },
    frames: {
      idle: ["🐰"],
      happy: ["🐰"],
      sad: ["🐰"],
      excited: ["🐇"],
      sleep: ["😴"],
      eating: ["🐰"],
      studying: ["🐰"],
      thinking: ["🐰"],
      cheer: ["🐰"],
    },
  },
  fox: {
    label: "Cáo tinh ranh",
    unlockLevel: 3,
    hasCustomImages: false,
    colors: { default: "#fb923c" },
    frames: {
      idle: ["🦊"],
      happy: ["🦊"],
      sad: ["🦊"],
      excited: ["🦊"],
      sleep: ["😴"],
      eating: ["🦊"],
      studying: ["🦊"],
      thinking: ["🦊"],
      cheer: ["🦊"],
    },
  },
  dragon: {
    label: "Rồng nhỏ",
    unlockLevel: 5,
    hasCustomImages: false,
    colors: { default: "#4ade80" },
    frames: {
      idle: ["🐲"],
      happy: ["🐉"],
      sad: ["🐲"],
      excited: ["🐉"],
      sleep: ["😴"],
      eating: ["🐉"],
      studying: ["🐲"],
      thinking: ["🐲"],
      cheer: ["🐉"],
    },
  },
  dino: {
    label: "Khủng long nhỏ",
    unlockLevel: 8,
    hasCustomImages: false,
    colors: { default: "#16a34a" },
    frames: {
      idle: ["🦕"],
      happy: ["🦕"],
      sad: ["🦕"],
      excited: ["🦕"],
      sleep: ["😴"],
      eating: ["🦕"],
      studying: ["🦕"],
      thinking: ["🦕"],
      cheer: ["🦕"],
    },
  },
  unicorn: {
    label: "Kỳ lân huyền bí",
    unlockLevel: 10,
    hasCustomImages: false,
    colors: { default: "#ec4899" },
    frames: {
      idle: ["🦄"],
      happy: ["🦄"],
      sad: ["🦄"],
      excited: ["🦄"],
      sleep: ["😴"],
      eating: ["🦄"],
      studying: ["🦄"],
      thinking: ["🦄"],
      cheer: ["🦄"],
    },
  },
};

// ── CSS animation per state ────────────────────────────────────
export const STATE_ANIMATION: Record<PetState, string> = {
  idle: "animate-pet-breathe", // nhẹ nhàng phồng xẹp
  happy: "animate-pet-bounce", // nảy lên nhẹ
  excited: "animate-pet-shake", // rung lắc sung sướng
  thinking: "animate-pet-tilt", // nghiêng đầu
  sad: "animate-pet-droop", // rũ xuống
  sleep: "animate-pet-sway", // lắc nhẹ
  eating: "animate-pet-nom", // lên xuống nhanh
  studying: "animate-pet-tilt",
  cheer: "animate-pet-jump", // nhảy cao
};

// ── Background themes ──────────────────────────────────────────
export const BG_THEMES: Record<
  string,
  { bg: string; deco: string; particles?: string[] }
> = {
  default: {
    bg: "from-violet-100 via-purple-50 to-blue-50",
    deco: "⭐",
    particles: ["✨", "💫"],
  },
  bg_garden: {
    bg: "from-pink-100 to-green-50",
    deco: "🌸",
    particles: ["🌺", "🍀"],
  },
  bg_space: {
    bg: "from-indigo-950 to-purple-950",
    deco: "🌟",
    particles: ["✦", "✧", "⭐"],
  },
  bg_beach: {
    bg: "from-yellow-100 to-cyan-100",
    deco: "🌊",
    particles: ["🐚", "☀️"],
  },
  bg_castle: {
    bg: "from-stone-200 to-amber-100",
    deco: "🏰",
    particles: ["🌟", "⚔️"],
  },
  bg_forest: {
    bg: "from-green-100 to-emerald-50",
    deco: "🌲",
    particles: ["🍃", "🦋"],
  },
  bg_rainbow: {
    bg: "from-pink-100 via-yellow-100 to-purple-100",
    deco: "🌈",
    particles: ["💫", "🌟"],
  },
  bg_snow: {
    bg: "from-slate-100 to-blue-50",
    deco: "❄️",
    particles: ["❄️", "⛄"],
  },
};

// ── Accessory overlays ─────────────────────────────────────────
export const ACC_OVERLAY: Record<string, string> = {
  acc_glasses: "🤓",
  acc_bow: "🎀",
  acc_scarf: "🧣",
  acc_medal: "🥇",
};

// ── State machine ─────────────────────────────────────────────
export function computePetState(pet: Pet): PetState {
  const hoursSinceFed =
    (Date.now() - new Date(pet.last_fed_at).getTime()) / 3600000;
  if (hoursSinceFed > 8) return "sleep";
  if (pet.hunger < 20) return "sad";
  if (pet.happiness >= 90) return "excited";
  if (pet.happiness >= 70) return "happy";
  if (pet.happiness < 30) return "sad";
  return "idle";
}

export function xpForNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.4, level - 1));
}

export function addXpToPet(pet: Pet, xpGain: number): PetProgress {
  let { xp, level, xp_to_next } = pet;
  xp += xpGain;
  while (xp >= xp_to_next) {
    xp -= xp_to_next;
    level++;
    xp_to_next = xpForNextLevel(level);
  }
  return { xp, level, xp_to_next };
}

export function computeHappinessDecay(pet: Pet): number {
  const hours = (Date.now() - new Date(pet.last_pet_at).getTime()) / 3600000;
  return Math.max(0, pet.happiness - Math.floor(hours * 2));
}
export function computeHungerDecay(pet: Pet): number {
  const hours = (Date.now() - new Date(pet.last_fed_at).getTime()) / 3600000;
  return Math.max(0, pet.hunger - Math.floor(hours * 5));
}

export const COIN_REWARDS = {
  lesson_complete: 20,
  quiz_win: 30,
  perfect_score: 50,
  streak_3: 15,
  streak_7: 40,
  daily_login: 10,
  feed_pet: 0,
  pet_levelup: 25,
} as const;

export const PET_XP_REWARDS = {
  lesson_complete: 15,
  quiz_win: 25,
  perfect_score: 40,
  correct_answer: 2,
} as const;

export const RARITY_COLOR: Record<Rarity, string> = {
  common: "from-slate-400 to-slate-500",
  rare: "from-blue-500 to-indigo-600",
  epic: "from-purple-500 to-pink-600",
  legendary: "from-yellow-400 to-orange-500",
};
export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Thường",
  rare: "Hiếm",
  epic: "Sử thi",
  legendary: "Huyền thoại",
};

export const FOOD_EFFECTS: Record<
  string,
  { hunger: number; happiness: number; xp: number }
> = {
  food_cookie: { hunger: 15, happiness: 5, xp: 5 },
  food_cake: { hunger: 30, happiness: 20, xp: 15 },
  food_apple: { hunger: 10, happiness: 3, xp: 3 },
  food_fish: { hunger: 20, happiness: 10, xp: 8 },
  food_honey: { hunger: 25, happiness: 15, xp: 12 },
  food_rainbow: { hunger: 40, happiness: 30, xp: 25 },
};

export const STATE_MESSAGES: Record<PetState, string[]> = {
  idle: [
    "Tôi đang chờ bạn đấy! 👋",
    "Học bài chưa nhỉ? 📚",
    "Hôm nay học gì vậy? 🤔",
  ],
  happy: [
    "Hạnh phúc quá đi! 😊",
    "Tôi yêu bạn lắm! 💕",
    "Mình chơi cùng nhau nhé! 🎮",
  ],
  sad: [
    "Bạn ơi... tôi đói bụng rồi 😢",
    "Lâu rồi không gặp bạn... 🥺",
    "Cho tôi ăn với nhé 🍪",
  ],
  excited: [
    "YEAHHH! Tuyệt vời quá! 🎉",
    "Bạn giỏi lắm! Tôi tự hào về bạn! ⭐",
    "WOW! Siêu đỉnh luôn! 🚀",
  ],
  sleep: ["Zzz... đang ngủ đây... 💤", "Shhh... đừng làm phiền... 😴"],
  eating: ["Ngon quá! Cảm ơn bạn! 😋", "Ăn hết rồi! Còn không? 🍪"],
  studying: ["Học cùng bạn vui lắm! 📖", "Cố lên! Chúng mình học giỏi! 💪"],
  thinking: ["Hmm... để mình nghĩ xem... 🤔", "Câu này khó nhỉ? 💭"],
  cheer: [
    "YEAH! Bạn làm được rồi! 🎉",
    "Tuyệt vời! Tôi tự hào về bạn! 🏆",
    "Hooray! Giỏi lắm! ⭐",
  ],
};

export function getRandomMessage(state: PetState): string {
  const msgs = STATE_MESSAGES[state];
  return msgs[Math.floor(Math.random() * msgs.length)];
}
