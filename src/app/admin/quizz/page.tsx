import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminQuizzPage() {
    const supabase = createServerComponentClient({ cookies });

    // Récupérer la session de l'utilisateur connecté
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        redirect("/"); // Redirige si pas connecté
    }

    // Récupérer le user dans la table "users"
    const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

    if (!userData || userData.role !== "admin") {
        redirect("/"); // Redirige si pas admin
    }

    return (
        <div>
            <h1>Page Admin Quizz</h1>
            {/* Place ici le contenu admin */}
        </div>
    );
}





