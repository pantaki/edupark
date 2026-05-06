"use client";
// Generic sprite component — dùng cho tất cả pet có spritesheet 1536x1872 (9 rows x 8 cols)

import { useEffect, useRef, useState } from "react";

export type PetSpriteState =
  | "idle"
  | "runRight"
  | "runLeft"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "running"
  | "review";

const FRAME_W = 192;
const FRAME_H = 208;

const STATES: Record<PetSpriteState, { row: number; frames: number; fps?: number }> = {
  idle:     { row: 0, frames: 6, fps: 8 },
  runRight: { row: 1, frames: 8, fps: 12 },
  runLeft:  { row: 2, frames: 8, fps: 12 },
  waving:   { row: 3, frames: 4, fps: 8 },
  jumping:  { row: 4, frames: 5, fps: 10 },
  failed:   { row: 5, frames: 8, fps: 8 },
  waiting:  { row: 6, frames: 6, fps: 6 },
  running:  { row: 7, frames: 6, fps: 12 },
  review:   { row: 8, frames: 6, fps: 8 },
};

interface PetSpriteProps {
  petId: string; // slug trong /public/pets/{petId}/spritesheet.webp
  state?: PetSpriteState;
  size?: number;
  onClick?: () => void;
  className?: string;
}

export default function PetSprite({
  petId,
  state = "idle",
  size = 120,
  onClick,
  className = "",
}: PetSpriteProps) {
  const cfg = STATES[state] ?? STATES.idle;
  const [frame, setFrame] = useState(0);
  const frameRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    frameRef.current = 0;
    setFrame(0);
    const fps = cfg.fps ?? 8;
    timerRef.current = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % cfg.frames;
      setFrame(frameRef.current);
    }, 1000 / fps);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state, cfg.frames, cfg.fps]);

  const scale = size / FRAME_W;
  const bgX = -(frame * FRAME_W * scale);
  const bgY = -(cfg.row * FRAME_H * scale);
  const bgW = 1536 * scale;
  const bgH = 1872 * scale;

  return (
    <div
      className={`inline-block select-none ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        width: size,
        height: FRAME_H * scale,
        backgroundImage: `url(/pets/${petId}/spritesheet.webp)`,
        backgroundSize: `${bgW}px ${bgH}px`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label={`${petId} pet`}
    />
  );
}
