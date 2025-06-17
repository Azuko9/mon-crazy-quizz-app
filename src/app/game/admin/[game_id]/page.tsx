"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { supabase } from "@/utils/supabaseClient";

export default function GameAdminPage() {
    const { game_id } = useParams();
    const router = useRouter();
    const [players, setPlayers] = useState<any[]>([]);
    const [game, setGame] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copyMsg, setCopyMsg] = useState("");

    useEffect(() => {
        let subscription: any;
        async function fetchAndListen() {
            setLoading(true);
            const { data: gameData } = await supabase
                .from("games")
                .select("*")
                .eq("id", game_id)
                .single();
            setGame(gameData);

            const { data } = await supabase
                .from("players")
                .select("*")
                .eq("game_id", game_id)
                .order("joined_at", { ascending: true });
            setPlayers(data || []);
            setLoading(false);

            subscription = supabase
                .channel('public:players')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${game_id}` },
                    () => {
                        supabase.from("players").select("*").eq("game_id", game_id).order("joined_at", { ascending: true })
                            .then(({ data }) => setPlayers(data || []));
                    }
                )
                .subscribe();
        }
        fetchAndListen();
        return () => { subscription?.unsubscribe(); };
    }, [game_id]);

    const joinUrl = typeof window !== "undefined"
        ? `${window.location.origin}/game/join/${game_id}`
        : `https://VOTRE_DOMAINE/game/join/${game_id}`;

    async function handleCopyLink() {
        try {
            await navigator.clipboard.writeText(joinUrl);
            setCopyMsg("Lien copié !");
            setTimeout(() => setCopyMsg(""), 2000);
        } catch (e) {
            setCopyMsg("Erreur lors de la copie");
            setTimeout(() => setCopyMsg(""), 2000);
        }
    }

    return (
        <main className="p-6 max-w-xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Salle d’attente</h1>
            <p className="mb-4">Demandez aux joueurs de scanner ce QR code ou de saisir le code ci-dessous :</p>
            <div className="flex flex-col items-center mb-4">
                <QRCode value={joinUrl} size={180} />
                <button className="bg-blue-700 text-white px-4 py-2 rounded mt-3"
                    onClick={handleCopyLink} type="button">
                    Copier le lien
                </button>
                {copyMsg && <div className="text-green-700 text-sm mt-2">{copyMsg}</div>}

                {/* Affichage du code court à saisir */}
                {game?.join_code && (
                    <div className="mt-4 text-xl font-mono bg-gray-100 px-8 py-4 rounded-lg shadow select-all text-purple-900 tracking-widest">
                        Code à saisir : <span className="font-bold">{game.join_code}</span>
                    </div>
                )}
            </div>
            <div className="mb-6 text-sm break-all text-gray-700">{joinUrl}</div>
            <h2 className="font-bold mb-2">Joueurs connectés :</h2>
            {loading
                ? <div>Chargement...</div>
                : (
                    <ul className="mb-4">
                        {players.map(p => <li key={p.id} className="mb-1">{p.pseudo}</li>)}
                    </ul>
                )
            }
            <button
                className="bg-green-600 text-white px-6 py-3 rounded-lg text-lg font-bold"
                disabled={players.length < 2}
                onClick={async () => {
                    await supabase.from("games").update({ status: "playing", started_at: new Date() }).eq("id", game_id);
                    router.push(`/game/admin/${game_id}/play`);
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
