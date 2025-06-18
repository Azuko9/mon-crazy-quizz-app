"use client";
import { useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
    const router = useRouter();

    useEffect(() => {
        async function signOut() {
            await supabase.auth.signOut();
            router.replace("/login");
        }
        signOut();
    }, [router]);

    return (
        <main className="min-h-screen flex items-center justify-center">
            <span>Déconnexion…</span>
        </main>
    );
}
