"use client";
// components/pet/PetSplashLoader.tsx
// Màn hình loading EduPark — dùng khi app đang khởi động

import { useEffect, useState } from "react";
import Image from "next/image";

interface PetSplashLoaderProps {
  onDone?: () => void;
  minDuration?: number; // ms
}

const TIPS = [
  "Học mỗi ngày giúp bé thông minh hơn! 🧠",
  "Pet của bé đang chờ được chăm sóc! 🐾",
  "Hoàn thành bài học để nhận sao vàng! ⭐",
  "Kiên trì học tập là chìa khoá thành công! 🔑",
];

export default function PetSplashLoader({ onDone, minDuration = 2000 }: PetSplashLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          const elapsed = Date.now() - start;
          const wait = Math.max(0, minDuration - elapsed);
          setTimeout(() => onDone?.(), wait);
          return 100;
        }
        return p + Math.random() * 12 + 3;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [minDuration, onDone]);

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-between overflow-hidden"
      style={{ background: "linear-gradient(160deg, #7C3AED 0%, #6D28D9 40%, #4C1D95 100%)" }}>

      {/* Decorative background circles */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-20 translate-x-20" />
      <div className="absolute bottom-20 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-10 -translate-x-16" />
      <div className="absolute top-1/3 left-1/4 w-6 h-6 rounded-full bg-yellow-300/30 animate-ping" style={{ animationDelay: "0.5s" }} />
      <div className="absolute top-1/4 right-1/3 w-4 h-4 rounded-full bg-pink-300/40 animate-ping" style={{ animationDelay: "1s" }} />

      {/* Stars scattered */}
      {["top-12 left-8", "top-20 right-12", "top-32 left-1/3", "bottom-40 right-8"].map((pos, i) => (
        <span key={i} className={`absolute ${pos} text-yellow-300 animate-twinkle`}
          style={{ animationDelay: `${i * 0.3}s`, fontSize: [16, 12, 20, 14][i] }}>★</span>
      ))}

      {/* Top section — logo */}
      <div className="flex-1 flex flex-col items-center justify-center pt-16 gap-2">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-12 h-12 bg-green-400 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl font-black text-white">E</span>
          </div>
          <div>
            <span className="font-black text-4xl">
              <span className="text-white">Edu</span>
              <span className="text-yellow-300">Park</span>
            </span>
          </div>
        </div>
        <p className="text-white/70 font-bold text-sm tracking-wider">Học vui – Lớn mỗi ngày</p>
      </div>

      {/* Center — mascot */}
      <div className="flex flex-col items-center gap-4 flex-shrink-0">
        <div className="relative">
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full bg-yellow-300/20 animate-ping scale-110" />
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* PNG mascot */}
            <Image
              src="/pets/cat/happy.png"
              alt="EduPark mascot"
              width={176}
              height={176}
              className={`object-contain drop-shadow-2xl transition-opacity duration-500 animate-pet-bounce
                ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgLoaded(true)} // show fallback
              priority
            />
            {/* Fallback emoji */}
            {!imgLoaded && (
              <span className="absolute inset-0 flex items-center justify-center text-8xl animate-pet-bounce">🐱</span>
            )}
          </div>
        </div>

        {/* Tip text */}
        <p className="text-white/80 font-bold text-sm text-center px-8 max-w-xs leading-relaxed">
          {tip}
        </p>
      </div>

      {/* Bottom — progress bar */}
      <div className="w-full px-10 pb-16 flex flex-col items-center gap-3">
        <p className="text-white/50 text-xs font-bold">Đang tải thế giới thú cưng...</p>
        <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: "linear-gradient(90deg, #FCD34D, #F59E0B, #FCD34D)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }}
          />
        </div>
        <p className="text-yellow-300 text-xs font-black">{Math.min(Math.round(progress), 100)}%</p>
      </div>
    </div>
  );
}