"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";


const mediaBaseUrl = "https://dymlzeksephksntjgtms.supabase.co/storage/v1/object/public/medias/";

export default function AdminQuizListPage() {
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [roundsByQuiz, setRoundsByQuiz] = useState<{ [quizId: string]: any[] }>({});
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchQuizzes();
        async function fetchQuizzes() {
            setLoading(true);
            const { data: quizzData } = await supabase.from("quizz").select("*").order("created_at", { ascending: false });
            setQuizzes(quizzData || []);
            // Pour chaque quiz, fetch ses rounds (pour récupérer la première illustration éventuelle)
            const ids = (quizzData || []).map((q: any) => q.id);
            if (ids.length > 0) {
                const { data: roundsData } = await supabase.from("rounds").select("*").in("quiz_id", ids);
                // On regroupe par quiz_id
                const byQuiz: { [quizId: string]: any[] } = {};
                (roundsData || []).forEach((r: any) => {
                    byQuiz[r.quiz_id] = byQuiz[r.quiz_id] || [];
                    byQuiz[r.quiz_id].push(r);
                });
                setRoundsByQuiz(byQuiz);
            }
            setLoading(false);
        }
    }, []);

    // ... (handleDeleteQuiz: idem que version précédente, non modifié)

    // Suppression cascade identique à la version précédente ici...
    async function handleDeleteQuiz(quiz_id: string) {
        if (!window.confirm("Supprimer ce quiz, toutes ses manches, questions et parties liées ?")) return;

        const { data: rounds } = await supabase.from("rounds").select("id").eq("quiz_id", quiz_id);
        if (rounds && rounds.length > 0) {
            const roundIds = rounds.map((r: any) => r.id);
            await supabase.from("questions").delete().in("round_id", roundIds);
        }
        await supabase.from("rounds").delete().eq("quiz_id", quiz_id);

        const { data: games } = await supabase.from("games").select("id").eq("quiz_id", quiz_id);
        if (games && games.length > 0) {
            const gameIds = games.map((g: any) => g.id);
            await supabase.from("players").delete().in("game_id", gameIds);
            await supabase.from("answers").delete().in("game_id", gameIds);
            await supabase.from("games").delete().in("id", gameIds);
        }

        await supabase.from("quizz").delete().eq("id", quiz_id);

        setQuizzes(quizzes.filter(q => q.id !== quiz_id));
        // Et on enlève les rounds du state aussi
        const newRounds = { ...roundsByQuiz };
        delete newRounds[quiz_id];
        setRoundsByQuiz(newRounds);
    }

    return (
        <main className="p-10 max-w-xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Gestion des quiz</h1>
            <button className="bg-blue-700 text-white px-6 py-2 rounded mr-3 mb-6" onClick={() => router.push("/admin/quizz/new")}>
                + Créer un nouveau quiz
            </button>
            {loading ? <div>Chargement…</div> : (
                <ul>
                    {quizzes.map(q => {
                        // On prend la première manche du quiz comme source d'illustration
                        const rounds = roundsByQuiz[q.id] || [];
                        const firstRound = rounds[0];
                        let illustration = "";
                        if (firstRound && firstRound.media_url) {
                            illustration = firstRound.media_url.startsWith("http")
                                ? firstRound.media_url
                                : mediaBaseUrl + firstRound.media_url;
                        }
                        return (
                            <li key={q.id} className="mb-4 border p-3 rounded flex items-center justify-between gap-4">
                                {illustration ? (
                                    <img src={illustration} alt="illust" className="w-16 h-16 object-cover rounded shadow" />
                                ) : (
                                    <div className="w-16 h-16 bg-gray-200 flex items-center justify-center rounded text-gray-400">
                                        <span>Aucune<br />image</span>
                                    </div>
                                )}
                                <div className="flex-1">
                                    <b>{q.title}</b>
                                    <div className="text-sm text-gray-500">{q.comment}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        className="bg-green-700 text-white px-3 py-1 rounded"
                                        onClick={() => router.push(`/admin/quizz/${q.id}/edit`)}
                                    >
                                        Modifier
                                    </button>
                                    <button
                                        className="bg-red-600 text-white px-3 py-1 rounded"
                                        onClick={() => handleDeleteQuiz(q.id)}
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </main>
    );
}

