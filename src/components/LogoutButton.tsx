// src/components/LogoutButton.tsx
"use client";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";

export function LogoutButton() {
    const router = useRouter();
    async function handleLogout() {
        await supabase.auth.signOut();
        router.replace("/login");
    }
    return (
        <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded">
            Déconnexion
        </button>
    );
}
