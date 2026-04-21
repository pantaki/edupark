"use client";
// components/shared/BottomNav.tsx — with Pet tab

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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem { href: string; icon: React.ReactNode; label: string; }

const parentNav: NavItem[] = [
  { href: "/parent/dashboard",     icon: <BarChart2 className="w-6 h-6" />,     label: "Báo cáo" },
  { href: "/parent/children",      icon: <Users className="w-6 h-6" />,         label: "Con cái" },
  { href: "/parent/chat",          icon: <MessageCircle className="w-6 h-6" />, label: "Chat" },
  { href: "/parent/create-quiz",   icon: <Plus className="w-6 h-6" />,          label: "Tạo Quiz" },
  { href: "/parent/create-lesson", icon: <BookOpen className="w-6 h-6" />,      label: "Bài học" },
];

const studentNav: NavItem[] = [
  {
    href: "/student/subjects",
    icon: <Home className="w-6 h-6" />,
    label: "Học",
  },
  {
    href: "/student/journey",
    icon: <Map className="w-6 h-6" />,
    label: "Bản đồ",
  },
  {
    href: "/student/pet",
    icon: <PawPrint className="w-6 h-6" />,
    label: "Pet",
  },
  { href: "/quiz/join", icon: <Gamepad2 className="w-6 h-6" />, label: "Quiz" },
  {
    href: "/student/progress",
    icon: <BarChart2 className="w-6 h-6" />,
    label: "Tiến độ",
  },
];

function NavBar({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="absolute bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 flex items-stretch shadow-lg shadow-slate-200/50">
      {items.map((item) => {
        const active = path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all duration-150 relative",
              active ? "text-blue-600" : "text-slate-400",
            )}
          >
            <span
              className={cn(
                "transition-transform duration-150",
                active && "scale-110",
              )}
            >
              {item.icon}
            </span>
            <span className="text-xs font-extrabold">{item.label}</span>
            {active && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-t-full bg-blue-500" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function ParentBottomNav() { return <NavBar items={parentNav} />; }
export function StudentBottomNav() { return <NavBar items={studentNav} />; }