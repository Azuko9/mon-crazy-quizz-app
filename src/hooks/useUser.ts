"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabaseClient";
import type { User } from "@supabase/supabase-js";

interface UseUserResult {
  user: User | null;
}

export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Récupère le user à l'initialisation
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
    });

    // Écoute les changements de session (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return { user };
}

