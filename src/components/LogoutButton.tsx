"use client";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

export default function LogoutButton() {
    const router = useRouter();
    const supabase = useSupabaseClient();

    async function handleLogout() {
        await supabase.auth.signOut();
        router.replace("/login");
    }

    return (
        <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded"
        >
            Déconnexion
        </button>
    );
}

