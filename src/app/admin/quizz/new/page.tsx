"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

export default function NewQuizPage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [comment, setComment] = useState("");
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaUrl, setMediaUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [roundTitle, setRoundTitle] = useState("Manche 1");
    const [nbQuestions, setNbQuestions] = useState(1);

    async function handleCreateQuiz(e: React.FormEvent) {
        e.preventDefault();
        setError(""); setSuccess("");
        setCreating(true);

        let finalMediaUrl = "";
        if (mediaFile) {
            setUploading(true);
            const filename = `${Date.now()}_${mediaFile.name}`;
            const { error: uploadErr } = await supabase
                .storage
                .from("medias")
                .upload(filename, mediaFile, { upsert: false });
            setUploading(false);
            if (uploadErr) {
                setError("Erreur upload média");
                setCreating(false);
                return;
            }
            finalMediaUrl = filename;
        } else if (mediaUrl) {
            finalMediaUrl = mediaUrl;
        }

        // Crée le quiz
        const { data: quiz, error: quizErr } = await supabase.from("quizz")
            .insert([{ title, comment, media_url: finalMediaUrl }])
            .select()
            .single();

        if (quizErr) {
            setError("Erreur création quiz : " + quizErr.message);
            setCreating(false);
            return;
        }

        // Crée la première manche (round)
        const { data: round, error: roundErr } = await supabase.from("rounds")
            .insert([{ quiz_id: quiz.id, round_number: 1, title: roundTitle, nb_questions: nbQuestions }])
            .select()
            .single();

        if (roundErr) {
            setError("Erreur création manche : " + roundErr.message);
            setCreating(false);
            return;
        }

        setSuccess("Quiz et première manche créés !");
        setTimeout(() => {
            router.push(`/admin/quizz/${quiz.id}/edit`);
        }, 1000);
    }

    return (
        <main className="max-w-lg mx-auto p-8">
            <h1 className="text-2xl font-bold mb-4">Créer un nouveau quiz</h1>

            <form onSubmit={handleCreateQuiz} className="flex flex-col gap-4">
                <div>
                    <label className="block font-semibold mb-1">Titre du quiz</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                        className="border rounded px-3 py-2 w-full"
                    />
                </div>
                <div>
                    <label className="block font-semibold mb-1">Commentaire</label>
                    <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        className="border rounded px-3 py-2 w-full"
                    />
                </div>
                <div>
                    <label className="block font-semibold mb-1">Illustration du quiz (optionnelle)</label>
                    <input
                        type="file"
                        accept="image/*,audio/*,video/*"
                        className="hidden"
                        id="media-input"
                        onChange={e => setMediaFile(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="media-input" className="inline-block bg-blue-600 text-white px-4 py-2 rounded cursor-pointer mb-2">
                        Choisir un fichier
                    </label>
                    {mediaFile && <span className="ml-2">{mediaFile.name}</span>}
                    <div className="my-2 text-center">OU</div>
                    <input
                        type="text"
                        placeholder="URL d’un média déjà en ligne"
                        value={mediaUrl}
                        onChange={e => setMediaUrl(e.target.value)}
                        className="border rounded px-3 py-2 w-full"
                    />
                </div>
                <div className="mt-4 border-t pt-4">
                    <h2 className="font-semibold mb-2">Première manche</h2>
                    <input
                        type="text"
                        value={roundTitle}
                        onChange={e => setRoundTitle(e.target.value)}
                        className="border rounded px-3 py-2 w-full mb-2"
                        required
                    />
                    <input
                        type="number"
                        value={nbQuestions}
                        onChange={e => setNbQuestions(Math.max(1, Number(e.target.value)))}
                        min={1}
                        className="border rounded px-3 py-2 w-full"
                        required
                    />
                    <div className="text-xs text-gray-500 mt-1">Nombre de questions pour la manche</div>
                </div>
                <button
                    type="submit"
                    className="bg-green-600 text-white px-6 py-2 rounded text-lg font-bold mt-6"
                    disabled={creating || uploading}
                >
                    {creating ? "Création..." : "Créer le quiz"}
                </button>
                {error && <div className="text-red-600 font-bold">{error}</div>}
                {success && <div className="text-green-600 font-bold">{success}</div>}
            </form>
        </main>
    );
}




