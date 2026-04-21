"use client";
import { useEffect, useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { StudentBottomNav } from "@/components/shared/BottomNav";
import { AVATAR_EMOJI } from "@/lib/utils";
import { Send, SmilePlus } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string; content: string; type: string; created_at: string;
  from_user: string | null; from_child: string | null; to_child: string | null;
}

const EMOJIS = ["😊","🎉","💪","❤️","⭐","🔥","👍","🤩","😂","🥰","🙌","✨"];

export default function StudentChatPage() {
  const router = useRouter();
  const { childSession } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const sendingRef = useRef(false); // guard chống double-send
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const scrollDown = () =>
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      80,
    );

  useEffect(() => {
    if (!childSession) {
      router.replace("/student/enter-code");
      return;
    }

    supabase
      .from("messages")
      .select("*")
      .or(`from_child.eq.${childSession.id},to_child.eq.${childSession.id}`)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        setMessages(data || []);
        setLoading(false);
        scrollDown();
      });

    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase
      .channel(`chat-student-${childSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `to_child=eq.${childSession.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Chỉ nhận tin từ phụ huynh (from_user != null), bỏ qua tin mình tự gửi
          if (!newMsg.from_user) return;
          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg],
          );
          scrollDown();
        },
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [childSession, router]);

  async function sendMessage(content: string, type = "text") {
    if (!content.trim() || !childSession) return;
    if (sendingRef.current) return; // chặn gửi 2 lần
    sendingRef.current = true;

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      content: content.trim(),
      type,
      created_at: new Date().toISOString(),
      from_user: null,
      from_child: childSession.id,
      to_child: childSession.id,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    setShowEmoji(false);
    scrollDown();

    const { data, error } = await supabase
      .from("messages")
      .insert({
        from_child: childSession.id,
        to_child: childSession.id,
        content: content.trim(),
        type,
      })
      .select()
      .single();

    sendingRef.current = false;

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error("Không gửi được!");
      return;
    }

    // Thay temp bằng record thật
    setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
  }

  if (!childSession) return null;

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <div className="page-header flex-shrink-0 dark:bg-slate-800/90 dark:border-slate-700">
        <div className="w-9 h-9 rounded-2xl bg-blue-100 flex items-center justify-center text-xl">
          {AVATAR_EMOJI[childSession.avatar] || "🐱"}
        </div>
        <div className="flex-1">
          <h1 className="font-display font-black text-lg leading-none">
            Chat với Ba/Mẹ
          </h1>
          <p className="text-xs text-slate-400 font-semibold">
            Nhắn tin cho gia đình nhé!
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-4xl animate-bounce">💬</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">💌</div>
              <p className="font-extrabold text-slate-500">
                Chưa có tin nhắn nào
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Nhắn tin cho ba mẹ đi!
              </p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = !!msg.from_child;
            const isTemp = msg.id.startsWith("temp-");
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <div className="w-8 h-8 rounded-2xl bg-purple-100 flex items-center justify-center text-sm mr-2 flex-shrink-0 self-end">
                    👨‍👩‍👧
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-3xl px-4 py-2.5 transition-opacity duration-200
                  ${isTemp ? "opacity-60" : "opacity-100"}
                  ${
                    isMe
                      ? "bg-green-500 text-white rounded-br-lg"
                      : "bg-white text-slate-800 border border-slate-100 rounded-bl-lg shadow-sm"
                  }`}
                >
                  {!isMe && (
                    <p className="text-xs font-extrabold text-purple-500 mb-1">
                      Ba/Mẹ
                    </p>
                  )}
                  <p className="font-bold text-base leading-snug">
                    {msg.content}
                  </p>
                  <p
                    className={`text-xs mt-1 ${isMe ? "text-green-200" : "text-slate-400"}`}
                  >
                    {isTemp
                      ? "Đang gửi…"
                      : new Date(msg.created_at).toLocaleTimeString("vi-VN", {
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
      )}

      {showEmoji && (
        <div className="bg-white border-t border-slate-100 px-4 py-3 flex flex-wrap gap-2 flex-shrink-0">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => sendMessage(e, "emoji")}
              className="text-2xl active:scale-90 transition-all hover:scale-110"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white border-t border-slate-100 px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className={`p-2.5 rounded-2xl transition-all active:scale-90 ${showEmoji ? "bg-yellow-100 text-yellow-600" : "bg-slate-100 text-slate-500"}`}
        >
          <SmilePlus className="w-5 h-5" />
        </button>
        <input
          className="flex-1 bg-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-300 transition-all"
          placeholder="Nhắn cho ba mẹ..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();
              sendMessage(input);
            }
          }}
        />
        <button
          onMouseDown={(e) => e.preventDefault()} // giữ focus, không trigger blur→click chain
          onClick={() => sendMessage(input)}
          disabled={!input.trim()}
          className="w-11 h-11 rounded-2xl bg-green-500 text-white flex items-center justify-center active:scale-90 transition-all disabled:opacity-40"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      <StudentBottomNav />
    </div>
  );
}