"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ParentBottomNav } from "@/components/shared/BottomNav";
import { AVATAR_EMOJI } from "@/lib/utils";
import { toast } from "sonner";
import { Send, SmilePlus } from "lucide-react";

interface Child { id: string; name: string; avatar: string; }
interface Message {
  id: string; content: string; type: string; created_at: string;
  from_user: string | null; from_child: string | null; to_child: string | null;
}

const EMOJIS = ["😊","🎉","💪","❤️","⭐","🔥","👍","🤩","😂","🥰","🙌","✨"];

export default function ChatPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const scrollDown = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

  const addMessage = (newMsg: Message) => {
    setMessages(prev => {
      if (prev.some(m => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });
    scrollDown();
  };

  const loadMessages = useCallback(async (childId: string) => {
    const { data } = await supabase.from("messages")
      .select("*")
      .or(`to_child.eq.${childId},from_child.eq.${childId}`)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages(data || []);
    scrollDown();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/parent/login"); return; }
      setUserId(session.user.id);
      const { data: kids } = await supabase.from("children").select("id,name,avatar").eq("parent_id", session.user.id);
      setChildren(kids || []);
      if (kids?.length) {
        setSelectedChild(kids[0]);
        await loadMessages(kids[0].id);
      }
      setLoading(false);
    });
  }, [loadMessages, router]);

  useEffect(() => {
    if (!selectedChild) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase.channel(`chat-parent-${selectedChild.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `to_child=eq.${selectedChild.id}`,
      }, (payload) => addMessage(payload.new as Message))
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `from_child=eq.${selectedChild.id}`,
      }, (payload) => addMessage(payload.new as Message))
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [selectedChild]);

  async function sendMessage(content: string, type = "text") {
    if (!content.trim() || !selectedChild || !userId) return;
    const { data, error } = await supabase.from("messages").insert({
      from_user: userId, to_child: selectedChild.id,
      content: content.trim(), type,
    }).select().single();
    if (error) { toast.error("Không gửi được tin nhắn"); return; }
    // Add locally immediately (realtime will dedup if fires)
    setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
    setInput("");
    setShowEmoji(false);
    scrollDown();
  }

  async function handleSelectChild(child: Child) {
    setSelectedChild(child);
    setMessages([]);
    await loadMessages(child.id);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-5xl animate-bounce">💬</div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="page-header flex-shrink-0">
        <h1 className="font-display font-black text-xl flex-1">💬 Chat với con</h1>
      </div>

      {children.length > 0 && (
        <div className="flex gap-2 px-4 py-2 bg-white border-b border-slate-100 overflow-x-auto flex-shrink-0">
          {children.map(c => (
            <button key={c.id} onClick={() => handleSelectChild(c)}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl font-extrabold text-sm border-2 transition-all
                ${selectedChild?.id === c.id ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
              <span>{AVATAR_EMOJI[c.avatar] || "🐱"}</span> {c.name}
            </button>
          ))}
        </div>
      )}

      {children.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <div className="text-5xl mb-3">👶</div>
            <p className="font-extrabold text-slate-600">Chưa có hồ sơ con</p>
            <p className="text-slate-400 text-sm mt-1">Tạo hồ sơ con trước nhé!</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <div className="text-5xl mb-2">💌</div>
                <p className="text-slate-400 font-semibold">Bắt đầu chat với {selectedChild?.name} nhé!</p>
              </div>
            )}
            {messages.map(msg => {
              const isMe = !!msg.from_user && !msg.from_child;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  {!isMe && (
                    <div className="w-8 h-8 rounded-2xl bg-blue-100 flex items-center justify-center text-sm mr-2 flex-shrink-0 self-end">
                      {AVATAR_EMOJI[selectedChild?.avatar || "cat"]}
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-3xl px-4 py-2.5 ${
                    isMe ? "bg-blue-500 text-white rounded-br-lg" : "bg-white text-slate-800 border border-slate-100 rounded-bl-lg shadow-sm"
                  }`}>
                    <p className="font-bold text-base leading-snug">{msg.content}</p>
                    <p className={`text-xs mt-1 ${isMe ? "text-blue-200" : "text-slate-400"}`}>
                      {new Date(msg.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {showEmoji && (
            <div className="bg-white border-t border-slate-100 px-4 py-3 flex flex-wrap gap-2 flex-shrink-0">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => sendMessage(e, "emoji")}
                  className="text-2xl active:scale-90 transition-all hover:scale-110">{e}</button>
              ))}
            </div>
          )}

          <div className="bg-white border-t border-slate-100 px-4 py-3 flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setShowEmoji(!showEmoji)}
              className={`p-2.5 rounded-2xl transition-all active:scale-90 ${showEmoji ? "bg-yellow-100 text-yellow-600" : "bg-slate-100 text-slate-500"}`}>
              <SmilePlus className="w-5 h-5" />
            </button>
            <input
              className="flex-1 bg-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
              placeholder={`Nhắn tin cho ${selectedChild?.name}...`}
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            />
            <button onClick={() => sendMessage(input)} disabled={!input.trim()}
              className="w-11 h-11 rounded-2xl bg-blue-500 text-white flex items-center justify-center active:scale-90 transition-all disabled:opacity-40">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </>
      )}

      <ParentBottomNav />
    </div>
  );
}