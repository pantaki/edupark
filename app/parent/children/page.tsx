"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ParentBottomNav } from "@/components/shared/BottomNav";
import { generateCode, AVATAR_EMOJI, AVATARS } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Plus, Copy, Trash2, X } from "lucide-react";

interface Child {
  id: string; name: string; code: string; avatar: string; grade: number;
}

export default function ChildrenPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGrade, setNewGrade] = useState(3);
  const [newAvatar, setNewAvatar] = useState("cat");
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async (uid: string) => {
    const { data } = await supabase.from("children").select("*").eq("parent_id", uid).order("created_at");
    setChildren(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/parent/login"); return; }
      setUserId(session.user.id);
      load(session.user.id);
    });
  }, [load, router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !newName.trim()) return;
    setSaving(true);
    try {
      const code = generateCode(6);
      const { data, error } = await supabase.from("children").insert({
        parent_id: userId, name: newName.trim(), code, avatar: newAvatar, grade: newGrade,
      }).select().single();
      if (error) {
        console.error("Supabase error:", JSON.stringify(error, null, 2));
        throw error;
      }
      setChildren(prev => [...prev, data]);
      setShowModal(false);
      setNewName(""); setNewGrade(3); setNewAvatar("cat");
      toast.success(`Đã tạo hồ sơ cho ${newName}! 🎉`);
    } catch {
      toast.error("Không thể tạo hồ sơ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Xóa hồ sơ của ${name}? Dữ liệu học tập sẽ mất.`)) return;
    await supabase.from("children").delete().eq("id", id);
    setChildren(prev => prev.filter(c => c.id !== id));
    toast.success("Đã xóa hồ sơ");
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`Đã copy mã ${code}! 📋`);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><div className="text-5xl animate-bounce">👨‍👩‍👧</div></div>
  );

  return (
    <div className="screen-container">
      <div className="page-header">
        <button onClick={() => router.back()} className="p-2 rounded-xl active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="font-display font-black text-xl flex-1">Quản lý con cái</h1>
        <button onClick={() => setShowModal(true)}
          className="bg-blue-500 text-white rounded-2xl px-4 py-2 font-extrabold text-sm flex items-center gap-1.5 active:scale-95 transition-all">
          <Plus className="w-4 h-4" /> Thêm con
        </button>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-3">
        {children.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">👶</div>
            <p className="font-display font-black text-xl text-slate-700">Chưa có hồ sơ nào</p>
            <p className="text-slate-500 font-semibold mt-2 mb-6">Thêm hồ sơ cho con để bắt đầu theo dõi</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-5 h-5" /> Thêm con đầu tiên
            </button>
          </div>
        )}

        {children.map(child => (
          <div key={child.id} className="card">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-3xl flex-shrink-0">
                {AVATAR_EMOJI[child.avatar] || "🐱"}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-black text-xl text-slate-800">{child.name}</h2>
                <p className="text-slate-500 font-bold text-sm">Lớp {child.grade}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl px-3 py-1.5 flex items-center gap-2">
                    <span className="font-display font-black text-blue-700 text-lg tracking-widest">{child.code}</span>
                    <button onClick={() => copyCode(child.code)} className="text-blue-400 active:scale-90 transition-all">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={() => handleDelete(child.id, child.name)}
                className="p-2.5 rounded-2xl bg-red-50 text-red-400 active:scale-90 transition-all flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-t-4xl w-full max-w-lg p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-black text-2xl">Thêm hồ sơ con</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl bg-slate-100 active:scale-90 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Avatar picker */}
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">Chọn avatar</label>
                <div className="flex gap-2 flex-wrap">
                  {AVATARS.map(av => (
                    <button key={av} type="button" onClick={() => setNewAvatar(av)}
                      className={`w-12 h-12 rounded-2xl text-2xl flex items-center justify-center transition-all duration-150 border-2
                        ${newAvatar === av ? "border-blue-400 bg-blue-50 scale-110" : "border-slate-200 bg-slate-50"}`}>
                      {AVATAR_EMOJI[av]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Tên con</label>
                <input className="input-field" type="text" placeholder="Nguyễn Văn Minh"
                  value={newName} onChange={e => setNewName(e.target.value)} required autoFocus />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Lớp học</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(g => (
                    <button key={g} type="button" onClick={() => setNewGrade(g)}
                      className={`flex-1 py-3 rounded-2xl font-extrabold text-sm border-2 transition-all duration-150
                        ${newGrade === g ? "bg-blue-500 border-blue-500 text-white" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={saving || !newName.trim()} className="btn-primary">
                {saving ? "⏳ Đang tạo..." : "✨ Tạo hồ sơ"}
              </button>
            </form>
          </div>
        </div>
      )}

      <ParentBottomNav />
    </div>
  );
}
