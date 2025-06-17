"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";

// Base URL for media files (update this value as needed)
const mediaBaseUrl = "https://dymlzeksephksntjgtms.supabase.co/storage/v1/object/public/medias/";

export default function GameAdminPlayPage() {
    const { game_id } = useParams();
    const router = useRouter();
    const [game, setGame] = useState<any>(null);
    const [rounds, setRounds] = useState<any[]>([]);
    const [questionsByRound, setQuestionsByRound] = useState<{ [roundId: string]: any[] }>({});
    const [players, setPlayers] = useState<any[]>([]);
    const [answers, setAnswers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [timer, setTimer] = useState<number>(60);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Nouveau : score final des joueurs
    const [scores, setScores] = useState<any[]>([]);

    // --- 1. CHARGEMENT données partie ---
    useEffect(() => {
        let channel: any;
        async function fetchGameAndData() {
            setLoading(true);
            const { data: gameData } = await supabase.from("games").select("*").eq("id", game_id).single();
            setGame(gameData);
            const { data: playersData } = await supabase.from("players").select("id, pseudo").eq("game_id", game_id);
            setPlayers(playersData || []);
            if (gameData) {
                const { data: roundsData } = await supabase.from("rounds")
                    .select("*")
                    .eq("quiz_id", gameData.quiz_id)
                    .order("round_number", { ascending: true });
                setRounds(roundsData || []);
                let qbR: { [roundId: string]: any[] } = {};
                if (roundsData && roundsData.length) {
                    for (const r of roundsData) {
                        const { data: qData } = await supabase.from("questions")
                            .select("*")
                            .eq("round_id", r.id)
                            .order("id");
                        qbR[r.id] = qData || [];
                    }
                }
                setQuestionsByRound(qbR);
            }
            setLoading(false);
            channel = supabase
                .channel('game-admin-play')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'games', filter: `id=eq.${game_id}` },
                    (payload: any) => {
                        if (payload.new) setGame(payload.new);
                    }
                )
                .subscribe();
        }
        fetchGameAndData();
        return () => { channel?.unsubscribe(); };
    }, [game_id]);

    // --- 2. Ecoute answers en live pour la question courante ---
    useEffect(() => {
        let channel: any;
        async function fetchAnswers() {
            if (!game || rounds.length === 0) return;
            const roundIdx = game.current_round_index ?? 0;
            const questionIdx = game.current_question_index ?? -1;
            const currentRound = rounds[roundIdx];
            const currentQuestions = currentRound ? (questionsByRound[currentRound.id] || []) : [];
            const currentQuestion = questionIdx >= 0 ? currentQuestions[questionIdx] : null;
            if (currentQuestion) {
                const { data: ans } = await supabase
                    .from("answers")
                    .select("player_id, answer")
                    .eq("game_id", game_id)
                    .eq("question_id", currentQuestion.id);
                setAnswers(ans || []);
                channel = supabase
                    .channel('answers-live-admin')
                    .on(
                        'postgres_changes',
                        { event: '*', schema: 'public', table: 'answers', filter: `game_id=eq.${game_id}` },
                        () => {
                            supabase
                                .from("answers")
                                .select("player_id, answer")
                                .eq("game_id", game_id)
                                .eq("question_id", currentQuestion.id)
                                .then(({ data }) => setAnswers(data || []));
                        }
                    )
                    .subscribe();
            } else {
                setAnswers([]);
            }
        }
        fetchAnswers();
        return () => { channel?.unsubscribe(); };
    }, [game, rounds, questionsByRound, game_id]);

    // --- 3. Timer auto pour chaque question ---
    useEffect(() => {
        if (!game || !rounds.length) return;
        const qIdx = game.current_question_index ?? -1;
        if (qIdx >= 0) {
            setTimer(60);
            timerRef.current && clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => { timerRef.current && clearInterval(timerRef.current); };
    }, [game?.current_question_index]);

    // --- 4. Calcul du score à la fin du quiz ---
    useEffect(() => {
        async function fetchScores() {
            if (!game || !players.length) return;
            // On va chercher toutes les réponses pour cette game
            const { data: allAnswers } = await supabase
                .from("answers")
                .select("player_id,is_correct")
                .eq("game_id", game_id);
            // Calcul scores
            const scoresObj: { [id: string]: number } = {};
            for (const p of players) scoresObj[p.id] = 0;
            for (const a of allAnswers || []) {
                if (a.is_correct && a.player_id && scoresObj[a.player_id] !== undefined) {
                    scoresObj[a.player_id]++;
                }
            }
            const scoresArr = players.map(p => ({
                pseudo: p.pseudo,
                score: scoresObj[p.id] ?? 0
            })).sort((a, b) => b.score - a.score);
            setScores(scoresArr);
        }
        // Quand le quiz est terminé (plus de round) => calcule le classement
        if (game && rounds.length && (game.current_round_index >= rounds.length || !rounds[game.current_round_index])) {
            fetchScores();
        }
    }, [game, players, rounds, game_id]);

    if (loading) return <div className="p-8 text-center">Chargement…</div>;
    if (!game || !rounds.length) return <div className="p-8 text-center">Aucun quiz en cours.</div>;

    const roundIdx = game.current_round_index ?? 0;
    const questionIdx = game.current_question_index ?? -1;
    const currentRound = rounds[roundIdx];
    const currentQuestions = currentRound ? (questionsByRound[currentRound.id] || []) : [];
    const currentQuestion = questionIdx >= 0 ? currentQuestions[questionIdx] : null;

    // --- 5. FIN DU QUIZ avec score, bouton fermer, suppression, retour liste ---
    if (!currentRound) {
        return (
            <main className="p-10 text-center text-xl font-bold">
                <div className="mb-6">🎉 Fin du quiz !</div>
                <h2 className="text-2xl font-bold mb-4 text-blue-700">Classement final</h2>
                <table className="mx-auto mb-6 border">
                    <thead>
                        <tr>
                            <th className="px-6 py-2">Pseudo</th>
                            <th className="px-6 py-2">Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scores.map((s, i) => (
                            <tr key={i} className={i === 0 ? "bg-blue-950 font-bold" : ""}>
                                <td className="px-6 py-2">{s.pseudo}</td>
                                <td className="px-6 py-2">{s.score}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button
                    className="bg-blue-700 text-white px-8 py-3 rounded-lg text-xl font-bold shadow"
                    onClick={async () => {
                        // Efface toutes les réponses de cette partie
                        await supabase.from("answers").delete().eq("game_id", game_id);
                        // Efface tous les joueurs de cette partie
                        await supabase.from("players").delete().eq("game_id", game_id);

                        // Efface tous les rounds liés à ce quiz SI tu veux vraiment tout nettoyer (optionnel)
                        // (Décommente si besoin)
                        // if (game && game.quiz_id) {
                        //    await supabase.from("rounds").delete().eq("quiz_id", game.quiz_id);
                        // }

                        // Efface la partie elle-même
                        await supabase.from("games").delete().eq("id", game_id);

                        // (optionnel : efface la session associée à ce game)
                        // await supabase.from("sessions").delete().eq("game_id", game_id);

                        router.push("/admin/quizz");
                    }}

                >
                    Fermer
                </button>
            </main>
        );
    }

    // --- 6. Interface normale d'animation ---
    if (questionIdx === -1) {
        return (
            <main className="p-6 max-w-xl mx-auto text-center">
                <h2 className="text-xl font-bold mb-8 text-blue-700">
                    Manche {currentRound.round_number} : {currentRound.title}
                </h2>
                {currentRound.media_url && (
                    <div className="mb-4 flex flex-col items-center">
                        {currentRound.media_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <img
                                src={currentRound.media_url.startsWith("http")
                                    ? currentRound.media_url
                                    : mediaBaseUrl + currentRound.media_url}
                                alt="media"
                                className="max-w-xs max-h-48 rounded shadow"
                            />
                        ) : currentRound.media_url.match(/\.(mp3|wav)$/i) ? (
                            <audio controls src={
                                currentRound.media_url.startsWith("http")
                                    ? currentRound.media_url
                                    : mediaBaseUrl + currentRound.media_url
                            } />
                        ) : currentRound.media_url.match(/\.(mp4|webm)$/i) ? (
                            <video controls width={320} src={
                                currentRound.media_url.startsWith("http")
                                    ? currentRound.media_url
                                    : mediaBaseUrl + currentRound.media_url
                            } />
                        ) : (
                            <a
                                href={currentRound.media_url.startsWith("http")
                                    ? currentRound.media_url
                                    : mediaBaseUrl + currentRound.media_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-700 underline"
                            >
                                Voir le média
                            </a>
                        )}
                    </div>
                )}

                <button
                    className="bg-green-600 text-white px-8 py-4 rounded-lg text-xl font-bold"
                    onClick={async () => {
                        await supabase.from("games")
                            .update({ current_question_index: 0 })
                            .eq("id", game_id);
                    }}
                >
                    Commencer la manche
                </button>
            </main>
        );
    }

    if (currentQuestion) {
        const allAnswered = players.length > 0 && answers.length === players.length;
        const canGoNext = timer === 0 || allAnswered;
        return (
            <main className="p-6 max-w-xl mx-auto text-center">
                <h2 className="text-xl font-bold mb-2 text-blue-700">
                    Manche {currentRound.round_number} : {currentRound.title}
                </h2>
                <h3 className="text-lg font-bold mb-4">Question {questionIdx + 1} / {currentQuestions.length}</h3>
                <div className="mb-4 text-lg">{currentQuestion.question}</div>
                <div className="mb-4 font-bold text-xl">
                    Temps restant : <span className={timer <= 10 ? "text-red-500" : ""}>{timer}s</span>
                </div>
                <h4 className="font-semibold mb-2">Joueurs connectés :</h4>
                <table className="w-full mb-4 text-left border">
                    <thead>
                        <tr>
                            <th>Pseudo</th>
                            <th>A répondu ?</th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.map(p => (
                            <tr key={p.id}>
                                <td>{p.pseudo}</td>
                                <td>{answers.find(a => a.player_id === p.id) ? "✅" : ""}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button
                    className={`px-6 py-3 rounded text-white text-lg font-bold ${canGoNext ? "bg-green-600" : "bg-gray-400 cursor-not-allowed"}`}
                    onClick={async () => {
                        if (!canGoNext) return;
                        // Question suivante ou round suivant
                        if (questionIdx + 1 >= currentQuestions.length) {
                            await supabase.from("games")
                                .update({ current_round_index: roundIdx + 1, current_question_index: -1 })
                                .eq("id", game_id);
                        } else {
                            await supabase.from("games")
                                .update({ current_question_index: questionIdx + 1 })
                                .eq("id", game_id);
                        }
                    }}
                    disabled={!canGoNext}
                >
                    {questionIdx + 1 >= currentQuestions.length ? "Fin de la manche" : "Question suivante"}
                </button>
            </main>
        );
    }

    // --- fallback sécurité ---
    return (
        <main className="p-10 text-center text-xl font-bold">
            🎉 Fin du quiz !
        </main>
    );
}


