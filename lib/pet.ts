// lib/pet.ts  — Pet System core types + helpers

export type PetSpecies = 'cat'|'dog'|'dragon'|'bunny'|'fox'|'bear'|'dino'|'unicorn';
export type PetState   = 'idle'|'happy'|'sad'|'excited'|'sleep'|'eating'|'studying';
export type ItemCategory = 'hat'|'background'|'accessory'|'food'|'skin';
export type Rarity = 'common'|'rare'|'epic'|'legendary';

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

export type PetProgress = {
  xp: number;
  level: number;
  xp_to_next: number;
};

// ── Species config ─────────────────────────────────────────────
export const SPECIES_CONFIG: Record<PetSpecies, {
  label: string;
  frames: Record<PetState, string[]>;
  colors: Record<string, string>; // skin name → hex bg
  unlockLevel: number;
}> = {
  cat: {
    label: 'Mèo con',
    unlockLevel: 1,
    colors: { default: '#f5d6c8', gray: '#b0b0b0', orange: '#f4a261', black: '#333' },
    frames: {
      idle:     ['🐱', '🐱'],
      happy:    ['😸', '😻', '😸'],
      sad:      ['🙀', '😿'],
      excited:  ['😸', '🐱', '😸', '🐱'],
      sleep:    ['😴'],
      eating:   ['😋', '🐱'],
      studying: ['🐱', '📚'],
    },
  },
  dog: {
    label: 'Cún con',
    unlockLevel: 1,
    colors: { default: '#e8c99a', golden: '#d4a04a', white: '#f0ede8', brown: '#8b5e3c' },
    frames: {
      idle:     ['🐶', '🐶'],
      happy:    ['😀', '🐶', '😀'],
      sad:      ['🐶', '😢'],
      excited:  ['🐕', '🐶', '🐕', '🐶'],
      sleep:    ['😴'],
      eating:   ['😋', '🐶'],
      studying: ['🐶', '📖'],
    },
  },
  dragon: {
    label: 'Rồng nhỏ',
    unlockLevel: 5,
    colors: { default: '#4ade80', fire: '#ef4444', ice: '#93c5fd', gold: '#fbbf24' },
    frames: {
      idle:     ['🐲', '🐉'],
      happy:    ['🐉', '✨', '🐉'],
      sad:      ['🐲', '💧'],
      excited:  ['🐉', '🔥', '🐉', '✨'],
      sleep:    ['🐲', '💤'],
      eating:   ['🐉', '🍖'],
      studying: ['🐲', '📚'],
    },
  },
  bunny: {
    label: 'Thỏ bông',
    unlockLevel: 1,
    colors: { default: '#fce4ec', gray: '#ccc', brown: '#a0826d', white: '#fff' },
    frames: {
      idle:     ['🐰', '🐰'],
      happy:    ['🐰', '💕', '🐰'],
      sad:      ['🐰', '😢'],
      excited:  ['🐰', '🐇', '🐰', '🐇'],
      sleep:    ['🐰', '💤'],
      eating:   ['🐰', '🥕'],
      studying: ['🐰', '📖'],
    },
  },
  fox: {
    label: 'Cáo tinh ranh',
    unlockLevel: 3,
    colors: { default: '#fb923c', red: '#ef4444', white: '#f5f5f5', dark: '#78350f' },
    frames: {
      idle:     ['🦊', '🦊'],
      happy:    ['🦊', '✨', '🦊'],
      sad:      ['🦊', '😢'],
      excited:  ['🦊', '⚡', '🦊'],
      sleep:    ['🦊', '💤'],
      eating:   ['🦊', '🍖'],
      studying: ['🦊', '📚'],
    },
  },
  bear: {
    label: 'Gấu dễ thương',
    unlockLevel: 2,
    colors: { default: '#a16207', brown: '#92400e', white: '#f5f5f4', panda: '#1c1917' },
    frames: {
      idle:     ['🐻', '🐻'],
      happy:    ['🐻', '🍯', '🐻'],
      sad:      ['🐻', '😢'],
      excited:  ['🐻', '⚡', '🐻'],
      sleep:    ['🐻', '💤'],
      eating:   ['🐻', '🍯'],
      studying: ['🐻', '📖'],
    },
  },
  dino: {
    label: 'Khủng long nhỏ',
    unlockLevel: 8,
    colors: { default: '#16a34a', blue: '#2563eb', red: '#dc2626', purple: '#9333ea' },
    frames: {
      idle:     ['🦕', '🦕'],
      happy:    ['🦕', '✨', '🦕'],
      sad:      ['🦕', '💧'],
      excited:  ['🦕', '⚡', '🦕', '🌟'],
      sleep:    ['🦕', '💤'],
      eating:   ['🦕', '🌿'],
      studying: ['🦕', '📚'],
    },
  },
  unicorn: {
    label: 'Kỳ lân huyền bí',
    unlockLevel: 10,
    colors: { default: '#ec4899', rainbow: 'rainbow', gold: '#fbbf24', purple: '#9333ea' },
    frames: {
      idle:     ['🦄', '🦄'],
      happy:    ['🦄', '🌈', '✨', '🦄'],
      sad:      ['🦄', '💧'],
      excited:  ['🦄', '✨', '🌈', '🦄', '⭐'],
      sleep:    ['🦄', '💤'],
      eating:   ['🦄', '🍭'],
      studying: ['🦄', '📚', '✨'],
    },
  },
};

// ── State machine logic ─────────────────────────────────────────
export function computePetState(pet: Pet): PetState {
  const now = Date.now();
  const lastFedMs = now - new Date(pet.last_fed_at).getTime();
  const hoursSinceFed = lastFedMs / 3600000;

  if (hoursSinceFed > 8)  return 'sleep';
  if (pet.hunger < 20)    return 'sad';
  if (pet.happiness >= 90) return 'excited';
  if (pet.happiness >= 70) return 'happy';
  if (pet.happiness < 30) return 'sad';
  return 'idle';
}

// ── XP / Level ─────────────────────────────────────────────────
export function xpForNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.4, level - 1));
}

export function addXpToPet(pet: Pet, xpGain: number): PetProgress {
  let { xp, level, xp_to_next } = pet;
  xp += xpGain;
  while (xp >= xp_to_next) {
    xp -= xp_to_next;
    level += 1;
    xp_to_next = xpForNextLevel(level);
  }
  return { xp, level, xp_to_next };
}

// ── Happiness decay (call on page load) ────────────────────────
export function computeHappinessDecay(pet: Pet): number {
  const hours = (Date.now() - new Date(pet.last_pet_at).getTime()) / 3600000;
  return Math.max(0, pet.happiness - Math.floor(hours * 2)); // -2/hour
}

export function computeHungerDecay(pet: Pet): number {
  const hours = (Date.now() - new Date(pet.last_fed_at).getTime()) / 3600000;
  return Math.max(0, pet.hunger - Math.floor(hours * 5)); // -5/hour
}

// ── Coin rewards ────────────────────────────────────────────────
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

// ── XP rewards from activities ──────────────────────────────────
export const PET_XP_REWARDS = {
  lesson_complete: 15,
  quiz_win: 25,
  perfect_score: 40,
  correct_answer: 2,
} as const;

// ── Rarity colors ───────────────────────────────────────────────
export const RARITY_COLOR: Record<Rarity, string> = {
  common:    'from-slate-400 to-slate-500',
  rare:      'from-blue-500 to-indigo-600',
  epic:      'from-purple-500 to-pink-600',
  legendary: 'from-yellow-400 to-orange-500',
};
export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Thường', rare: 'Hiếm', epic: 'Sử thi', legendary: 'Huyền thoại',
};

// ── Food effects ────────────────────────────────────────────────
export const FOOD_EFFECTS: Record<string, { hunger: number; happiness: number; xp: number }> = {
  food_cookie:  { hunger: 15, happiness: 5,  xp: 5  },
  food_cake:    { hunger: 30, happiness: 20, xp: 15 },
  food_apple:   { hunger: 10, happiness: 3,  xp: 3  },
  food_fish:    { hunger: 20, happiness: 10, xp: 8  },
  food_honey:   { hunger: 25, happiness: 15, xp: 12 },
  food_rainbow: { hunger: 40, happiness: 30, xp: 25 },
};

// ── State messages ──────────────────────────────────────────────
export const STATE_MESSAGES: Record<PetState, string[]> = {
  idle:     ['Tôi đang chờ bạn đấy! 👋', 'Học bài chưa nhỉ? 📚', 'Hôm nay học gì vậy? 🤔'],
  happy:    ['Hạnh phúc quá đi! 😊', 'Tôi yêu bạn lắm! 💕', 'Mình chơi cùng nhau nhé! 🎮'],
  sad:      ['Bạn ơi... tôi đói bụng rồi 😢', 'Lâu rồi không gặp bạn... 🥺', 'Cho tôi ăn với nhé 🍪'],
  excited:  ['YEAHHH! Tuyệt vời quá! 🎉', 'Bạn giỏi lắm! Tôi tự hào về bạn! ⭐', 'WOW! Siêu đỉnh luôn! 🚀'],
  sleep:    ['Zzz... đang ngủ đây... 💤', 'Shhh... đừng làm phiền... 😴', 'Buồn ngủ quá hà... 💤'],
  eating:   ['Ngon quá! Cảm ơn bạn! 😋', 'Ăn hết rồi! Còn không? 🍪', 'Tuyệt vời! Bữa ăn ngon nhất! 🌟'],
  studying: ['Học cùng bạn vui lắm! 📖', 'Cố lên! Chúng mình học giỏi! 💪', 'Câu này khó nhỉ? 🤔'],
};

export function getRandomMessage(state: PetState): string {
  const msgs = STATE_MESSAGES[state];
  return msgs[Math.floor(Math.random() * msgs.length)];
}