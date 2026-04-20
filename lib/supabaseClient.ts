import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; role: string; name: string | null; avatar: string | null; created_at: string };
        Insert: { id: string; role: string; name?: string | null; avatar?: string | null };
        Update: { role?: string; name?: string | null; avatar?: string | null };
      };
      children: {
        Row: { id: string; parent_id: string; name: string; code: string; avatar: string; grade: number; created_at: string };
        Insert: { parent_id: string; name: string; code: string; avatar?: string; grade?: number };
        Update: { name?: string; avatar?: string; grade?: number };
      };
      messages: {
        Row: { id: string; from_user: string | null; from_child: string | null; to_child: string | null; content: string; type: string; created_at: string };
        Insert: { from_user?: string | null; from_child?: string | null; to_child?: string | null; content: string; type?: string };
      };
      quiz_sets: {
        Row: { id: string; created_by: string; title: string; subject: string; grade: number; is_public: boolean; created_at: string };
        Insert: { created_by: string; title: string; subject?: string; grade?: number; is_public?: boolean };
      };
      questions: {
        Row: { id: string; quiz_id: string; question: string; options: string[]; correct: string; order_num: number };
        Insert: { quiz_id: string; question: string; options: string[]; correct: string; order_num?: number };
      };
      rooms: {
        Row: { id: string; code: string; host_id: string | null; quiz_id: string | null; status: string; current_question: number; started_at: string | null; created_at: string };
        Insert: { code: string; host_id?: string | null; quiz_id?: string | null; status?: string };
        Update: { status?: string; current_question?: number; started_at?: string | null };
      };
      room_players: {
        Row: { id: string; room_id: string; user_id: string | null; child_id: string | null; display_name: string; avatar: string; score: number; answers: unknown[]; joined_at: string };
        Insert: { room_id: string; user_id?: string | null; child_id?: string | null; display_name: string; avatar?: string; score?: number };
        Update: { score?: number; answers?: unknown[] };
      };
      progress: {
        Row: { id: string; child_id: string; subject: string; accuracy: number; streak: number; total_questions: number; correct_questions: number; xp: number; updated_at: string };
        Insert: { child_id: string; subject: string; accuracy?: number; streak?: number; total_questions?: number; correct_questions?: number; xp?: number };
        Update: { accuracy?: number; streak?: number; total_questions?: number; correct_questions?: number; xp?: number; updated_at?: string };
      };
    };
  };
};
