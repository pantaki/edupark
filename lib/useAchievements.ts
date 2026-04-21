"use client";
// lib/useAchievements.ts — Achievement checker + awarder

import { useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface CheckContext {
  childId: string;
  subject?: string;
  accuracy?: number;
  stars?: number;
  comboMax?: number;
}

// Lightweight client-side achievement check after each lesson/quiz
export function useAchievements() {

  const check = useCallback(async (ctx: CheckContext) => {
    const { childId, subject, accuracy = 0, stars = 0, comboMax = 0 } = ctx;

    // Fetch child's current progress + existing achievements
    const [{ data: progress }, { data: sessions }, { data: earned }, { data: allAchs }] = await Promise.all([
      supabase.from("progress").select("*").eq("child_id", childId),
      supabase.from("quiz_sessions").select("id,subject,score,total").eq("child_id", childId),
      supabase.from("child_achievements").select("achievement_id").eq("child_id", childId),
      supabase.from("achievements").select("*"),
    ]);

    const earnedIds = new Set((earned || []).map((e: { achievement_id: string }) => e.achievement_id));
    const toAward: string[] = [];

    // Derived stats
    const totalXpBySubject: Record<string, number> = {};
    const accuracyBySubject: Record<string, number> = {};
    const maxStreakBySubject: Record<string, number> = {};

    for (const p of (progress || [])) {
      totalXpBySubject[p.subject]       = (totalXpBySubject[p.subject] || 0) + (p.xp || 0);
      accuracyBySubject[p.subject]      = p.accuracy || 0;
      maxStreakBySubject[p.subject]     = Math.max(maxStreakBySubject[p.subject] || 0, p.streak || 0);
    }

    const doneLessonsBySubject: Record<string, number> = {};
    for (const s of (sessions || [])) {
      if (!doneLessonsBySubject[s.subject]) doneLessonsBySubject[s.subject] = 0;
      doneLessonsBySubject[s.subject]++;
    }

    const highAccuracyCountBySubject: Record<string, number> = {};
    for (const s of (sessions || [])) {
      const acc = s.total > 0 ? (s.score / s.total) * 100 : 0;
      if (acc >= 80) {
        if (!highAccuracyCountBySubject[s.subject]) highAccuracyCountBySubject[s.subject] = 0;
        highAccuracyCountBySubject[s.subject]++;
      }
    }

    const perfectCountBySubject: Record<string, number> = {};
    for (const s of (sessions || [])) {
      if (s.score === s.total && s.total > 0) {
        if (!perfectCountBySubject[s.subject]) perfectCountBySubject[s.subject] = 0;
        perfectCountBySubject[s.subject]++;
      }
    }

    const allSubjects = ["math","viet","eng","science"];
    const doneAllSubjects = allSubjects.every(sub => (doneLessonsBySubject[sub] || 0) >= 1);
    const globalMaxStreak  = Math.max(0, ...Object.values(maxStreakBySubject));

    for (const ach of (allAchs || [])) {
      if (earnedIds.has(ach.id)) continue;
      const cond = ach.condition as Record<string, number | string> | null;
      if (!cond) continue;

      let shouldAward = false;

      switch (cond.type) {
        case "lessons_done":
          shouldAward = (doneLessonsBySubject[cond.subject as string] || 0) >= Number(cond.value);
          break;
        case "accuracy":
          shouldAward = (highAccuracyCountBySubject[cond.subject as string] || 0) >= Number(cond.count || 1)
            && (accuracyBySubject[cond.subject as string] || 0) >= Number(cond.value);
          break;
        case "perfect":
          shouldAward = (perfectCountBySubject[cond.subject as string] || 0) >= Number(cond.streak || 1);
          break;
        case "xp":
          shouldAward = (totalXpBySubject[cond.subject as string] || 0) >= Number(cond.value);
          break;
        case "streak":
          shouldAward = globalMaxStreak >= Number(cond.value);
          break;
        case "all_subjects":
          shouldAward = doneAllSubjects;
          break;
        case "stars3":
          shouldAward = stars >= 3;
          break;
        case "combo":
          shouldAward = comboMax >= Number(cond.value);
          break;
        case "chat_sent": {
          const { count } = await supabase.from("messages")
            .select("*", { count: "exact", head: true })
            .eq("from_child", childId);
          shouldAward = (count || 0) >= Number(cond.value);
          break;
        }
        case "assignment_done": {
          const { count } = await supabase.from("assignments")
            .select("*", { count: "exact", head: true })
            .eq("child_id", childId).eq("status", "done");
          shouldAward = (count || 0) >= Number(cond.value);
          break;
        }
      }

      if (shouldAward) toAward.push(ach.id);
    }

    // Award all in one batch
    if (toAward.length > 0) {
      await supabase.from("child_achievements").insert(
        toAward.map(id => ({ child_id: childId, achievement_id: id }))
      );

      // Toast notifications (staggered)
      for (let i = 0; i < toAward.length; i++) {
        const ach = (allAchs || []).find((a: { id: string }) => a.id === toAward[i]);
        if (!ach) continue;
        setTimeout(() => {
          toast(`🏆 Huy hiệu mới: ${ach.emoji} ${ach.name}!`, {
            duration: 5000,
            style: {
              background: "linear-gradient(to right, #a855f7, #ec4899)",
              color: "white",
              fontWeight: 800,
              borderRadius: "16px",
            },
          });
        }, i * 800);
      }

      return toAward;
    }
    return [];
  }, []);

  return { check };
}