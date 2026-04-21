"use client";
// components/pet/PetAvatar.tsx
// Animated pet with CSS keyframes, state-based expressions, accessories

import { useEffect, useRef, useState } from "react";
import type { Pet, PetState, PetSpecies } from "@/lib/pet";
import { SPECIES_CONFIG, getRandomMessage } from "@/lib/pet";

interface PetAvatarProps {
  pet: Pet;
  size?: "sm" | "md" | "lg" | "xl";
  showMessage?: boolean;
  onClick?: () => void;
  className?: string;
}

const SIZE_MAP = {
  sm:  { outer: 64,  emoji: "text-4xl",  bubble: "text-xs" },
  md:  { outer: 100, emoji: "text-6xl",  bubble: "text-sm" },
  lg:  { outer: 140, emoji: "text-8xl",  bubble: "text-sm" },
  xl:  { outer: 200, emoji: "text-9xl",  bubble: "text-base" },
};

// State → CSS animation mapping
const STATE_ANIM: Record<PetState, string> = {
  idle:     "pet-idle",
  happy:    "pet-happy",
  sad:      "pet-sad",
  excited:  "pet-excited",
  sleep:    "pet-sleep",
  eating:   "pet-eating",
  studying: "pet-idle",
};

// Background themes
const BG_THEMES: Record<string, { bg: string; deco: string }> = {
  default:   { bg: "from-sky-100 to-blue-50",       deco: "☁️" },
  bg_garden: { bg: "from-pink-100 to-green-50",     deco: "🌸" },
  bg_space:  { bg: "from-indigo-900 to-purple-950", deco: "⭐" },
  bg_beach:  { bg: "from-yellow-100 to-cyan-100",   deco: "🌊" },
  bg_castle: { bg: "from-stone-200 to-amber-100",   deco: "🏰" },
  bg_forest: { bg: "from-green-100 to-emerald-50",  deco: "🌲" },
  bg_rainbow:{ bg: "from-pink-100 via-yellow-100 to-purple-100", deco: "🌈" },
  bg_snow:   { bg: "from-slate-100 to-blue-50",     deco: "❄️" },
};

// Accessory overlays
const ACC_OVERLAY: Record<string, string> = {
  acc_glasses: "🤓",
  acc_bow:     "🎀",
  acc_scarf:   "🧣",
  acc_medal:   "🥇",
};

export default function PetAvatar({
  pet, size = "md", showMessage = false, onClick, className = "",
}: PetAvatarProps) {
  const cfg = SPECIES_CONFIG[pet.species as PetSpecies];
  const frames = cfg?.frames[pet.state] || ["🐱"];
  const [frameIdx, setFrameIdx] = useState(0);
  const [message, setMessage] = useState(getRandomMessage(pet.state));
  const [showBubble, setShowBubble] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([]);
  const heartId = useRef(0);
  const sz = SIZE_MAP[size];
  const bgTheme = BG_THEMES[pet.bg_item || "default"] || BG_THEMES.default;

  // Frame animation
  useEffect(() => {
    if (frames.length <= 1) return;
    const speed = pet.state === "excited" ? 300 : pet.state === "eating" ? 400 : 800;
    const timer = setInterval(() => {
      setFrameIdx(i => (i + 1) % frames.length);
    }, speed);
    return () => clearInterval(timer);
  }, [frames, pet.state]);

  // Random message bubble every 8s if showMessage
  useEffect(() => {
    if (!showMessage) return;
    const show = () => {
      setMessage(getRandomMessage(pet.state));
      setShowBubble(true);
      setTimeout(() => setShowBubble(false), 3500);
    };
    show();
    const id = setInterval(show, 8000);
    return () => clearInterval(id);
  }, [pet.state, showMessage]);

  function handleClick() {
    // Spawn hearts
    const newHearts = Array.from({ length: 3 }, (_, i) => ({
      id: heartId.current++,
      x: Math.random() * 60 - 30,
    }));
    setHearts(h => [...h, ...newHearts]);
    setTimeout(() => setHearts(h => h.filter(hh => !newHearts.find(n => n.id === hh.id))), 1200);
    onClick?.();
  }

  const isSpaceBg = pet.bg_item === "bg_space";

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {/* Speech bubble */}
      {showBubble && (
        <div className={`absolute -top-14 left-1/2 -translate-x-1/2 z-20
          bg-white rounded-2xl px-3 py-2 shadow-lg border border-slate-100
          ${sz.bubble} font-bold text-slate-700 whitespace-nowrap max-w-48 text-center
          animate-slide-up`}>
          {message}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0
            border-l-4 border-r-4 border-t-4 border-transparent border-t-white" />
        </div>
      )}

      {/* Pet stage */}
      <button
        onClick={handleClick}
        className={`relative rounded-3xl bg-gradient-to-br ${bgTheme.bg} flex items-center justify-center
          overflow-hidden cursor-pointer active:scale-95 transition-transform duration-150 select-none
          ${STATE_ANIM[pet.state]}`}
        style={{ width: sz.outer, height: sz.outer }}
        aria-label={`${pet.name} - ${pet.state}`}
      >
        {/* Background deco */}
        <span className="absolute bottom-1 right-2 opacity-30 text-lg pointer-events-none select-none">
          {bgTheme.deco}
        </span>
        {isSpaceBg && (
          <>
            <span className="absolute top-1 left-2 text-xs opacity-50">✦</span>
            <span className="absolute top-3 right-4 text-xs opacity-40">✧</span>
          </>
        )}

        {/* Hat */}
        {pet.hat_item && (
          <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-xl z-10 pointer-events-none select-none">
            {pet.hat_item === "hat_crown"   ? "👑" :
             pet.hat_item === "hat_cap"     ? "🎓" :
             pet.hat_item === "hat_tophat"  ? "🎩" :
             pet.hat_item === "hat_party"   ? "🎉" :
             pet.hat_item === "hat_star"    ? "⭐" :
             pet.hat_item === "hat_rainbow" ? "🌈" : ""}
          </span>
        )}

        {/* Main pet emoji */}
        <span
          className={`${sz.emoji} z-10 pointer-events-none select-none transition-all duration-200`}
          style={{ filter: pet.color_skin === "skin_gold" ? "sepia(1) saturate(3) hue-rotate(5deg)" :
                           pet.color_skin === "skin_rainbow" ? "hue-rotate(var(--hue,0deg))" : "none" }}
        >
          {frames[frameIdx]}
        </span>

        {/* Accessory */}
        {pet.accessory && ACC_OVERLAY[pet.accessory] && (
          <span className="absolute bottom-1 right-1 text-base z-10 pointer-events-none select-none">
            {ACC_OVERLAY[pet.accessory]}
          </span>
        )}

        {/* Sleeping ZZZs */}
        {pet.state === "sleep" && (
          <div className="absolute top-1 right-2 flex flex-col items-end pointer-events-none">
            <span className="text-xs text-blue-300 animate-float font-bold" style={{ animationDelay: "0s" }}>z</span>
            <span className="text-sm text-blue-400 animate-float font-bold" style={{ animationDelay: "0.3s" }}>Z</span>
            <span className="text-base text-blue-500 animate-float font-bold" style={{ animationDelay: "0.6s" }}>Z</span>
          </div>
        )}

        {/* Excited sparkles */}
        {pet.state === "excited" && (
          <>
            <span className="absolute top-1 left-1 text-sm animate-ping pointer-events-none">✨</span>
            <span className="absolute bottom-2 right-1 text-sm animate-ping pointer-events-none" style={{ animationDelay: "0.3s" }}>⭐</span>
          </>
        )}
      </button>

      {/* Floating hearts on click */}
      {hearts.map(h => (
        <span key={h.id}
          className="absolute text-xl pointer-events-none animate-float-heart"
          style={{ left: `calc(50% + ${h.x}px)`, bottom: "100%", zIndex: 30 }}>
          💕
        </span>
      ))}
    </div>
  );
}