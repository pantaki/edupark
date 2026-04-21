"use client";
// components/shared/BottomNav.tsx — v4 final

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  Users,
  MessageCircle,
  Plus,
  Home,
  Map,
  BookOpen,
  Gamepad2,
  PawPrint,
  Trophy,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem { href: string; icon: React.ReactNode; label: string; }

const parentNav: NavItem[] = [
  {
    href: "/parent/dashboard",
    icon: <BarChart2 className="w-5 h-5" />,
    label: "Báo cáo",
  },
  {
    href: "/parent/children",
    icon: <Users className="w-5 h-5" />,
    label: "Con cái",
  },
  {
    href: "/parent/send-gift",
    icon: <Gift className="w-5 h-5" />,
    label: "Tặng quà",
  },
  {
    href: "/parent/chat",
    icon: <MessageCircle className="w-5 h-5" />,
    label: "Chat",
  },
  {
    href: "/parent/create-quiz",
    icon: <Plus className="w-5 h-5" />,
    label: "Quiz",
  },
];

const studentNav: NavItem[] = [
  {
    href: "/student/subjects",
    icon: <Home className="w-5 h-5" />,
    label: "Học",
  },
  {
    href: "/student/journey",
    icon: <Map className="w-5 h-5" />,
    label: "Bản đồ",
  },
  {
    href: "/student/pet",
    icon: <PawPrint className="w-5 h-5" />,
    label: "Pet",
  },
  {
    href: "/student/achievements",
    icon: <Trophy className="w-5 h-5" />,
    label: "Huy hiệu",
  },
  {
    href: "/student/progress",
    icon: <BarChart2 className="w-5 h-5" />,
    label: "Tiến độ",
  },
];

function NavBar({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 flex items-stretch"
      style={{ boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}
    >
      {items.map((item) => {
        const active = path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all duration-150 relative",
              active ? "text-blue-600" : "text-slate-400",
            )}
          >
            <span
              className={cn(
                "transition-all duration-150 rounded-2xl p-1.5",
                active && "bg-blue-50 scale-110 text-blue-600",
              )}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-extrabold">{item.label}</span>
            {active && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-t-full bg-blue-500" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function ParentBottomNav() { return <NavBar items={parentNav} />; }
export function StudentBottomNav() { return <NavBar items={studentNav} />; }