"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function NewGamePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const quiz_id = searchParams.get("quiz_id");

    const [creating, setCreating] = useState<boolean>(false);

    useEffect(() => {
        if (!quiz_id) router.push("/admin/quizz");
    }, [quiz_id, router]);

    async function handleCreateGame() {
        if (!quiz_id) return;
        setCreating(true);
        const { data: game, error } = await supabase.from("games")
            .insert([{ quiz_id, status: "waiting", current_round_index: 0, current_question_index: -1, created_at: new Date() }])
            .select()
            .single();
        setCreating(false);
        if (error) {
            alert("Erreur : " + error.message);
        } else if (game) {
            router.push(`/admin/game/${game.id}`);
        }
    }

    return (
        <main className="p-12 text-center">
            <h1 className="text-2xl font-bold mb-4">Lancer une partie</h1>
            <button
                className="bg-green-600 text-white px-6 py-3 rounded text-lg font-bold"
                onClick={handleCreateGame}
                disabled={creating}
            >
                {creating ? "Création..." : "Lancer la partie"}
            </button>
        </main>
    );
}
