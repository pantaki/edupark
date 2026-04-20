"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAppStore } from "@/lib/store";
import { AVATAR_EMOJI } from "@/lib/utils";
import { toast } from "sonner";
import { Copy, Crown, Play, Timer, Trophy, ArrowLeft } from "lucide-react";
import { Suspense } from "react";

interface Player { id: string; display_name: string; avatar: string; score: number; }
interface Question { id: string; question: string; options: string[]; correct: string; order_num: number; }
interface Room { id: string; code: string; host_id: string | null; quiz_id: string | null; status: string; current_question: number; }

const BUILT_IN_QUESTIONS: Question[] = [
  { id: "q1", question: "5 + 7 = ?", options: ["10", "11", "12", "13"], correct: "12", order_num: 0 },
  { id: "q2", question: "3 × 4 = ?", options: ["10", "11", "12", "14"], correct: "12", order_num: 1 },
  { id: "q3", question: "Trái Đất có mấy mặt trăng?", options: ["0", "1", "2", "3"], correct: "1", order_num: 2 },
  { id: "q4", question: "Con vật nào biết bay?", options: ["Chó", "Mèo", "Chim", "Cá"], correct: "Chim", order_num: 3 },
  { id: "q5", question: "9 × 9 = ?", options: ["72", "81", "90", "99"], correct: "81", order_num: 4 },
];

const TIMER_SECONDS = 20;

function RoomContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { childSession } = useAppStore();
  const code = params.code as string;
  const playerName = searchParams.get("name") || "Khách";
  const isHostParam = searchParams.get("host") === "1";
  // isHost: either URL param set, or player name matches the host in DB (checked after room loads)
  const [isHost, setIsHost] = useState(isHostParam);

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [timer, setTimer] = useState(TIMER_SECONDS);
  const [myScore, setMyScore] = useState(0);
  const [phase, setPhase] = useState<
    "waiting" | "playing" | "question" | "finished"
  >("waiting");
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update progress when room finishes
  const updateProgressOnFinish = useCallback(async () => {
    if (!childSession || !room || !questions.length) return;

    const myPlayer = players.find((p) => p.display_name === playerName);
    if (!myPlayer) {
      console.log("Player not found in players list");
      return;
    }

    console.log("📊 Quiz room: childSession.id =", childSession.id, "| subject:", searchParams.get("subject") || "math", "| score:", myScore);

    // Calculate accuracy: score / total possible points
    // Each question max: 100 base + 100 bonus = 200 total
    const maxScore = questions.length * 200;
    const accuracy = Math.min(100, Math.round((myScore / maxScore) * 100));
    const xpEarned = Math.round(myScore / 10); // Convert score to XP
    const streak = accuracy >= 70 ? 1 : 0; // Increment streak if good accuracy

    // Default subject if not in URL or derived from quiz
    const subject = searchParams.get("subject") || "math";

    // Check if progress exists for this child and subject
    const { data: existing, error: getError } = await supabase
      .from("progress")
      .select("id,xp,streak,correct_questions,total_questions")
      .eq("child_id", childSession.id)
      .eq("subject", subject)
      .maybeSingle();

    if (getError) {
      console.error("Error fetching quiz room progress:", getError);
      return;
    }

    if (existing) {
      // Update: accumulate xp, take max streak, and count correct answers
      const numCorrect = accuracy >= 50 ? 1 : 0; // Count as correct if ≥50% accuracy
      const newCorrect = (existing.correct_questions || 0) + numCorrect;
      const { error: updateError } = await supabase
        .from("progress")
        .update({
          accuracy: accuracy,
          streak: Math.max(existing.streak || 0, streak),
          xp: (existing.xp || 0) + xpEarned,
          correct_questions: newCorrect,
          total_questions: (existing.total_questions || 0) + questions.length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updateError)
        console.error("Quiz room progress update error:", updateError);
      else
        console.log(
          "Quiz room progress updated for",
          subject,
          "| correct:",
          newCorrect,
          "| xp:",
          (existing.xp || 0) + xpEarned,
        );
    } else {
      // Insert new progress record
      console.log("🆕 Inserting new quiz room progress:", {
        child_id: childSession.id,
        subject,
        accuracy,
        streak,
        xp: xpEarned,
      });

      const { data: insertData, error: insertError } = await supabase
        .from("progress")
        .insert({
          child_id: childSession.id,
          subject,
          accuracy: accuracy,
          streak: streak,
          xp: xpEarned,
          correct_questions: accuracy >= 50 ? 1 : 0,
          total_questions: questions.length,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (insertError)
        console.error("❌ Quiz room progress insert error:", insertError);
      else
        console.log(
          "✅ Quiz room progress inserted for",
          subject,
          "| data:",
          insertData,
        );
    }

    // Also save to quiz_sessions for history
    const { error: sessionError } = await supabase
      .from("quiz_sessions")
      .insert({
        child_id: childSession.id,
        subject,
        score: Math.ceil((myScore / (questions.length * 2)) * 100),
        total: 100,
      });
    if (sessionError) console.error("Quiz room session error:", sessionError);
  }, [
    childSession,
    room,
    players,
    questions,
    playerName,
    searchParams,
    myScore,
  ]);

  const loadRoom = useCallback(async () => {
    const { data: r } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();
    if (!r) {
      toast.error("Không tìm thấy phòng!");
      router.replace("/quiz/join");
      return;
    }
    setRoom(r);
    if (r.status === "playing") setPhase("playing");
    if (r.status === "finished") setPhase("finished");

    // Load questions
    let qs = BUILT_IN_QUESTIONS;
    if (r.quiz_id) {
      const { data: dbQs } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", r.quiz_id)
        .order("order_num");
      if (dbQs && dbQs.length > 0) qs = dbQs;
    }
    setQuestions(qs);
    setQi(r.current_question || 0);

    // Load players + find my player
    const { data: ps } = await supabase
      .from("room_players")
      .select("*")
      .eq("room_id", r.id)
      .order("score", { ascending: false });
    setPlayers(ps || []);
    const me = ps?.find((p: Player) => p.display_name === playerName);
    if (me) {
      setMyPlayerId(me.id);
      setMyScore(me.score);
    }

    // Verify host: check if current user's auth uid matches host_id
    const session = await supabase.auth.getSession();
    const uid = session.data.session?.user.id;
    if (uid && r.host_id && uid === r.host_id) {
      setIsHost(true);
    }
  }, [code, playerName, router]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // Realtime: room status changes
  useEffect(() => {
    if (!room) return;
    const ch = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          const r = payload.new as Room;
          setRoom(r);
          if (r.status === "playing") {
            setPhase("playing");
            setQi(r.current_question);
            startTimer();
          }
          if (r.status === "finished") {
            setPhase("finished");
            // Update progress when game finishes
            updateProgressOnFinish();
          }
          if (r.current_question !== qi) {
            setQi(r.current_question);
            resetQuestion();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_id=eq.${room.id}`,
        },
        async () => {
          const { data: ps } = await supabase
            .from("room_players")
            .select("*")
            .eq("room_id", room.id)
            .order("score", { ascending: false });
          setPlayers(ps || []);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [room, qi, updateProgressOnFinish]);

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleTimeUp();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function resetQuestion() {
    setSelected(null);
    setAnswered(false);
    startTimer();
  }

  function handleTimeUp() {
    if (!answered) {
      setAnswered(true);
      toast("⏰ Hết giờ rồi!");
    }
  }

  async function handleAnswer(opt: string) {
    if (answered || phase !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(opt);
    setAnswered(true);
    const q = questions[qi];
    const correct = opt === q?.correct;
    if (correct && myPlayerId) {
      const bonus = Math.round((timer / TIMER_SECONDS) * 100);
      const pts = 100 + bonus;
      const newScore = myScore + pts;
      setMyScore(newScore);
      await supabase
        .from("room_players")
        .update({ score: newScore })
        .eq("id", myPlayerId);
      toast.success(`+${pts} điểm! ⚡`);
    }
  }

  async function startGame() {
    if (!room || !isHost) return;
    await supabase
      .from("rooms")
      .update({
        status: "playing",
        current_question: 0,
        started_at: new Date().toISOString(),
      })
      .eq("id", room.id);
    setPhase("playing");
    setQi(0);
    startTimer();
  }

  async function nextQuestion() {
    if (!room || !isHost) return;
    const nextQi = qi + 1;
    if (nextQi >= questions.length) {
      await supabase
        .from("rooms")
        .update({ status: "finished" })
        .eq("id", room.id);
      setPhase("finished");
    } else {
      await supabase
        .from("rooms")
        .update({ current_question: nextQi })
        .eq("id", room.id);
      setQi(nextQi);
      resetQuestion();
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(code);
    toast.success(`Đã copy mã phòng ${code}! 📋`);
  }

  const q = questions[qi];
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const timerPct = (timer / TIMER_SECONDS) * 100;
  const timerColor =
    timer > 10 ? "bg-green-500" : timer > 5 ? "bg-yellow-500" : "bg-red-500";

  // WAITING ROOM
  if (phase === "waiting")
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "linear-gradient(160deg,#8b5cf6,#ec4899)" }}
      >
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {/* Back button */}
          <div className="w-full max-w-sm mb-2">
            <button
              onClick={() => router.replace("/quiz/join")}
              className="flex items-center gap-2 text-white/80 font-bold hover:text-white transition-colors active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" /> Quay lại
            </button>
          </div>

          <h1 className="font-display text-3xl font-black text-white mb-2">
            Phòng chờ 🎮
          </h1>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-white/20 backdrop-blur rounded-2xl px-6 py-3 border-2 border-white/30">
              <p className="text-white/70 text-xs font-bold mb-1 text-center">
                MÃ PHÒNG
              </p>
              <p className="font-display font-black text-3xl text-white tracking-widest">
                {code}
              </p>
            </div>
            <button
              onClick={copyCode}
              className="bg-white/20 rounded-2xl p-3 border-2 border-white/30 active:scale-90 transition-all"
            >
              <Copy className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="w-full max-w-sm bg-white/15 backdrop-blur rounded-3xl p-4 border-2 border-white/20 mb-6">
            <h2 className="font-display font-black text-white text-lg mb-3">
              👥 Người chơi ({players.length})
            </h2>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 bg-white/15 rounded-2xl px-3 py-2.5"
                >
                  <span className="text-2xl">
                    {AVATAR_EMOJI[p.avatar] || "😊"}
                  </span>
                  <span className="font-extrabold text-white flex-1">
                    {p.display_name}
                  </span>
                  {i === 0 && <Crown className="w-4 h-4 text-yellow-300" />}
                </div>
              ))}
            </div>
            {players.length === 0 && (
              <p className="text-white/60 text-center font-semibold py-4">
                Chờ người tham gia...
              </p>
            )}
          </div>

          {isHost ? (
            <button
              onClick={startGame}
              disabled={players.length < 1}
              className="w-full max-w-sm bg-yellow-400 text-yellow-900 font-display font-black text-xl rounded-3xl py-4 flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-yellow-500/30 disabled:opacity-50"
            >
              <Play className="w-6 h-6" /> Bắt đầu Game!
            </button>
          ) : (
            <div className="text-center">
              <div className="text-4xl mb-2 animate-bounce-slow">⏳</div>
              <p className="text-white font-extrabold text-lg">
                Chờ host bắt đầu...
              </p>
            </div>
          )}
        </div>
      </div>
    );

  // FINISHED
  if (phase === "finished")
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: "linear-gradient(160deg,#f97316,#fbbf24)" }}
      >
        <div className="text-8xl mb-4 animate-pop-in">🏆</div>
        <h1 className="font-display font-black text-4xl text-white mb-2 text-center">
          Kết thúc!
        </h1>
        <p className="text-white/80 font-bold mb-6 text-center">
          Bảng xếp hạng cuối cùng
        </p>
        <div className="w-full max-w-sm space-y-3 mb-6">
          {sortedPlayers.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-3xl px-4 py-3 border-2 ${
                i === 0
                  ? "bg-yellow-400 border-yellow-300"
                  : i === 1
                    ? "bg-white/80 border-white/50"
                    : i === 2
                      ? "bg-orange-300 border-orange-200"
                      : "bg-white/30 border-white/20"
              }`}
            >
              <span className="font-display font-black text-2xl w-8 text-center">
                {["🥇", "🥈", "🥉"][i] || `${i + 1}`}
              </span>
              <span className="text-2xl">{AVATAR_EMOJI[p.avatar] || "😊"}</span>
              <span className="flex-1 font-extrabold text-slate-800">
                {p.display_name}
              </span>
              <span className="font-display font-black text-xl text-slate-800 flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                {p.score}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={() => router.replace("/")}
          className="bg-white text-orange-600 font-display font-black text-xl rounded-3xl py-4 px-8 active:scale-95 transition-all shadow-xl"
        >
          🏠 Về trang chủ
        </button>
      </div>
    );

  // PLAYING
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Top bar */}
      <div className="bg-slate-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-display font-black text-white text-lg">
            Câu {qi + 1}/{questions.length}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-slate-700 rounded-2xl px-3 py-1.5">
          <Timer className="w-4 h-4 text-white" />
          <span
            className={`font-display font-black text-xl ${timer <= 5 ? "text-red-400 animate-pulse" : "text-white"}`}
          >
            {timer}
          </span>
        </div>
        <div className="font-extrabold text-yellow-400">⭐ {myScore}</div>
      </div>

      {/* Timer bar */}
      <div className="h-2 bg-slate-700 flex-shrink-0">
        <div
          className={`h-full ${timerColor} transition-all duration-1000`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Question */}
        <div className="bg-white rounded-4xl p-6 text-center shadow-xl">
          <p className="text-slate-400 font-extrabold text-sm uppercase tracking-wider mb-3">
            {subjectFromQ(q?.question)}
          </p>
          <p className="font-display font-black text-3xl text-slate-800 leading-tight">
            {q?.question}
          </p>
        </div>

        {/* Options */}
        {q && (
          <div className="grid grid-cols-2 gap-3">
            {q.options.map((opt, i) => {
              let cls = "bg-white border-2 border-slate-200 text-slate-800";
              if (answered) {
                if (opt === q.correct)
                  cls = "bg-green-400 border-green-400 text-white";
                else if (opt === selected)
                  cls = "bg-red-400 border-red-400 text-white";
                else cls = "bg-slate-700 border-slate-700 text-slate-500";
              }
              const COLORS = [
                "from-blue-500 to-blue-600",
                "from-orange-500 to-orange-600",
                "from-purple-500 to-purple-600",
                "from-green-500 to-green-600",
              ];
              const baseClsNotAnswered = `bg-gradient-to-br ${COLORS[i]} text-white border-0`;
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(opt)}
                  disabled={answered}
                  className={`${answered ? cls : baseClsNotAnswered} rounded-3xl py-6 px-3 font-display font-black text-xl
                    flex items-center justify-center active:scale-95 transition-all duration-150 min-h-[6rem] shadow-lg`}
                >
                  {answered && opt === q.correct && (
                    <span className="mr-1">✅</span>
                  )}
                  {answered && opt === selected && opt !== q.correct && (
                    <span className="mr-1">❌</span>
                  )}
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {/* Live leaderboard */}
        <div className="bg-slate-800 rounded-3xl p-4">
          <h3 className="font-display font-black text-white text-sm mb-3">
            🏆 Bảng xếp hạng
          </h3>
          <div className="space-y-2">
            {sortedPlayers.slice(0, 5).map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${p.display_name === playerName ? "bg-blue-600" : "bg-slate-700"}`}
              >
                <span className="text-slate-400 font-black text-sm w-5">
                  {i + 1}
                </span>
                <span className="text-lg">
                  {AVATAR_EMOJI[p.avatar] || "😊"}
                </span>
                <span className="flex-1 font-extrabold text-white text-sm truncate">
                  {p.display_name}
                </span>
                <span className="font-display font-black text-yellow-400">
                  {p.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Host controls */}
        {isHost && answered && (
          <button
            onClick={nextQuestion}
            className="btn-fun bg-gradient-to-r from-purple-500 to-pink-500 text-white animate-slide-up"
          >
            {qi + 1 >= questions.length ? "🏆 Xem kết quả" : "Câu tiếp theo ➡️"}
          </button>
        )}
        {!isHost && answered && (
          <div className="text-center py-2">
            <div className="text-3xl animate-bounce-slow">⏳</div>
            <p className="text-slate-400 font-semibold">
              Chờ host chuyển câu...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function subjectFromQ(q?: string) {
  if (!q) return "Câu hỏi";
  if (q.includes("=") || q.includes("×") || q.includes("÷") || q.includes("−")) return "🔢 Toán học";
  if (q.includes("English") || q.includes("color") || q.includes("fruit")) return "🌍 Tiếng Anh";
  return "📚 Kiến thức chung";
}

export default function RoomPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900"><div className="text-5xl animate-bounce">🎮</div></div>}>
      <RoomContent />
    </Suspense>
  );
}