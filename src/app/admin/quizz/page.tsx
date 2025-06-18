import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Database } from "@/types/db"; // Optionnel, voir typage plus bas

export default async function AdminQuizzPage() {
    const supabase = createServerComponentClient<Database>({ cookies });

    // Récupération session user
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        redirect("/");
    }

    const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

    if (!userData || userData.role !== "admin") {
        redirect("/");
    }

    return (
        <div>
            <h1>Page Admin Quizz</h1>
            {/* ... contenu admin */}
        </div>
    );
}






