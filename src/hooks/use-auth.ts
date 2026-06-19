import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const VIRTUAL_KEY = "gympt-user";

function readVirtual(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(VIRTUAL_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return {
      id: `virtual-${v.email || v.name || "user"}`,
      email: v.email,
      user_metadata: { name: v.name, avatar_url: v.avatar, role: v.role },
      app_metadata: {},
      aud: "virtual",
      created_at: new Date().toISOString(),
    } as unknown as User;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? readVirtual());
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? readVirtual());
      setLoading(false);
    });
    // listen to manual virtual login changes
    const onStorage = () => {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setUser(data.session?.user ?? readVirtual());
      });
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("gympt-auth", onStorage);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("gympt-auth", onStorage);
    };
  }, []);

  return { session, user, loading };
}
