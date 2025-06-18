"use client";
import { useEffect } from "react";
import { createClient } from "../utils/supabaseClient";
// Update the import path if the file is named differently or located elsewhere
// import { useUser } from "./useUser"; // <-- Make sure './useUser.ts' exists in the same folder
import { useUser } from "./useUser"; // <-- Update this path if your useUser hook is in 'src/auth/useUser.ts'

// If the file is named differently or in another directory, update the path accordingly, for example:
// import { useUser } from "../auth/useUser";

export function useSyncUserToDB() {
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      const supabase = createClient();
      supabase.from("users").upsert([
        {
          id: user.id,
          email: user.email,
          name: user.user_metadata.full_name || user.user_metadata.name || user.email,
          avatar_url: user.user_metadata.avatar_url,
        },
      ]);
    }
  }, [user]);
}

