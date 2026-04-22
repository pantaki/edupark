"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ParentBottomNav } from "@/components/shared/BottomNav";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Share2 } from "lucide-react";
import Link from "next/link";

interface Lesson {
  id: string;
  title: string;
  subject: string;
  grade: number;
  level: string;
  chapter: string | null;
  created_by: string;
  is_builtin: boolean;
  order_num: number;
  created_at: string;
}

interface Child {
  id: string;
  name: string;
  grade: number;
}

interface AssignModal {
  open: boolean;
  lesson: Lesson | null;
}

export default function MyLessonsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState<AssignModal>({
    open: false,
    lesson: null,
  });
  const [assigning, setAssigning] = useState(false);

  const loadData = useCallback(async (uid: string) => {
    const [{ data: lsns }, { data: kids }] = await Promise.all([
      supabase
        .from("lessons")
        .select("*")
        .eq("created_by", uid)
        .order("created_at", { ascending: false }),
      supabase.from("children").select("id,name,grade").eq("parent_id", uid),
    ]);
    setLessons(lsns || []);
    setChildren(kids || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/parent/login");
        return;
      }
      setUserId(session.user.id);
      loadData(session.user.id);
    });
  }, [loadData, router]);

  async function handleAssign(childId: string) {
    if (!assignModal.lesson) return;
    setAssigning(true);
    try {
      const lesson = assignModal.lesson;

      // Lấy bài cùng subject + grade, sắp theo order_num
      const { data: allLessons } = await supabase
        .from("lessons")
        .select("*")
        .eq("subject", lesson.subject)
        .eq("grade", lesson.grade)
        .order("order_num");

      const lessonIndex = (allLessons || []).findIndex(
        (l: any) => l.id === lesson.id,
      );

      let newStatus = "locked";
      if (lessonIndex === 0) {
        newStatus = "available";
      } else if (lessonIndex > 0) {
        const prevLesson = (allLessons || [])[lessonIndex - 1];
        const { data: prevProgress } = await supabase
          .from("child_lesson_progress")
          .select("status")
          .eq("child_id", childId)
          .eq("lesson_id", prevLesson.id)
          .maybeSingle();
        if (prevProgress?.status === "done") newStatus = "available";
      }

      // Ghi vào child_lesson_progress
      const { error: progError } = await supabase
        .from("child_lesson_progress")
        .upsert(
          {
            child_id: childId,
            lesson_id: lesson.id,
            status: newStatus,
            stars: 0,
          },
          { onConflict: "child_id,lesson_id" },
        );
      if (progError) throw progError;

      // Ghi vào assignments (type="lesson") để journey hiển thị đúng môn
      const { error: asgError } = await supabase.from("assignments").upsert(
        {
          child_id: childId,
          lesson_id: lesson.id,
          title: lesson.title,
          type: "lesson",
          status: "pending",
        },
        { onConflict: "child_id,lesson_id" },
      );
      if (asgError) throw asgError;

      toast.success(`✅ Đã gán bài "${lesson.title}" cho con!`);
      setAssignModal({ open: false, lesson: null });
    } catch (err) {
      toast.error("Lỗi gán bài học!");
      console.error(err);
    } finally {
      setAssigning(false);
    }
  }

  async function handleDelete(lessonId: string) {
    if (!confirm("Xóa bài học này? Hành động này không thể hoàn tác.")) return;
    try {
      const { error } = await supabase
        .from("lessons")
        .delete()
        .eq("id", lessonId);
      if (error) throw error;
      setLessons((prev) => prev.filter((l) => l.id !== lessonId));
      toast.success("Đã xóa bài học!");
    } catch (err) {
      toast.error("Lỗi xóa bài học!");
      console.error(err);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-5xl animate-bounce">📚</div>
      </div>
    );

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="page-header">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="font-display font-black text-xl flex-1">
          Bài học của tôi
        </h1>
        <Link
          href="/parent/create-lesson"
          className="bg-blue-500 text-white rounded-2xl px-4 py-2 font-extrabold text-sm flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-blue-200"
        >
          <Plus className="w-4 h-4" /> Tạo bài
        </Link>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-3 max-w-2xl mx-auto">
        {lessons.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-5xl mb-3">📭</div>
            <p className="font-extrabold text-slate-600 text-lg">
              Chưa có bài học nào
            </p>
            <p className="text-slate-400 text-sm mt-1 mb-4">
              Tạo bài học đầu tiên cho con của bạn
            </p>
            <Link
              href="/parent/create-lesson"
              className="inline-block bg-blue-500 text-white rounded-2xl px-6 py-3 font-extrabold text-sm active:scale-95 transition-all"
            >
              🚀 Tạo bài học
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">
              {lessons.length} bài học
            </p>
            {lessons.map((lesson) => (
              <div key={lesson.id} className="card space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-display font-black text-slate-800 text-base mb-1">
                      {lesson.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                      <span className="px-2 py-1 bg-slate-100 rounded-lg">
                        {lesson.subject}
                      </span>
                      <span className="px-2 py-1 bg-slate-100 rounded-lg">
                        Lớp {lesson.grade}
                      </span>
                      <span className="px-2 py-1 bg-slate-100 rounded-lg">
                        {lesson.level}
                      </span>
                      {lesson.chapter && (
                        <span className="px-2 py-1 bg-slate-100 rounded-lg">
                          {lesson.chapter}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAssignModal({ open: true, lesson })}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-extrabold text-sm bg-green-100 text-green-700 border-2 border-green-300 active:scale-95 transition-all"
                  >
                    <Share2 className="w-4 h-4" /> Gán cho con
                  </button>
                  <button
                    onClick={() => handleDelete(lesson.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-extrabold text-sm bg-red-100 text-red-700 border-2 border-red-200 active:scale-95 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Assign Modal */}
      {assignModal.open && assignModal.lesson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full max-h-96 overflow-y-auto">
            <h2 className="font-display font-black text-xl text-slate-800 mb-4">
              Gán bài:{" "}
              <span className="text-blue-600">{assignModal.lesson.title}</span>
            </h2>
            <div className="space-y-2 mb-6">
              {children.length === 0 ? (
                <p className="text-slate-500 text-sm font-semibold text-center py-4">
                  Chưa có con nào. Thêm con trước nhé!
                </p>
              ) : (
                children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => handleAssign(child.id)}
                    disabled={assigning}
                    className="w-full px-4 py-3 rounded-2xl font-extrabold text-sm text-left border-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95 transition-all disabled:opacity-50"
                  >
                    👶 {child.name}{" "}
                    <span className="text-xs opacity-70">
                      (Lớp {child.grade})
                    </span>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setAssignModal({ open: false, lesson: null })}
              className="w-full py-3 rounded-2xl font-extrabold text-sm bg-slate-100 text-slate-700 border-2 border-slate-200 active:scale-95 transition-all"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      <ParentBottomNav />
    </div>
  );
}