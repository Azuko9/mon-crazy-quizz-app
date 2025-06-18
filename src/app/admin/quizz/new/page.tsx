// src/app/admin/quizz/new/page.tsx
"use client";
import { useSession } from "@supabase/auth-helpers-react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewQuizPage() {
    const session = useSession();
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [comment, setComment] = useState("");
    const [mediaUrl, setMediaUrl] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase
            .from("quizz")
            .insert([{
                title,
                comment,
                media_url: mediaUrl,
                owner_id: session?.user?.id,
            }]);
        setLoading(false);
        if (error) {
            alert(error.message);
        } else {
            router.replace("/admin/quizz");
        }
    }

    return (
        <main className="max-w-lg mx-auto p-10">
            <h1 className="text-2xl font-bold mb-4">Nouveau Quiz</h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                    className="border rounded px-3 py-2"
                    placeholder="Titre"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                />
                <textarea
                    className="border rounded px-3 py-2"
                    placeholder="Commentaire"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                />
                <input
                    className="border rounded px-3 py-2"
                    placeholder="URL image (optionnel)"
                    value={mediaUrl}
                    onChange={e => setMediaUrl(e.target.value)}
                />
                <button
                    className="bg-green-700 text-white py-2 rounded font-bold"
                    type="submit"
                    disabled={loading}
                >Créer</button>
            </form>
        </main>
    );
}




