"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

const quizMediaBaseUrl = "https://dymlzeksephksntjgtms.supabase.co/storage/v1/object/public/medias/";
const roundMediaBaseUrl = quizMediaBaseUrl; // même bucket

export default function EditQuizPage() {
    const { quiz_id } = useParams();
    const router = useRouter();

    // États quiz
    const [quiz, setQuiz] = useState<any>(null);
    const [quizTitle, setQuizTitle] = useState("");
    const [quizComment, setQuizComment] = useState("");
    const [quizMediaFile, setQuizMediaFile] = useState<File | null>(null);
    const [quizMediaUrl, setQuizMediaUrl] = useState("");

    // États rounds
    const [rounds, setRounds] = useState<any[]>([]);
    const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);

    // États pour création manche
    const [newRoundTitle, setNewRoundTitle] = useState("");
    const [newRoundQuestions, setNewRoundQuestions] = useState(1);
    const [newRoundMediaFile, setNewRoundMediaFile] = useState<File | null>(null);
    const [newRoundMediaUrl, setNewRoundMediaUrl] = useState("");

    // Questions de la manche sélectionnée
    const [questions, setQuestions] = useState<any[]>([]);
    const [newQ, setNewQ] = useState({ text: "", options: ["", ""], answer: 0, mediaFile: null as File | null, mediaUrl: "" });

    // Validation globale
    const [isReady, setIsReady] = useState(false);

    // Chargement initial
    useEffect(() => {
        async function fetchAll() {
            const { data: quizData } = await supabase.from("quizz").select("*").eq("id", quiz_id).single();
            if (!quizData) {
                alert("Quiz introuvable !"); router.push("/admin/quizz"); return;
            }
            setQuiz(quizData);
            setQuizTitle(quizData.title || "");
            setQuizComment(quizData.comment || "");
            setQuizMediaUrl(quizData.media_url || "");
            const { data: roundsData } = await supabase.from("rounds").select("*").eq("quiz_id", quiz_id).order("round_number");
            setRounds(roundsData || []);
            if (roundsData?.length) setSelectedRoundId(roundsData[0].id);
        }
        fetchAll();
    }, [quiz_id, router]);

    // Questions de la manche sélectionnée
    useEffect(() => {
        if (!selectedRoundId) { setQuestions([]); return; }
        supabase.from("questions").select("*").eq("round_id", selectedRoundId).then(({ data }) => setQuestions(data || []));
    }, [selectedRoundId]);

    // Évaluation des conditions pour bouton "Créer le quiz"
    useEffect(() => {
        async function validateAll() {
            // Check chaque manche a le nb_questions attendu
            let ok = true;
            for (let r of rounds) {
                const { data: q } = await supabase.from("questions").select("*").eq("round_id", r.id);
                if ((q?.length || 0) < r.nb_questions) { ok = false; break; }
            }
            setIsReady(ok && rounds.length > 0);
        }
        if (rounds.length) validateAll();
        else setIsReady(false);
    }, [rounds, questions]);

    // ---- Sauvegarde illustration quiz
    async function handleQuizMediaUpload() {
        if (!quizMediaFile) return;
        const filename = `${Date.now()}_${quizMediaFile.name}`;
        const { error } = await supabase.storage.from("medias").upload(filename, quizMediaFile, { upsert: false });
        if (!error) setQuizMediaUrl(filename);
        else alert("Erreur upload média quiz");
    }

    // ---- Sauvegarde info quiz
    async function handleSaveQuiz() {
        await handleQuizMediaUpload();
        await supabase.from("quizz").update({
            title: quizTitle,
            comment: quizComment,
            media_url: quizMediaUrl
        }).eq("id", quiz_id);
        alert("Quiz mis à jour !");
    }

    // ---- Ajout manche (avec media optionnel)
    async function handleAddRound(e: React.FormEvent) {
        e.preventDefault();
        let roundMedia = newRoundMediaUrl;
        if (newRoundMediaFile) {
            const filename = `${Date.now()}_${newRoundMediaFile.name}`;
            const { error } = await supabase.storage.from("medias").upload(filename, newRoundMediaFile, { upsert: false });
            if (!error) roundMedia = filename;
        }
        const { data: round } = await supabase.from("rounds").insert([{
            quiz_id, round_number: rounds.length + 1, title: newRoundTitle, nb_questions: newRoundQuestions, media_url: roundMedia
        }]).select().single();
        setNewRoundTitle(""); setNewRoundQuestions(1); setNewRoundMediaFile(null); setNewRoundMediaUrl("");
        setRounds([...rounds, round]);
    }

    // ---- Modification titre manche et illustration
    async function handleEditRoundTitle(id: string, title: string) {
        await supabase.from("rounds").update({ title }).eq("id", id);
        setRounds(rounds.map(r => r.id === id ? { ...r, title } : r));
    }
    async function handleEditRoundMedia(id: string, file: File | null, url: string) {
        let roundMedia = url;
        if (file) {
            const filename = `${Date.now()}_${file.name}`;
            const { error } = await supabase.storage.from("medias").upload(filename, file, { upsert: false });
            if (!error) roundMedia = filename;
        }
        await supabase.from("rounds").update({ media_url: roundMedia }).eq("id", id);
        setRounds(rounds.map(r => r.id === id ? { ...r, media_url: roundMedia } : r));
    }

    async function handleAddQuestion(e: React.FormEvent) {
        e.preventDefault();

        if (!selectedRoundId || !newQ.text.trim() || newQ.options.some(o => !o.trim())) {
            alert("Complète tous les champs !");
            return;
        }

        // Vérifier options est bien un tableau de string
        if (!Array.isArray(newQ.options)) {
            alert("Options mal formatées !");
            return;
        }

        let finalMedia = newQ.mediaUrl;
        if (newQ.mediaFile) {
            const filename = `${Date.now()}_${newQ.mediaFile.name}`;
            const { error } = await supabase.storage.from("medias").upload(filename, newQ.mediaFile, { upsert: false });
            if (!error) finalMedia = filename;
        }

        // Log de debug complet avant insert
        console.log("INSERT DATA:", {
            round_id: selectedRoundId,
            question: newQ.text,
            options: newQ.options,
            answer: newQ.answer,
            media_url: finalMedia,
            type: "QCM"
        });

        // INSERT compatible Supabase
        const { error } = await supabase.from("questions").insert([{
            quiz_id: quiz_id,
            round_id: selectedRoundId,
            question: newQ.text,
            options: newQ.options,          // Doit être un tableau JS
            answer: Number(newQ.answer),    // Cast au cas où
            media_url: finalMedia,
            type: "QCM"
        }]);

        if (error) {
            alert("Erreur création question : " + error.message);
            return;
        }

        // Reset form & reload
        setNewQ({ text: "", options: ["", ""], answer: 0, mediaFile: null, mediaUrl: "" });
        supabase.from("questions").select("*").eq("round_id", selectedRoundId).then(({ data }) => setQuestions(data || []));
    }


    // ---- Suppression question
    async function handleDeleteQuestion(qid: string) {
        if (window.confirm("Supprimer cette question ?")) {
            await supabase.from("questions").delete().eq("id", qid);
            supabase.from("questions").select("*").eq("round_id", selectedRoundId).then(({ data }) => setQuestions(data || []));
        }
    }

    // ---- Suppression manche
    async function handleDeleteRound(rid: string) {
        if (window.confirm("Supprimer la manche (et ses questions) ?")) {
            await supabase.from("rounds").delete().eq("id", rid);
            setRounds(rounds.filter(r => r.id !== rid));
            setSelectedRoundId(null);
        }
    }

    // ---- Finalisation quiz
    async function handleFinalizeQuiz() {
        await supabase.from("quizz").update({ is_active: true }).eq("id", quiz_id);
        alert("Quiz activé et prêt à l'emploi !");
        router.push("/admin/quizz");
    }

    return (
        <main className="max-w-3xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Édition du quiz</h1>
            {/* Quiz info */}
            <div className="mb-6">
                <label className="block mb-1 font-semibold">Titre :</label>
                <input value={quizTitle} onChange={e => setQuizTitle(e.target.value)} className="border px-2 py-1 rounded w-full" />
                <label className="block mt-2 mb-1 font-semibold">Commentaire :</label>
                <textarea value={quizComment} onChange={e => setQuizComment(e.target.value)} className="border px-2 py-1 rounded w-full" />
                <label className="block mt-2 mb-1 font-semibold">Illustration du quiz :</label>
                <input type="file" accept="image/*,audio/*,video/*" onChange={e => setQuizMediaFile(e.target.files?.[0] || null)} />
                <div className="my-1">OU</div>
                <input value={quizMediaUrl} onChange={e => setQuizMediaUrl(e.target.value)} className="border px-2 py-1 rounded w-full" />
                <button className="bg-green-700 text-white rounded px-4 py-2 mt-2 font-bold" onClick={handleSaveQuiz}>Sauvegarder</button>
            </div>

            {/* Manches */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Manches du quiz</h2>
                <ul className="flex flex-wrap gap-2 mb-2">
                    {rounds.map(r =>
                        <li key={r.id}>
                            <button
                                className={`px-2 py-1 rounded ${selectedRoundId === r.id ? "bg-blue-600 font-bold text-white" : "bg-gray-200"}`}
                                onClick={() => setSelectedRoundId(r.id)}
                            >
                                Manche {r.round_number} :
                                <input
                                    value={r.title}
                                    onChange={e => handleEditRoundTitle(r.id, e.target.value)}
                                    className="bg-transparent border-b border-blue-600 mx-2 w-32"
                                    style={{ outline: "none" }}
                                />
                                ({questions.filter(q => q.round_id === r.id).length}/{r.nb_questions})
                            </button>
                            <button className="ml-2 text-red-700" onClick={() => handleDeleteRound(r.id)}>🗑️</button>
                            <div>
                                <input type="file" accept="image/*,audio/*,video/*"
                                    onChange={e => handleEditRoundMedia(r.id, e.target.files?.[0] || null, r.media_url)}
                                />
                                <input type="text" placeholder="URL d’illustration" value={r.media_url || ""} onChange={e => handleEditRoundMedia(r.id, null, e.target.value)} />
                                {r.media_url && <a href={r.media_url.startsWith("http") ? r.media_url : roundMediaBaseUrl + r.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 ml-2">Voir média</a>}
                            </div>
                        </li>
                    )}
                </ul>
                <form className="flex gap-2 items-end mb-3" onSubmit={handleAddRound}>
                    <input type="text" placeholder="Titre manche" value={newRoundTitle} onChange={e => setNewRoundTitle(e.target.value)} required className="border px-2 py-1 rounded" />
                    <input type="number" placeholder="Nb questions" value={newRoundQuestions}
                        onChange={e => setNewRoundQuestions(Math.max(1, Number(e.target.value)))} min={1} className="border px-2 py-1 rounded w-24" />
                    <input type="file" accept="image/*,audio/*,video/*" onChange={e => setNewRoundMediaFile(e.target.files?.[0] || null)} />
                    <input type="text" placeholder="URL d’illustration" value={newRoundMediaUrl} onChange={e => setNewRoundMediaUrl(e.target.value)} />
                    <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">+ Ajouter une manche</button>
                </form>
            </section>

            {/* Questions de la manche sélectionnée */}
            {selectedRoundId && (
                <section className="mb-8">
                    <h3 className="font-bold mb-2">Questions de la manche</h3>
                    <ul>
                        {questions.map((q, i) => (
                            <li key={q.id} className="mb-2 border p-2 rounded">
                                <div className="font-bold">Q{i + 1} : {q.question}</div>
                                <ol className="ml-4 list-decimal">
                                    {q.options.map((opt: string, idx: number) => (
                                        <li key={idx} className={q.answer === idx ? "font-semibold text-green-700" : ""}>
                                            {opt}{q.answer === idx && " ✓"}
                                        </li>
                                    ))}
                                </ol>
                                {q.media_url && (
                                    <div className="mt-1">
                                        <a href={q.media_url.startsWith("http") ? q.media_url : quizMediaBaseUrl + q.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                            Voir média
                                        </a>
                                    </div>
                                )}
                                <button className="mt-1 text-red-700" onClick={() => handleDeleteQuestion(q.id)}>🗑️ Supprimer</button>
                            </li>
                        ))}
                    </ul>
                    {/* Ajout question */}
                    <form className="mt-4 border-t pt-4 flex flex-col gap-2" onSubmit={handleAddQuestion}>
                        <input type="text" placeholder="Question" value={newQ.text} onChange={e => setNewQ(q => ({ ...q, text: e.target.value }))} className="border px-2 py-1 rounded" required />
                        <div>
                            <span className="font-semibold mb-1 block">Options (QCM):</span>
                            {newQ.options.map((opt, idx) => (
                                <div key={idx} className="flex gap-1 mb-1">
                                    <input
                                        value={opt}
                                        placeholder={`Option ${idx + 1}`}
                                        onChange={e => {
                                            const copy = [...newQ.options];
                                            copy[idx] = e.target.value;
                                            setNewQ(q => ({ ...q, options: copy }));
                                        }}
                                        className="border p-1 rounded flex-1"
                                        required
                                    />
                                    <input
                                        type="radio"
                                        name="answer"
                                        checked={newQ.answer === idx}
                                        onChange={() => setNewQ(q => ({ ...q, answer: idx }))}
                                        className="mx-1"
                                        title="Bonne réponse"
                                    />
                                    {newQ.options.length > 2 && (
                                        <button type="button" onClick={() => setNewQ(q => ({ ...q, options: q.options.filter((_, i) => i !== idx) }))}>🗑️</button>
                                    )}
                                </div>
                            ))}
                            <button type="button" className="text-blue-600 underline mt-1" onClick={() => setNewQ(q => ({ ...q, options: [...q.options, ""] }))}>Ajouter une option</button>
                        </div>
                        <div>
                            <span className="block mb-1 font-semibold">Média (facultatif) :</span>
                            <input
                                type="file"
                                accept="image/*,audio/*,video/*"
                                onChange={e => setNewQ(q => ({ ...q, mediaFile: e.target.files?.[0] || null }))}
                            />
                            <div className="my-1">OU</div>
                            <input
                                type="text"
                                placeholder="URL d'un média déjà en ligne"
                                value={newQ.mediaUrl}
                                onChange={e => setNewQ(q => ({ ...q, mediaUrl: e.target.value }))}
                                className="border p-1 rounded w-full"
                            />
                        </div>
                        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
                            Ajouter la question
                        </button>
                    </form>
                </section>
            )}

            {/* Validation */}
            {isReady && (
                <div className="text-center mt-8">
                    <button
                        onClick={handleFinalizeQuiz}
                        className="bg-green-700 text-white px-8 py-3 rounded-lg text-xl font-bold shadow"
                    >
                        Créer/Valider le quiz
                    </button>
                </div>
            )}
            <button className="bg-gray-400 text-white rounded px-4 py-2 mt-2" onClick={() => router.push("/admin/quizz")}>
                Retour à la liste des quiz
            </button>
        </main>
    );
}
