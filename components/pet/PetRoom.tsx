"use client";
// PetRoom — phòng học pixel-art style với đồ trang trí có thể mua

import { useMemo } from "react";

// ── Room backgrounds ──────────────────────────────────────────
export interface RoomBackground {
  id: string;
  name: string;
  price: number;
  wallColor: string;
  floorColor: string;
  wallAccent?: string;
  ambientClass?: string; // extra glow / filter
}

export const ROOM_BACKGROUNDS: RoomBackground[] = [
  {
    id: "room_default",
    name: "Phòng học",
    price: 0,
    wallColor: "#e8e0f7",
    wallAccent: "#d4c8f0",
    floorColor: "#c8b89a",
  },
  {
    id: "room_night",
    name: "Phòng ban đêm",
    price: 250,
    wallColor: "#1e1b4b",
    wallAccent: "#312e81",
    floorColor: "#292524",
    ambientClass: "brightness-90",
  },
  {
    id: "room_garden",
    name: "Vườn cây",
    price: 150,
    wallColor: "#bbf7d0",
    wallAccent: "#86efac",
    floorColor: "#4ade80",
  },
  {
    id: "room_beach",
    name: "Bãi biển",
    price: 300,
    wallColor: "#bae6fd",
    wallAccent: "#7dd3fc",
    floorColor: "#fde68a",
  },
  {
    id: "room_space",
    name: "Vũ trụ",
    price: 400,
    wallColor: "#0f172a",
    wallAccent: "#1e293b",
    floorColor: "#1e1b4b",
    ambientClass: "brightness-75",
  },
];

// ── Room decorations ──────────────────────────────────────────
export type DecoSlot = "left" | "right" | "back-left" | "back-right" | "floor-left" | "floor-right";

export interface RoomDeco {
  id: string;
  name: string;
  emoji: string;
  price: number;
  slot: DecoSlot;      // vị trí mặc định trong phòng
  zIndex?: number;
  scale?: number;
}

export const ROOM_DECOS: RoomDeco[] = [
  // Bàn học / kệ — back wall
  { id: "deco_bookshelf", name: "Kệ sách",      emoji: "📚", price: 100, slot: "back-left",   scale: 1.4 },
  { id: "deco_trophy",    name: "Tủ cúp",        emoji: "🏆", price: 200, slot: "back-right",  scale: 1.3 },
  { id: "deco_chalkboard",name: "Bảng xanh",     emoji: "🟩", price: 120, slot: "back-left",   scale: 1.6 },
  { id: "deco_poster",    name: "Poster ngôi sao",emoji: "⭐", price: 80,  slot: "back-right",  scale: 1.2 },
  // Cạnh tường
  { id: "deco_lamp",      name: "Đèn học",       emoji: "🪔", price: 90,  slot: "right",       scale: 1.3 },
  { id: "deco_plant",     name: "Chậu cây",      emoji: "🌱", price: 80,  slot: "left",        scale: 1.2 },
  { id: "deco_speaker",   name: "Loa nhạc",      emoji: "🔊", price: 180, slot: "left",        scale: 1.1 },
  { id: "deco_rainbow",   name: "Rèm cửa sổ",   emoji: "🎀", price: 150, slot: "back-right",  scale: 1.4 },
  // Sàn nhà
  { id: "deco_rug",       name: "Thảm tròn",     emoji: "🔵", price: 120, slot: "floor-left",  scale: 1.8 },
  { id: "deco_ball",      name: "Bóng màu",      emoji: "⚽", price: 60,  slot: "floor-right", scale: 1.0 },
  { id: "deco_bag",       name: "Cặp sách",      emoji: "🎒", price: 70,  slot: "floor-left",  scale: 1.1 },
  { id: "deco_robot",     name: "Robot đồ chơi", emoji: "🤖", price: 250, slot: "floor-right", scale: 1.2 },
  // Đặc biệt — night room
  { id: "deco_moon",      name: "Đèn mặt trăng", emoji: "🌙", price: 160, slot: "back-left",   scale: 1.3 },
  { id: "deco_star_str",  name: "Dây đèn sao",   emoji: "✨", price: 140, slot: "back-right",  scale: 1.5 },
];

// ── Position map theo slot ─────────────────────────────────────
const SLOT_STYLE: Record<DecoSlot, React.CSSProperties> = {
  "back-left":   { position: "absolute", bottom: "52%", left: "6%"  },
  "back-right":  { position: "absolute", bottom: "52%", right: "6%" },
  "left":        { position: "absolute", bottom: "38%", left: "2%"  },
  "right":       { position: "absolute", bottom: "38%", right: "2%" },
  "floor-left":  { position: "absolute", bottom: "28%", left: "8%"  },
  "floor-right": { position: "absolute", bottom: "28%", right: "8%" },
};

interface PetRoomProps {
  bgId?: string;
  equippedDecoIds?: string[];
  children: React.ReactNode;
  height?: number;
  fullHeight?: boolean;
  petHeightPx?: number; // chiều cao thực của pet sprite để tính vị trí đứng
}

export default function PetRoom({
  bgId = "room_default",
  equippedDecoIds = [],
  children,
  height = 340,
  fullHeight = false,
  petHeightPx = 195,
}: PetRoomProps) {
  const bg = ROOM_BACKGROUNDS.find(b => b.id === bgId) ?? ROOM_BACKGROUNDS[0];
  const isNight = bgId === "room_night" || bgId === "room_space";
  const isGarden = bgId === "room_garden";
  const isBeach = bgId === "room_beach";

  const equippedDecos = useMemo(
    () => ROOM_DECOS.filter(d => equippedDecoIds.includes(d.id)),
    [equippedDecoIds],
  );

  // Tất cả tính theo FLOOR_PCT — thống nhất một chỗ
  const FLOOR_PCT = 0.70;
  const floorTopPx = fullHeight ? null : Math.round(height * FLOOR_PCT);

  return (
    <div
      className={`relative w-full select-none ${fullHeight ? "h-full overflow-hidden" : "overflow-hidden"}`}
      style={fullHeight ? undefined : { height }}
    >
      {/* ── Wall — từ top đến sàn ── */}
      <div
        className="absolute inset-x-0 top-0 transition-colors duration-700"
        style={{
          bottom: `${(1 - FLOOR_PCT) * 100}%`,
          background: `linear-gradient(180deg, ${bg.wallAccent ?? bg.wallColor} 0%, ${bg.wallColor} 100%)`,
        }}
      />

      {/* ── Wall details per theme ── */}
      {isNight && <NightWallDeco />}
      {isGarden && <GardenWallDeco />}
      {isBeach && <BeachWallDeco />}
      {!isNight && !isGarden && !isBeach && bgId !== "room_space" && <DefaultWallDeco wallColor={bg.wallColor} />}
      {bgId === "room_space" && <SpaceWallDeco />}

      {/* ── Floor — từ sàn xuống bottom, solid không opacity ── */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          top: `${FLOOR_PCT * 100}%`,
          background: isGarden
            ? "#4ade80"
            : isBeach
              ? "#fbbf24"
              : bg.floorColor,
        }}
      />

      {/* Floor planks */}
      {!isGarden && !isBeach && bgId !== "room_space" && (
        <div className="absolute inset-x-0 bottom-0" style={{ top: `${FLOOR_PCT * 100}%`, opacity: 0.12 }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} className="absolute inset-x-0 border-t border-black/40" style={{ top: `${i * 20}%` }} />
          ))}
        </div>
      )}

      {/* ── Baseboard ── */}
      <div
        className="absolute inset-x-0 h-4"
        style={{
          top: `${FLOOR_PCT * 100}%`,
          background: isGarden ? "#16a34a" : isBeach ? "#d97706" : isNight ? "#312e81" : bgId === "room_space" ? "#1e1b4b" : "#b8a88a",
        }}
      />

      {/* ── Back-wall decos ── */}
      {equippedDecos
        .filter(d => d.slot === "back-left" || d.slot === "back-right")
        .map(d => (
          <div key={d.id} style={{ ...SLOT_STYLE[d.slot], fontSize: `${(d.scale ?? 1) * 2.2}rem`, lineHeight: 1 }}>
            {d.emoji}
          </div>
        ))}

      {/* ── Side decos ── */}
      {equippedDecos
        .filter(d => d.slot === "left" || d.slot === "right")
        .map(d => (
          <div key={d.id} style={{ ...SLOT_STYLE[d.slot], fontSize: `${(d.scale ?? 1) * 2}rem`, lineHeight: 1 }}>
            {d.emoji}
          </div>
        ))}

      {/* ── Pet — chân đặt đúng trên baseboard ── */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: fullHeight
            ? `calc(${FLOOR_PCT * 100}% - ${petHeightPx}px)`
            : `${(floorTopPx ?? 0) - petHeightPx}px`,
        }}
      >
        {children}
      </div>

      {/* ── Floor decos (foreground) ── */}
      {equippedDecos
        .filter(d => d.slot === "floor-left" || d.slot === "floor-right")
        .map(d => (
          <div key={d.id} style={{ ...SLOT_STYLE[d.slot], fontSize: `${(d.scale ?? 1) * 2}rem`, lineHeight: 1, zIndex: 20 }}>
            {d.emoji}
          </div>
        ))}

      {/* ── Shadow ── */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full opacity-20 blur-sm"
        style={{
          top: fullHeight
            ? `calc(${FLOOR_PCT * 100}% + 4px)`
            : `${(floorTopPx ?? 0) + 4}px`,
          width: 70, height: 8, background: "#000",
        }}
      />
    </div>
  );
}

// ── Wall deco components ──────────────────────────────────────

function DefaultWallDeco({ wallColor }: { wallColor: string }) {
  return (
    <>
      {/* Cửa sổ trái */}
      <div className="absolute" style={{ top: "8%", left: "10%", width: 64, height: 72 }}>
        <div className="w-full h-full rounded-t-xl border-4 border-white/60 bg-sky-200/60 flex flex-col">
          <div className="flex-1 grid grid-cols-2 gap-0.5 p-1">
            <div className="bg-sky-300/50 rounded-sm" />
            <div className="bg-white/40 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
            <div className="bg-sky-300/40 rounded-sm" />
          </div>
        </div>
        {/* Rèm */}
        <div className="absolute -top-1 left-0 right-0 flex justify-between px-1">
          <div className="w-3 h-8 bg-pink-300 rounded-b-full opacity-80" />
          <div className="w-3 h-8 bg-pink-300 rounded-b-full opacity-80" />
        </div>
      </div>
      {/* Cửa sổ phải */}
      <div className="absolute" style={{ top: "8%", right: "10%", width: 64, height: 72 }}>
        <div className="w-full h-full rounded-t-xl border-4 border-white/60 bg-sky-200/60 flex flex-col">
          <div className="flex-1 grid grid-cols-2 gap-0.5 p-1">
            <div className="bg-white/40 rounded-sm" />
            <div className="bg-sky-300/50 rounded-sm" />
            <div className="bg-sky-300/40 rounded-sm" />
            <div className="bg-white/30 rounded-sm" />
          </div>
        </div>
        <div className="absolute -top-1 left-0 right-0 flex justify-between px-1">
          <div className="w-3 h-8 bg-pink-300 rounded-b-full opacity-80" />
          <div className="w-3 h-8 bg-pink-300 rounded-b-full opacity-80" />
        </div>
      </div>
      {/* Ảnh/poster trên tường giữa */}
      <div className="absolute" style={{ top: "10%", left: "50%", transform: "translateX(-50%)" }}>
        <div className="w-16 h-12 border-4 border-white/70 rounded bg-gradient-to-br from-yellow-100 to-pink-100 flex items-center justify-center text-xl shadow-sm">
          🌟
        </div>
      </div>
    </>
  );
}

function NightWallDeco() {
  return (
    <>
      {/* Cửa sổ đêm */}
      <div className="absolute" style={{ top: "6%", left: "12%", width: 60, height: 70 }}>
        <div className="w-full h-full rounded-t-xl border-4 border-slate-600 bg-indigo-950/80 flex items-center justify-center">
          <span className="text-2xl">🌙</span>
        </div>
      </div>
      <div className="absolute" style={{ top: "6%", right: "12%", width: 60, height: 70 }}>
        <div className="w-full h-full rounded-t-xl border-4 border-slate-600 bg-indigo-950/80 flex items-center justify-center">
          <span className="text-2xl">⭐</span>
        </div>
      </div>
      {/* Đèn dây */}
      <div className="absolute flex gap-3 px-8" style={{ top: "4%", left: 0, right: 0 }}>
        {["🟡","🔴","🟢","🔵","🟡","🔴","🟢"].map((c, i) => (
          <span key={i} className="text-xs animate-twinkle" style={{ animationDelay: `${i * 0.3}s` }}>{c}</span>
        ))}
      </div>
    </>
  );
}

function GardenWallDeco() {
  return (
    <>
      {/* Trời xanh + mây */}
      <div className="absolute inset-x-0 top-0" style={{ bottom: "35%" }}>
        <div className="absolute top-3 left-8 text-3xl opacity-80">☁️</div>
        <div className="absolute top-6 right-12 text-2xl opacity-70">☁️</div>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-4xl opacity-90">☀️</div>
      </div>
      {/* Hàng rào */}
      <div className="absolute inset-x-0 flex gap-2 justify-center px-4" style={{ bottom: "34%" }}>
        {Array.from({length: 10}).map((_, i) => (
          <div key={i} className="w-3 bg-white/80 rounded-t-full" style={{ height: 28 }} />
        ))}
      </div>
    </>
  );
}

function BeachWallDeco() {
  return (
    <>
      <div className="absolute inset-x-0 top-0" style={{ bottom: "35%" }}>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-4xl">☀️</div>
        <div className="absolute top-8 left-6 text-2xl opacity-60">☁️</div>
        <div className="absolute bottom-2 left-4 text-2xl">🌴</div>
        <div className="absolute bottom-2 right-4 text-2xl">🌴</div>
        {/* Sóng */}
        <div className="absolute bottom-0 inset-x-0 h-6 bg-cyan-300/40 rounded-t-full" />
      </div>
    </>
  );
}

function SpaceWallDeco() {
  return (
    <>
      <div className="absolute inset-0" style={{ bottom: "35%" }}>
        {[
          {t:"8%",l:"15%",s:"1rem"},{t:"20%",l:"70%",s:"0.8rem"},
          {t:"5%",l:"45%",s:"1.2rem"},{t:"30%",l:"25%",s:"0.7rem"},
          {t:"15%",l:"85%",s:"1rem"},{t:"25%",l:"55%",s:"0.9rem"},
          {t:"10%",l:"35%",s:"0.8rem"},{t:"35%",l:"80%",s:"0.7rem"},
        ].map((s, i) => (
          <span
            key={i}
            className="absolute text-white animate-twinkle"
            style={{ top: s.t, left: s.l, fontSize: s.s, animationDelay: `${i * 0.4}s` }}
          >✦</span>
        ))}
        <div className="absolute top-4 right-8 text-4xl animate-twinkle" style={{ animationDelay: "0.2s" }}>🪐</div>
        <div className="absolute top-6 left-8 text-3xl animate-twinkle" style={{ animationDelay: "0.8s" }}>🌕</div>
      </div>
    </>
  );
}
