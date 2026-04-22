"use client";
// components/pet/PetAvatar.tsx
// Hỗ trợ PNG mascot EduPark + fallback emoji + animations

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Pet, PetState, PetSpecies } from "@/lib/pet";
import {
  SPECIES_CONFIG,
  BG_THEMES,
  ACC_OVERLAY,
  STATE_TO_IMAGE,
  STATE_ANIMATION,
  STATE_EMOJI_FALLBACK,
  getRandomMessage,
} from "@/lib/pet";

interface PetAvatarProps {
  pet: Pet;
  size?: "sm" | "md" | "lg" | "xl";
  showMessage?: boolean;
  onClick?: () => void;
  className?: string;
}

const SIZE_MAP = {
  sm: { outer: 72, img: 56, bubble: "text-xs", zzz: "text-xs" },
  md: { outer: 110, img: 88, bubble: "text-sm", zzz: "text-sm" },
  lg: { outer: 150, img: 120, bubble: "text-sm", zzz: "text-base" },
  xl: { outer: 220, img: 180, bubble: "text-base", zzz: "text-lg" },
};

// Particles per state
const STATE_PARTICLES: Partial<Record<PetState, { emoji: string; count: number }>> = {
  excited: { emoji: "✨", count: 4 },
  happy:   { emoji: "💕", count: 3 },
  cheer:   { emoji: "🎉", count: 5 },
  eating:  { emoji: "🍪", count: 2 },
};

interface Particle {
  id: number;
  emoji: string;
  x: number;
  delay: number;
}

export default function PetAvatar({
  pet,
  size = "md",
  showMessage = false,
  onClick,
  className = "",
}: PetAvatarProps) {
  const cfg = SPECIES_CONFIG[pet.species as PetSpecies];
  const sz = SIZE_MAP[size];
  const bgTheme = BG_THEMES[pet.bg_item || "default"] || BG_THEMES.default;

  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [message, setMessage] = useState(getRandomMessage(pet.state));
  const [showBubble, setShowBubble] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isClicked, setIsClicked] = useState(false);
  const particleId = useRef(0);
  const prevState = useRef(pet.state);

  // PNG path
  const imgFile = STATE_TO_IMAGE[pet.state] || "idle";
  const imgSrc = `/pets/${pet.species}/${imgFile}.png`;
  const usePng = cfg?.hasCustomImages && !imgError;

  // Khi state thay đổi → reset imgError để thử lại ảnh mới
  useEffect(() => {
    if (prevState.current !== pet.state) {
      setImgError(false);
      setImgLoaded(false);
      prevState.current = pet.state;
    }
  }, [pet.state]);

  // Message bubble timer
  useEffect(() => {
    if (!showMessage) return;
    const show = () => {
      setMessage(getRandomMessage(pet.state));
      setShowBubble(true);
      setTimeout(() => setShowBubble(false), 3500);
    };
    show();
    const id = setInterval(show, 9000);
    return () => clearInterval(id);
  }, [pet.state, showMessage]);

  // Spawn particles when state = excited/happy/cheer
  useEffect(() => {
    const cfg = STATE_PARTICLES[pet.state];
    if (!cfg) {
      setParticles([]);
      return;
    }
    const newP: Particle[] = Array.from({ length: cfg.count }, (_, i) => ({
      id: particleId.current++,
      emoji: cfg.emoji,
      x: (Math.random() - 0.5) * (sz.outer * 0.8),
      delay: i * 200,
    }));
    setParticles(newP);
  }, [pet.state]);

  function handleClick() {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);

    // Spawn hearts
    const hearts: Particle[] = Array.from({ length: 3 }, (_, i) => ({
      id: particleId.current++,
      emoji: "💕",
      x: (Math.random() - 0.5) * 60,
      delay: i * 100,
    }));
    setParticles((prev) => [...prev, ...hearts]);
    setTimeout(() => {
      setParticles((prev) =>
        prev.filter((p) => !hearts.find((h) => h.id === p.id)),
      );
    }, 1200);

    onClick?.();
  }

  const animClass = STATE_ANIMATION[pet.state] || "animate-pet-breathe";
  const isSpaceBg = pet.bg_item === "bg_space";

  return (
    <div
      className={`relative flex flex-col items-center ${className}`}
      style={{ width: sz.outer }}
    >
      {/* Speech bubble */}
      {showBubble && (
        <div
          className={`absolute z-30 bg-white rounded-2xl px-3 py-2 shadow-xl border-2 border-purple-100
          ${sz.bubble} font-bold text-slate-700 whitespace-nowrap text-center
          animate-bubble-pop`}
          style={{
            bottom: sz.outer + 8,
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: 200,
            whiteSpace: "normal",
          }}
        >
          {message}
          {/* Tail */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0
            border-l-[8px] border-r-[8px] border-t-[8px]
            border-l-transparent border-r-transparent border-t-white"
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-3 w-0 h-0
            border-l-[9px] border-r-[9px] border-t-[9px]
            border-l-transparent border-r-transparent border-t-purple-100"
          />
        </div>
      )}

      {/* Floating particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute pointer-events-none z-20 text-xl animate-float-up"
          style={{
            left: `calc(50% + ${p.x}px)`,
            bottom: sz.outer * 0.7,
            animationDelay: `${p.delay}ms`,
          }}
        >
          {p.emoji}
        </span>
      ))}

      {/* Main pet stage */}
      <button
        onClick={handleClick}
        className={`relative rounded-3xl bg-gradient-to-br ${bgTheme.bg}
          flex items-center justify-center overflow-hidden
          cursor-pointer select-none border-2 border-white/60
          shadow-xl shadow-purple-200/40
          transition-transform duration-150
          ${isClicked ? "scale-90" : "scale-100"}
          ${animClass}`}
        style={{ width: sz.outer, height: sz.outer }}
        aria-label={`${pet.name} - ${pet.state}`}
      >
        {/* Background particles */}
        {isSpaceBg && (
          <>
            <span className="absolute top-2 left-3 text-xs opacity-50 animate-twinkle">
              ✦
            </span>
            <span
              className="absolute top-4 right-4 text-xs opacity-40 animate-twinkle"
              style={{ animationDelay: "0.5s" }}
            >
              ✧
            </span>
            <span
              className="absolute bottom-3 left-5 text-xs opacity-30 animate-twinkle"
              style={{ animationDelay: "1s" }}
            >
              ⭐
            </span>
          </>
        )}
        {!isSpaceBg &&
          bgTheme.particles?.slice(0, 2).map((p, i) => (
            <span
              key={i}
              className="absolute opacity-20 text-base pointer-events-none"
              style={{ bottom: 4 + i * 16, right: 6 + i * 12 }}
            >
              {p}
            </span>
          ))}

        {/* Hat */}
        {pet.hat_item && (
          <span
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 pointer-events-none select-none"
            style={{ fontSize: sz.outer * 0.12 }}
          >
            {pet.hat_item === "hat_crown"
              ? "👑"
              : pet.hat_item === "hat_cap"
                ? "🎓"
                : pet.hat_item === "hat_tophat"
                  ? "🎩"
                  : pet.hat_item === "hat_party"
                    ? "🎉"
                    : pet.hat_item === "hat_star"
                      ? "⭐"
                      : pet.hat_item === "hat_rainbow"
                        ? "🌈"
                        : ""}
          </span>
        )}

        {/* ── PNG image (primary) ── */}
        {usePng && (
          <div
            className="relative z-10"
            style={{ width: sz.img, height: sz.img }}
          >
            {/* Skeleton loader */}
            {!imgLoaded && (
              <div className="absolute inset-0 rounded-2xl bg-white/40 animate-pulse flex items-center justify-center">
                <span style={{ fontSize: sz.img * 0.4 }}>
                  {STATE_EMOJI_FALLBACK[pet.state]}
                </span>
              </div>
            )}
            <Image
              src={imgSrc}
              alt={`${pet.name} ${pet.state}`}
              width={sz.img}
              height={sz.img}
              className={`object-contain transition-opacity duration-300 drop-shadow-lg
                ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              priority={size === "xl"}
              draggable={false}
            />
          </div>
        )}

        {/* ── Emoji fallback ── */}
        {!usePng && (
          <span
            className="z-10 pointer-events-none select-none"
            style={{ fontSize: sz.img * 0.55 }}
          >
            {STATE_EMOJI_FALLBACK[pet.state]}
          </span>
        )}

        {/* Accessory overlay */}
        {pet.accessory && ACC_OVERLAY[pet.accessory] && (
          <span
            className="absolute bottom-1 right-1 z-10 pointer-events-none select-none"
            style={{ fontSize: sz.outer * 0.14 }}
          >
            {ACC_OVERLAY[pet.accessory]}
          </span>
        )}

        {/* Sleeping ZZZs */}
        {pet.state === "sleep" && (
          <div className="absolute top-1 right-2 flex flex-col items-end pointer-events-none z-20">
            <span
              className={`${sz.zzz} text-blue-300 animate-zzz font-black`}
              style={{ animationDelay: "0s" }}
            >
              z
            </span>
            <span
              className={`text-blue-400 animate-zzz font-black`}
              style={{
                fontSize: parseInt(sz.zzz) * 1.3,
                animationDelay: "0.4s",
              }}
            >
              Z
            </span>
            <span
              className={`text-blue-500 animate-zzz font-black`}
              style={{
                fontSize: parseInt(sz.zzz) * 1.6,
                animationDelay: "0.8s",
              }}
            >
              Z
            </span>
          </div>
        )}

        {/* Excited sparkles */}
        {pet.state === "excited" && (
          <>
            <span className="absolute top-2 left-2 text-sm animate-ping pointer-events-none z-20">
              ✨
            </span>
            <span
              className="absolute bottom-3 right-2 text-sm pointer-events-none z-20 animate-ping"
              style={{ animationDelay: "0.4s" }}
            >
              ⭐
            </span>
          </>
        )}

        {/* Cheer confetti */}
        {pet.state === "cheer" && (
          <>
            <span className="absolute top-1 left-2 animate-bounce pointer-events-none z-20">
              🎊
            </span>
            <span
              className="absolute top-1 right-2 animate-bounce pointer-events-none z-20"
              style={{ animationDelay: "0.2s" }}
            >
              🎉
            </span>
          </>
        )}

        {/* Tap ripple */}
        {isClicked && (
          <span className="absolute inset-0 rounded-3xl bg-white/30 animate-ping pointer-events-none z-30" />
        )}
      </button>

      {/* Tap hint (chỉ hiện xl) */}
      {size === "xl" && (
        <p className="text-slate-400 text-xs font-bold mt-2 animate-pulse select-none">
          Chạm vào {pet.name} 💕
        </p>
      )}
    </div>
  );
}
