"use client";
// app/parent/chat/page.tsx — v3: Stickers + Positive reports

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ParentBottomNav } from "@/components/shared/BottomNav";
import { AVATAR_EMOJI } from "@/lib/utils";
import { toast } from "sonner";
import { Send, Smile, Gift, Star, Bell } from "lucide-react";

interface Child {
  id: string;
  name: string;
  avatar: string;
}
interface Message {
  id: string; content: string; type: string; created_at: string;
  from_user: string | null; from_child: string | null; to_child: string | null;
}
interface Sticker {
  id: string;
  name: string;
  emoji: string;
  category: string;
}
interface PositiveReport {
  id: string;
  subject: string;
  message: string;
  xp_gained: number;
  is_read: boolean;
  created_at: string;
}

const STICKER_CATEGORIES = [
  { id: "praise", label: "Khen ngợi", emoji: "⭐" },
  { id: "celebrate", label: "Ăn mừng", emoji: "🎉" },
  { id: "comfort", label: "An ủi", emoji: "🤗" },
  { id: "funny", label: "Hài hước", emoji: "😄" },
];

export default function ChatPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [reports, setReports] = useState<PositiveReport[]>([]);
  const [input, setInput] = useState("");
  const [panel, setPanel] = useState<"none" | "sticker" | "reports">("none");
  const [stickerCat, setStickerCat] = useState("praise");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const scroll = () =>
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      80,
    );

  const loadMessages = useCallback(async (childId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`to_child.eq.${childId},from_child.eq.${childId}`)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages(data || []);
    scroll();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/parent/login");
        return;
      }
      setUserId(session.user.id);

      const [{ data: kids }, { data: stks }] = await Promise.all([
        supabase
          .from("children")
          .select("id,name,avatar")
          .eq("parent_id", session.user.id),
        supabase.from("stickers").select("*").order("category"),
      ]);
      setChildren(kids || []);
      setStickers(stks || []);
      if (kids?.length) {
        setSelectedChild(kids[0]);
        await loadMessages(kids[0].id);
        loadReports(session.user.id, kids[0].id);
      }
      setLoading(false);
    });
  }, [loadMessages, router]);

  async function loadReports(parentId: string, childId: string) {
    const { data } = await supabase
      .from("positive_reports")
      .select("*")
      .eq("child_id", childId)
      .eq("parent_id", parentId)
      .order("created_at", { ascending: false })
      .limit(10);
    setReports(data || []);
  }

  // Realtime
  useEffect(() => {
    if (!selectedChild) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase
      .channel(`chat-parent-${selectedChild.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `to_child=eq.${selectedChild.id}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) =>
            prev.some((p) => p.id === m.id) ? prev : [...prev, m],
          );
          scroll();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "positive_reports",
          filter: `child_id=eq.${selectedChild.id}`,
        },
        () => {
          if (userId) loadReports(userId, selectedChild.id);
        },
      )
      .subscribe();
    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
    };
  }, [selectedChild, userId]);

  async function sendMessage(content: string, type = "text") {
    if (!content.trim() || !selectedChild || !userId) return;
    const { data, error } = await supabase
      .from("messages")
      .insert({
        from_user: userId,
        to_child: selectedChild.id,
        content: content.trim(),
        type,
      })
      .select()
      .single();
    if (error) {
      toast.error("Không gửi được!");
      return;
    }
    setMessages((prev) =>
      prev.some((m) => m.id === data.id) ? prev : [...prev, data],
    );
    setInput("");
    setPanel("none");
    scroll();
  }

  async function sendSticker(sticker: Sticker) {
    await sendMessage(`${sticker.emoji} ${sticker.name}`, "sticker");
  }

  async function markReportsRead() {
    if (!selectedChild || !userId) return;
    await supabase
      .from("positive_reports")
      .update({ is_read: true })
      .eq("child_id", selectedChild.id)
      .eq("parent_id", userId)
      .eq("is_read", false);
    setReports((prev) => prev.map((r) => ({ ...r, is_read: true })));
  }

  async function handleSelectChild(child: Child) {
    setSelectedChild(child);
    setMessages([]);
    setPanel("none");
    await loadMessages(child.id);
    if (userId) loadReports(userId, child.id);
  }

  const unreadReports = reports.filter((r) => !r.is_read).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-5xl animate-bounce">💬</div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="page-header flex-shrink-0">
        <h1 className="font-display font-black text-xl flex-1">
          💬 Chat với con
        </h1>
        {/* Reports bell */}
        <button
          onClick={() => {
            setPanel((p) => (p === "reports" ? "none" : "reports"));
            if (unreadReports > 0) markReportsRead();
          }}
          className="relative p-2 rounded-xl active:scale-90 transition-all"
        >
          <Bell
            className={`w-5 h-5 ${unreadReports > 0 ? "text-orange-500" : "text-slate-400"}`}
          />
          {unreadReports > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 text-white text-xs font-black rounded-full flex items-center justify-center">
              {unreadReports}
            </span>
          )}
        </button>
        {/* Gift button */}
        <button
          onClick={() => router.push("/parent/send-gift")}
          className="p-2 rounded-xl bg-pink-100 active:scale-90 transition-all ml-1"
        >
          <Gift className="w-5 h-5 text-pink-600" />
        </button>
      </div>

      {/* Child selector */}
      {children.length > 0 && (
        <div className="flex gap-2 px-4 py-2 bg-white border-b border-slate-100 overflow-x-auto flex-shrink-0">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelectChild(c)}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl font-extrabold text-sm border-2 transition-all
                ${selectedChild?.id === c.id ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}
            >
              <span>{AVATAR_EMOJI[c.avatar] || "🐱"}</span> {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Positive reports panel */}
      {panel === "reports" && (
        <div className="bg-orange-50 border-b-2 border-orange-200 px-4 py-3 flex-shrink-0 max-h-52 overflow-y-auto">
          <p className="text-xs font-extrabold text-orange-600 uppercase tracking-wider mb-2">
            📊 Báo cáo tích cực về {selectedChild?.name}
          </p>
          {reports.length === 0 ? (
            <p className="text-slate-400 text-sm font-semibold text-center py-2">
              Chưa có báo cáo nào. Hãy để con học thêm nhé!
            </p>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className={`bg-white rounded-2xl p-3 border-2 ${r.is_read ? "border-slate-100" : "border-orange-300"}`}
                >
                  <p className="text-slate-700 font-semibold text-sm">
                    {r.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {r.xp_gained > 0 && (
                      <span className="text-xs text-yellow-600 font-extrabold">
                        +{r.xp_gained} XP ⭐
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {new Date(r.created_at).toLocaleString("vi-VN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {!r.is_read && (
                      <span className="ml-auto text-xs bg-orange-100 text-orange-600 font-extrabold px-2 py-0.5 rounded-full">
                        Mới
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      {children.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <div className="text-5xl mb-3">👶</div>
            <p className="font-extrabold text-slate-600">Chưa có hồ sơ con</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <div className="text-5xl mb-2">💌</div>
                <p className="text-slate-400 font-semibold">
                  Bắt đầu chat với {selectedChild?.name} nhé!
                </p>
                <p className="text-slate-300 text-xs mt-1">
                  Hãy gửi sticker khen ngợi bé đầu tiên 🌟
                </p>
              </div>
            )}
            {messages.map((msg) => {
              const isMe = !!msg.from_user && !msg.from_child;
              const isSticker = msg.type === "sticker" || msg.type === "gift";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  {!isMe && (
                    <div className="w-8 h-8 rounded-2xl bg-blue-100 flex items-center justify-center text-sm mr-2 flex-shrink-0 self-end">
                      {AVATAR_EMOJI[selectedChild?.avatar || "cat"]}
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] rounded-3xl px-4 py-2.5 ${
                      isMe
                        ? "bg-blue-500 text-white rounded-br-lg"
                        : "bg-white text-slate-800 border border-slate-100 rounded-bl-lg shadow-sm"
                    } ${isSticker ? "!bg-transparent !shadow-none !border-0 !px-0" : ""}`}
                  >
                    {isSticker ? (
                      <div className="text-4xl text-center">
                        {msg.content.split(" ")[0]}
                      </div>
                    ) : (
                      <p className="font-bold text-base leading-snug">
                        {msg.content}
                      </p>
                    )}
                    <p
                      className={`text-xs mt-1 ${isMe ? "text-blue-200" : "text-slate-400"} ${isSticker ? "text-center" : ""}`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Sticker panel */}
          {panel === "sticker" && (
            <div className="bg-white border-t border-slate-100 px-4 py-3 flex-shrink-0">
              {/* Category tabs */}
              <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
                {STICKER_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setStickerCat(cat.id)}
                    className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl font-extrabold text-xs border-2 transition-all
                      ${stickerCat === cat.id ? "bg-blue-100 border-blue-400 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {stickers
                  .filter((s) => s.category === stickerCat)
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => sendSticker(s)}
                      className="flex flex-col items-center gap-1 bg-slate-50 rounded-2xl px-3 py-2 border-2 border-slate-200 active:scale-90 transition-all"
                    >
                      <span className="text-2xl">{s.emoji}</span>
                      <span className="text-xs font-extrabold text-slate-600 text-center max-w-16 leading-tight">
                        {s.name}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Input bar */}
          <div className="bg-white border-t border-slate-100 px-4 py-3 flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() =>
                setPanel((p) => (p === "sticker" ? "none" : "sticker"))
              }
              className={`p-2.5 rounded-2xl transition-all active:scale-90 ${panel === "sticker" ? "bg-yellow-100 text-yellow-600" : "bg-slate-100 text-slate-500"}`}
            >
              <Smile className="w-5 h-5" />
            </button>
            <input
              className="flex-1 bg-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
              placeholder={`Nhắn tin cho ${selectedChild?.name}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="w-11 h-11 rounded-2xl bg-blue-500 text-white flex items-center justify-center active:scale-90 transition-all disabled:opacity-40"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </>
      )}

      <ParentBottomNav />
    </div>
  );
}