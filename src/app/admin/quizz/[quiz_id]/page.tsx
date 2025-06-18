// src/app/admin/quizz/[quiz_id]/edit/page.tsx
"use client";
import { useSession } from "@supabase/auth-helpers-react";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

export default function EditQuizPage() {
    const session = useSession();
    const router = useRouter();
    const { quiz_id } = useParams();
    const [quiz, setQuiz] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchQuiz() {
            const { data } = await supabase
                .from("quizz")
                .select("*")
                .eq("id", quiz_id)
                .eq("owner_id", session?.user?.id)
                .single();
            setQuiz(data);
            setLoading(false);
        }
        if (quiz_id && session?.user?.id) fetchQuiz();
    }, [quiz_id, session]);

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase
            .from("quizz")
            .update({
                title: quiz.title,
                comment: quiz.comment,
                media_url: quiz.media_url,
            })
            .eq("id", quiz_id)
            .eq("owner_id", session?.user?.id);
        setLoading(false);
        if (error) alert(error.message);
        else router.replace("/admin/quizz");
    }

    if (loading) return <div>Chargement…</div>;
    if (!quiz) return <div>Quiz non trouvé</div>;

    return (
        <main className="max-w-lg mx-auto p-10">
            <h1 className="text-2xl font-bold mb-4">Modifier Quiz</h1>
            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
                <input
                    className="border rounded px-3 py-2"
                    value={quiz.title}
                    onChange={e => setQuiz({ ...quiz, title: e.target.value })}
                />
                <textarea
                    className="border rounded px-3 py-2"
                    value={quiz.comment || ""}
                    onChange={e => setQuiz({ ...quiz, comment: e.target.value })}
                />
                <input
                    className="border rounded px-3 py-2"
                    value={quiz.media_url || ""}
                    onChange={e => setQuiz({ ...quiz, media_url: e.target.value })}
                />
                <button
                    className="bg-blue-700 text-white py-2 rounded font-bold"
                    type="submit"
                    disabled={loading}
                >Sauvegarder</button>
            </form>
        </main>
    );
}


