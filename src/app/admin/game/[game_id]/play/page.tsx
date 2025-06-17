"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { supabase } from "@/utils/supabaseClient";

export default function GameAdminLobby() {
    const { game_id } = useParams();
    const router = useRouter();
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [game, setGame] = useState<any>(null);

    // Players en live
    useEffect(() => {
        let subscription: any;
        async function fetchPlayers() {
            setLoading(true);
            const { data } = await supabase.from("players").select("*").eq("game_id", game_id);
            setPlayers(data || []);
            setLoading(false);
            subscription = supabase
                .channel('players-lobby')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${game_id}` },
                    () => {
                        supabase.from("players").select("*").eq("game_id", game_id).then(({ data }) => setPlayers(data || []));
                    }
                )
                .subscribe();
        }
        fetchPlayers();
        return () => { subscription?.unsubscribe(); };
    }, [game_id]);

    // Game status en live
    useEffect(() => {
        let sub: any;
        async function fetchGame() {
            const { data } = await supabase.from("games").select("*").eq("id", game_id).single();
            setGame(data || null);
            sub = supabase
                .channel('games-lobby')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'games', filter: `id=eq.${game_id}` },
                    payload => {
                        if (payload.new) setGame(payload.new);
                    }
                )
                .subscribe();
        }
        fetchGame();
        return () => { sub?.unsubscribe(); };
    }, [game_id]);

    // Redirect si partie démarrée
    useEffect(() => {
        if (game?.status === "playing") {
            router.push(`/admin/game/${game_id}/play`);
        }
    }, [game?.status, game_id, router]);

    // Génère l'URL à scanner (joueur)
    const joinUrl = typeof window !== "undefined"
        ? `${window.location.origin}/game/join/${game_id}`
        : `https://tondomaine.com/game/join/${game_id}`;

    return (
        <main className="p-8 max-w-xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Salle d’attente</h1>
            <div className="mb-4">QR Code pour les joueurs :</div>
            <div className="flex justify-center mb-4">
                <QRCode value={joinUrl} size={180} />
            </div>
            <div className="mb-6 text-sm break-all text-gray-700">{joinUrl}</div>
            <h2 className="font-bold mb-2">Joueurs connectés :</h2>
            {loading ? <div>Chargement...</div> : (
                <ul className="mb-4">{players.map(p => <li key={p.id}>{p.pseudo}</li>)}</ul>
            )}
            <button
                className="bg-green-600 text-white px-6 py-3 rounded-lg text-lg font-bold mt-4"
                disabled={players.length < 2}
                onClick={async () => {
                    await supabase.from("games").update({ status: "playing", started_at: new Date() }).eq("id", game_id);
                }}
            >
                Démarrer la partie
            </button>
            {players.length < 2 && (
                <div className="mt-2 text-red-600">Au moins 2 joueurs requis pour démarrer.</div>
            )}
        </main>
    );
}
