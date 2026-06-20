import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ confirmation: z.literal("탈퇴합니다") }).parse)
  .handler(async ({ context }) => {
    const { userId } = context;

    const { error: trainerError } = await supabaseAdmin
      .from("trainers")
      .delete()
      .eq("user_id", userId);
    if (trainerError) throw new Error("트레이너 데이터를 삭제하지 못했습니다.");

    const { error: rosterError } = await supabaseAdmin
      .from("student_rosters")
      .delete()
      .eq("student_user_id", userId);
    if (rosterError) throw new Error("회원 연결 데이터를 삭제하지 못했습니다.");

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) throw new Error("계정을 삭제하지 못했습니다.");

    return { ok: true };
  });
