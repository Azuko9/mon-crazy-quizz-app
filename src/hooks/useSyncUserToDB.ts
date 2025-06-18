"use client";
import { useEffect } from "react";
import { createClient } from "@/utils/supabaseClient";
import { useUser } from "./useUser";

export function useSyncUserToDB() {
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      const supabase = createClient();
      supabase.from("users").upsert([
        {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
          avatar_url: user.user_metadata?.avatar_url,
        },
      ]);
    }
  }, [user]);
}


