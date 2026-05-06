"use client";
// JuniePet — wrapper giữ backward compat, dùng PetSprite bên dưới
import PetSprite, { type PetSpriteState } from "./PetSprite";

export type JunieState = PetSpriteState;

interface JuniePetProps {
  state?: JunieState;
  size?: number;
  onClick?: () => void;
  className?: string;
}

export default function JuniePet({ state = "idle", size = 120, onClick, className = "" }: JuniePetProps) {
  return <PetSprite petId="junie" state={state} size={size} onClick={onClick} className={className} />;
}
