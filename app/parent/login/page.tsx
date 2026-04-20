"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import Link from "next/link";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function ParentLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role: "parent", name }, // metadata cho trigger dùng
          },
        });
        if (error) throw error;

        // Nếu Supabase không yêu cầu confirm email, user trả về ngay
        if (data.user) {
          // upsert để tránh conflict nếu trigger đã chạy trước
          await supabase
            .from("users")
            .upsert(
              { id: data.user.id, role: "parent", name },
              { onConflict: "id" },
            );
          toast.success("Đăng ký thành công! 🎉");
          router.replace("/parent/dashboard");
        } else {
          // Cần xác nhận email
          toast.success("Kiểm tra email để xác nhận tài khoản! 📧");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        if (data.user) {
          // ✅ Đảm bảo luôn có row trong public.users sau khi login
          await supabase
            .from("users")
            .upsert(
              { id: data.user.id, role: "parent", name: data.user.email ?? "" },
              { onConflict: "id" },
            );
          toast.success("Chào mừng trở lại! 👋");
          router.replace("/parent/dashboard");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        background: "linear-gradient(160deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="flex items-center gap-2 text-white/80 font-bold mb-6 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Quay lại
        </Link>

        <div className="text-center mb-6">
          <span className="text-6xl">👨‍👩‍👧</span>
          <h1 className="font-display text-3xl font-black text-white mt-3">
            {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </h1>
          <p className="text-white/70 font-semibold mt-1">Dành cho cha mẹ</p>
        </div>

        <div className="bg-white rounded-4xl p-6 shadow-2xl">
          {/* Mode toggle */}
          <div className="flex bg-slate-100 rounded-2xl p-1 mb-5">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm transition-all duration-200 ${mode === m ? "bg-white shadow-sm text-blue-600" : "text-slate-500"}`}
              >
                {m === "login" ? "Đăng nhập" : "Đăng ký"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                  Họ tên
                </label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                className="input-field"
                type="email"
                placeholder="email@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  className="input-field pr-12"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPw ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-2"
            >
              {loading
                ? "⏳ Đang xử lý..."
                : mode === "login"
                  ? "🚀 Đăng nhập"
                  : "✨ Tạo tài khoản"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
