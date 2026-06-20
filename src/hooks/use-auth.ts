import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { pickDisplayName } from "@/lib/display-name";

const VIRTUAL_KEY = "gympt-user";

function withSafeUserName(user: User | null): User | null {
  if (!user) return null;
  const metadata = user.user_metadata ?? {};
  const safeName = pickDisplayName(
    metadata.name,
    metadata.full_name,
    user.email?.split("@")[0],
  );
  if (!safeName) return user;

  return {
    ...user,
    user_metadata: { ...metadata, name: safeName, full_name: safeName },
  };
}

function readVirtual(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(VIRTUAL_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return withSafeUserName({
      id: `virtual-${v.email || v.name || "user"}`,
      email: v.email,
      user_metadata: { name: v.name, avatar_url: v.avatar, role: v.role },
      app_metadata: {},
      aud: "virtual",
      created_at: new Date().toISOString(),
    } as unknown as User);
  } catch {
    return null;
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(() => readVirtual());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(withSafeUserName(s?.user ?? readVirtual()));
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(withSafeUserName(data.session?.user ?? readVirtual()));
      setLoading(false);
    });
    // listen to manual virtual login changes
    const onStorage = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(withSafeUserName(data.session?.user ?? readVirtual()));
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
