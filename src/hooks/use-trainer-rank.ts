import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTrainerRank } from "@/lib/trainer-ranking";

export function useTrainerRank(trainerId?: string | null) {
  const [rank, setRank] = useState<1 | 2 | 3 | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!trainerId) {
      setRank(null);
      return;
    }

    void supabase
      .from("trainers")
      .select("id,created_at")
      .then(({ data }) => {
        if (!cancelled) setRank(getTrainerRank(data ?? [], trainerId));
      });

    return () => {
      cancelled = true;
    };
  }, [trainerId]);

  return rank;
}
