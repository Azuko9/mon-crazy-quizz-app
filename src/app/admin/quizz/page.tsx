"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { useSession } from "@supabase/auth-helpers-react";

export interface Quiz {
    id: string;
    title: string;
    comment?: string;
    media_url?: string;
    created_at: string;
}
export interface Round {
    id: string;
    quiz_id: string;
    title: string;
    round_number: number;
    media_url?: string;
}

const mediaBaseUrl = "https://dymlzeksephksntjgtms.supabase.co/storage/v1/object/public/medias/";

export default function AdminQuizListPage() {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [roundsByQuiz, setRoundsByQuiz] = useState<{ [quizId: string]: Round[] }>({});
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const session = useSession();

    // 1. Sécurité (redirige login si pas loggé)
    useEffect(() => {
        if (session === null) {
            router.replace("/login");
        }
    }, [session, router]);

    // 2. Fetch quiz et rounds, uniquement si session ok
    useEffect(() => {
        if (!session) return;
        (async function fetchQuizzes() {
            setLoading(true);
            const { data: quizzData } = await supabase
                .from("quizz")
                .select("*")
                .order("created_at", { ascending: false });
            setQuizzes(quizzData || []);
            const ids = (quizzData || []).map((q: Quiz) => q.id);
            if (ids.length > 0) {
                const { data: roundsData } = await supabase
                    .from("rounds")
                    .select("*")
                    .in("quiz_id", ids)
                    .order("round_number");
                const byQuiz: { [quizId: string]: Round[] } = {};
                (roundsData || []).forEach((r: Round) => {
                    byQuiz[r.quiz_id] = byQuiz[r.quiz_id] || [];
                    byQuiz[r.quiz_id].push(r);
                });
                setRoundsByQuiz(byQuiz);
            }
            setLoading(false);
        })();
    }, [session]);

    // 3. Suppression en cascade
    async function handleDeleteQuiz(quiz_id: string) {
        if (!window.confirm("Supprimer ce quiz, toutes ses manches, questions et parties liées ?")) return;

        const { data: rounds } = await supabase.from("rounds").select("id").eq("quiz_id", quiz_id);
        if (rounds && rounds.length > 0) {
            const roundIds = rounds.map((r: { id: string }) => r.id);
            await supabase.from("questions").delete().in("round_id", roundIds);
        }
        await supabase.from("rounds").delete().eq("quiz_id", quiz_id);

        const { data: games } = await supabase.from("games").select("id").eq("quiz_id", quiz_id);
        if (games && games.length > 0) {
            const gameIds = games.map((g: { id: string }) => g.id);
            await supabase.from("players").delete().in("game_id", gameIds);
            await supabase.from("answers").delete().in("game_id", gameIds);
            await supabase.from("games").delete().in("id", gameIds);
        }
        await supabase.from("quizz").delete().eq("id", quiz_id);

        setQuizzes(quizzes.filter(q => q.id !== quiz_id));
        const newRounds = { ...roundsByQuiz };
        delete newRounds[quiz_id];
        setRoundsByQuiz(newRounds);
    }

    // 4. Déconnexion admin
    async function handleLogout() {
        await supabase.auth.signOut();
        router.replace("/login");
    }

    if (session === undefined) {
        return <div className="p-10 text-center">Chargement de la session…</div>;
    }
    if (session === null) {
        return <div className="p-10 text-center text-red-500">Redirection…</div>;
    }

    return (
        <main className="p-10 max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Gestion des quiz</h1>
                <div className="flex flex-col items-end">
                    <span className="text-sm text-gray-700 mb-1">
                        {session.user.email}
                    </span>
                    <button
                        onClick={handleLogout}
                        className="text-red-600 underline text-sm hover:text-red-800"
                    >
                        Déconnexion
                    </button>
                </div>
            </div>
            <button
                className="bg-blue-700 text-white px-6 py-2 rounded mr-3 mb-6"
                onClick={() => router.push("/admin/quizz/new")}
            >
                + Créer un nouveau quiz
            </button>
            {loading ? (
                <div>Chargement…</div>
            ) : (
                <ul>
                    {quizzes.map(q => {
                        const quizIllu = q.media_url
                            ? (q.media_url.startsWith("http") ? q.media_url : mediaBaseUrl + q.media_url)
                            : null;
                        const rounds = roundsByQuiz[q.id] || [];
                        return (
                            <li key={q.id} className="mb-8 border p-4 rounded">
                                <div className="flex items-center gap-4 mb-3">
                                    {quizIllu ? (
                                        <img src={quizIllu} alt="illust" className="w-16 h-16 object-cover rounded shadow" />
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
                                        <button
                                            className="bg-blue-600 text-white px-3 py-1 rounded"
                                            onClick={async () => {
                                                const { data, error } = await supabase
                                                    .from("games")
                                                    .insert([{ quiz_id: q.id, status: "waiting", created_at: new Date() }])
                                                    .select()
                                                    .single();
                                                if (error) {
                                                    alert("Erreur création partie : " + error.message);
                                                    return;
                                                }
                                                router.push(`/game/admin/${data.id}`);
                                            }}
                                        >
                                            Lancer ce quiz
                                        </button>
                                    </div>
                                </div>
                                {/* Liste des manches avec illustration */}
                                <ul className="pl-3">
                                    {rounds.map((r) => {
                                        const roundIllu = r.media_url
                                            ? (r.media_url.startsWith("http") ? r.media_url : mediaBaseUrl + r.media_url)
                                            : null;
                                        return (
                                            <li key={r.id} className="flex items-center gap-2 mb-2">
                                                {roundIllu ? (
                                                    <img src={roundIllu} alt="illu-manche" className="w-10 h-10 object-cover rounded" />
                                                ) : (
                                                    <div className="w-10 h-10 bg-gray-200 flex items-center justify-center rounded text-gray-400 text-xs">
                                                        <span>—</span>
                                                    </div>
                                                )}
                                                <span className="font-semibold">Manche {r.round_number} :</span>
                                                <span className="ml-1">{r.title}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </li>
                        );
                    })}
                </ul>
            )}
        </main>
    );
}




