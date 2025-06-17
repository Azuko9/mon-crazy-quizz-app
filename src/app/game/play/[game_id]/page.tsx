"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";

function getPlayerId(game_id: string) {
    if (typeof window !== "undefined") {
        return localStorage.getItem(`player_${game_id}`);
    }
    return null;
}

// MODIFIE le mediaBaseUrl selon ton projet
const mediaBaseUrl = "https://dymlzeksephksntjgtms.supabase.co/storage/v1/object/public/medias/";

export default function GamePlayPage() {
    const { game_id } = useParams();
    const router = useRouter();
    const [game, setGame] = useState<any>(null);
    const [rounds, setRounds] = useState<any[]>([]);
    const [questionsByRound, setQuestionsByRound] = useState<{ [roundId: string]: any[] }>({});
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<number | null>(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [timer, setTimer] = useState<number>(60);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const playerId = getPlayerId(game_id as string);

    // Pour afficher le score final en fin de partie
    const [scores, setScores] = useState<any[]>([]);

    // Ecoute la game + rounds/questions
    useEffect(() => {
        let channel: any;
        async function fetchGameAndRounds() {
            setLoading(true);
            const { data: gameData } = await supabase.from("games").select("*").eq("id", game_id).single();
            setGame(gameData);
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
                .channel(`game-play-${game_id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'games', filter: `id=eq.${game_id}` },
                    (payload: any) => {
                        // Redirection auto si la partie est supprimée (admin "Fermer")
                        if (payload.eventType === "DELETE" || !payload.new) {
                            router.replace("/");
                        }
                        if (payload.new) setGame(payload.new);
                    }
                )
                .subscribe();
        }
        fetchGameAndRounds();
        return () => { channel?.unsubscribe(); };
    }, [game_id, router]);

    // Charger la réponse du joueur courant
    useEffect(() => {
        async function checkAnswered() {
            if (!game || rounds.length === 0 || !playerId) return;
            const roundIdx = game.current_round_index ?? 0;
            const questionIdx = game.current_question_index ?? -1;
            const currentRound = rounds[roundIdx];
            const currentQuestions = currentRound ? (questionsByRound[currentRound.id] || []) : [];
            const currentQuestion = questionIdx >= 0 ? currentQuestions[questionIdx] : null;
            if (currentQuestion && playerId) {
                const { data: existing } = await supabase
                    .from("answers")
                    .select("*")
                    .eq("game_id", game_id)
                    .eq("question_id", currentQuestion.id)
                    .eq("player_id", playerId)
                    .single();
                if (existing) {
                    setHasAnswered(true);
                    setSelected(existing.answer);
                } else {
                    setHasAnswered(false);
                    setSelected(null);
                }
            } else {
                setHasAnswered(false);
                setSelected(null);
            }
        }
        checkAnswered();
    }, [game, rounds, questionsByRound, playerId, game_id]);

    // Timer
    useEffect(() => {
        if (!game || rounds.length === 0) return;
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

    // Score final en fin de quiz
    useEffect(() => {
        async function fetchScores() {
            if (!game) return;
            // Va chercher tous les joueurs
            const { data: players } = await supabase.from("players").select("id,pseudo").eq("game_id", game_id);
            // Va chercher toutes les réponses de la partie
            const { data: allAnswers } = await supabase
                .from("answers")
                .select("player_id,is_correct")
                .eq("game_id", game_id);
            // Calcul
            const scoresObj: { [id: string]: number } = {};
            for (const p of players || []) scoresObj[p.id] = 0;
            for (const a of allAnswers || []) {
                if (a.is_correct && a.player_id && scoresObj[a.player_id] !== undefined) {
                    scoresObj[a.player_id]++;
                }
            }
            const scoresArr = (players || []).map(p => ({
                pseudo: p.pseudo,
                score: scoresObj[p.id] ?? 0
            })).sort((a, b) => b.score - a.score);
            setScores(scoresArr);
        }
        // S’il n’y a plus de manche → classement
        if (game && rounds.length && (game.current_round_index >= rounds.length || !rounds[game.current_round_index])) {
            fetchScores();
        }
    }, [game, rounds, game_id]);

    if (loading) return <div className="p-8 text-center">Chargement…</div>;
    if (!game || !rounds.length) return <div className="p-8 text-center">Aucun quiz en cours.</div>;

    const roundIdx = game.current_round_index ?? 0;
    const questionIdx = game.current_question_index ?? -1;
    const currentRound = rounds[roundIdx];
    const currentQuestions = currentRound ? (questionsByRound[currentRound.id] || []) : [];
    const currentQuestion = questionIdx >= 0 ? currentQuestions[questionIdx] : null;

    // === FIN DU QUIZ : score final + redirection auto si admin ferme ===
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
                <div className="text-lg">Merci d’avoir joué !</div>
            </main>
        );
    }

    // Media pour la manche
    const roundMedia =
        currentRound?.media_url &&
        (currentRound.media_url.match(/\.(jpg|jpeg|png|gif)$/i)
            ? <img src={currentRound.media_url.startsWith("http") ? currentRound.media_url : mediaBaseUrl + currentRound.media_url} alt="media" className="max-w-xs max-h-32 mx-auto mb-4" />
            : currentRound.media_url.match(/\.(mp3|wav)$/i)
                ? <audio controls src={currentRound.media_url.startsWith("http") ? currentRound.media_url : mediaBaseUrl + currentRound.media_url} className="mx-auto mb-4" />
                : currentRound.media_url.match(/\.(mp4|webm)$/i)
                    ? <video controls width={320} src={currentRound.media_url.startsWith("http") ? currentRound.media_url : mediaBaseUrl + currentRound.media_url} className="mx-auto mb-4" />
                    : <a href={currentRound.media_url.startsWith("http") ? currentRound.media_url : mediaBaseUrl + currentRound.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline mb-4 block">Voir média</a>
        );

    // Attente début de manche
    if (questionIdx === -1) {
        return (
            <main className="p-6 max-w-xl mx-auto text-center">
                <h2 className="text-xl font-bold mb-8 text-blue-700">
                    Manche {currentRound.round_number} : {currentRound.title}
                </h2>
                {roundMedia}
                <div className="font-bold text-lg">Attendez que l’animateur commence la manche…</div>
            </main>
        );
    }

    // Affichage de la question normale
    if (currentQuestion) {
        if (hasAnswered) {
            return (
                <main className="p-6 max-w-xl mx-auto text-center">
                    <h2 className="text-xl font-bold mb-2 text-blue-700">
                        Manche {currentRound.round_number} : {currentRound.title}
                    </h2>
                    <div className="text-xl font-bold mt-8">Merci ! En attente de la prochaine question…</div>
                </main>
            );
        }
        return (
            <main className="p-6 max-w-xl mx-auto text-center">
                <h2 className="text-xl font-bold mb-2 text-blue-700">
                    Manche {currentRound.round_number} : {currentRound.title}
                </h2>
                <div>{roundMedia}</div>
                <h3 className="text-lg font-bold mb-4">Question {questionIdx + 1} / {currentQuestions.length}</h3>
                <div className="mb-4 text-lg">{currentQuestion.question}</div>
                <div className="mb-4 font-bold text-xl">
                    Temps restant : <span className={timer <= 10 ? "text-red-500" : ""}>{timer}s</span>
                </div>
                <ul className="mb-6 flex flex-col items-center gap-2">
                    {currentQuestion.options.map((opt: string, idx: number) => (
                        <li key={idx}>
                            <button
                                disabled={hasAnswered}
                                className={`border px-4 py-2 rounded 
            ${selected === idx ? "bg-green-300 font-bold" : "bg-blue-600 hover:bg-blue-800"}`}
                                onClick={async () => {
                                    if (hasAnswered) return;
                                    setSelected(idx);
                                    setHasAnswered(true);
                                    // Compare ici la bonne réponse
                                    const isCorrect = idx === currentQuestion.answer;
                                    await supabase.from("answers").insert([{
                                        game_id,
                                        question_id: currentQuestion.id,
                                        player_id: playerId,
                                        answer: idx,
                                        is_correct: isCorrect,    // ← C’EST ICI
                                        answered_at: new Date()
                                    }]);
                                }}
                            >
                                {opt}
                            </button>
                        </li>
                    ))}
                </ul>

            </main>
        );
    }

    // Fallback
    return (
        <main className="p-10 text-center text-xl font-bold">
            🎉 Fin du quiz !
        </main>
    );
}








