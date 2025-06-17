"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function GameJoinPage() {
    const { game_id } = useParams();
    const router = useRouter();
    const LOCAL_KEY = `player_${game_id}`;
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [pseudo, setPseudo] = useState("");
    const [joining, setJoining] = useState(false);
    const [players, setPlayers] = useState<any[]>([]);
    const [playersLoading, setPlayersLoading] = useState(true);
    const [gameStatus, setGameStatus] = useState<string | null>(null);

    // Déjà inscrit ?
    useEffect(() => {
        const stored = localStorage.getItem(LOCAL_KEY);
        if (stored) setPlayerId(stored);
    }, [game_id]);

    // Statut de la partie (pour rediriger)
    useEffect(() => {
        let sub: any;
        async function listenStatus() {
            const { data } = await supabase.from("games").select("status").eq("id", game_id).single();
            setGameStatus(data?.status || null);
            sub = supabase
                .channel('join-game-status')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'games', filter: `id=eq.${game_id}` },
                    payload => {
                        const newStatus = (payload.new as { [key: string]: any })?.status;
                        if (newStatus) setGameStatus(newStatus);
                    }
                )
                .subscribe();
        }
        listenStatus();
        return () => { sub?.unsubscribe(); };
    }, [game_id]);

    // Go page de jeu si partie démarre
    useEffect(() => {
        if (gameStatus === "playing") {
            router.push(`/game/play/${game_id}`);
        }
    }, [gameStatus, router, game_id]);

    // Liste joueurs live
    useEffect(() => {
        let sub: any;
        async function fetchPlayers() {
            setPlayersLoading(true);
            const { data } = await supabase.from("players").select("*").eq("game_id", game_id);
            setPlayers(data || []);
            setPlayersLoading(false);
            sub = supabase
                .channel('players-join')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${game_id}` },
                    () => {
                        supabase.from("players").select("*").eq("game_id", game_id).then(({ data }) => setPlayers(data || []));
                    }
                )
                .subscribe();
        }
        fetchPlayers();
        return () => { sub?.unsubscribe(); };
    }, [game_id]);

    async function handleJoin(e: React.FormEvent) {
        e.preventDefault();
        if (!pseudo.trim()) return;
        setJoining(true);
        const { data, error } = await supabase
            .from("players")
            .insert([{ game_id, pseudo, is_host: false }])
            .select()
            .single();
        setJoining(false);
        if (error) alert("Erreur : " + error.message);
        else {
            localStorage.setItem(LOCAL_KEY, data.id);
            setPlayerId(data.id);
        }
    }

    return (
        <main className="p-6 max-w-xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-6">Rejoindre la partie</h1>
            {!playerId ? (
                <form onSubmit={handleJoin} className="flex flex-col gap-4 items-center">
                    <input
                        value={pseudo}
                        onChange={e => setPseudo(e.target.value)}
                        required
                        placeholder="Choisis un pseudo"
                        className="border rounded px-4 py-2 text-lg"
                    />
                    <button
                        type="submit"
                        className="bg-green-600 text-white px-6 py-2 rounded text-lg font-bold"
                        disabled={joining}
                    >
                        {joining ? "Connexion..." : "Rejoindre"}
                    </button>
                </form>
            ) : (
                <div className="text-lg mt-8 mb-4">
                    En attente du démarrage de la partie...
                </div>
            )}
            <div className="mb-4">
                <h2 className="font-bold mb-2">Joueurs connectés :</h2>
                {playersLoading ? (
                    <div>Chargement…</div>
                ) : (
                    <ul className="mb-2">
                        {players.map(p => (
                            <li key={p.id} className={p.id === playerId ? "font-bold text-blue-700" : ""}>
                                {p.pseudo}{p.id === playerId && " (vous)"}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </main>
    );
}





