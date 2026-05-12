import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function weekStartISO(d = new Date()) {
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // Monday as start
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
  return monday.toISOString().slice(0, 10);
}

export const getMyWeekPoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const ws = weekStartISO();
    const { data } = await supabase.from("points").select("amount, reason, created_at").eq("user_id", userId).eq("week_start", ws);
    const total = (data ?? []).reduce((s, r: { amount: number }) => s + r.amount, 0);
    return { total, items: data ?? [], weekStart: ws, cap: 10 };
  });

export const awardPoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ reason: z.enum(["empty_slot", "five_or_more"]) }).parse)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ws = weekStartISO();
    const { data: existing } = await supabase
      .from("points")
      .select("amount, reason")
      .eq("user_id", userId)
      .eq("week_start", ws);
    const total = (existing ?? []).reduce((s, r: { amount: number }) => s + r.amount, 0);
    if (total >= 10) return { awarded: 0, total, capped: true };
    const alreadySame = (existing ?? []).some((r: { reason: string }) => r.reason === data.reason);
    if (alreadySame) return { awarded: 0, total, capped: false };
    const amount = Math.min(10, 10 - total);
    const { error } = await supabase.from("points").insert({
      user_id: userId,
      amount,
      reason: data.reason,
      week_start: ws,
    });
    if (error) throw new Error(error.message);
    return { awarded: amount, total: total + amount, capped: total + amount >= 10 };
  });

export const setMyRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ role: z.enum(["trainer", "student"]) }).parse)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: data.role });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    return { role: data?.role ?? null };
  });
