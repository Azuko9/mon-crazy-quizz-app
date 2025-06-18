"use client";
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

export default function LoginPage() {
    const session = useSession();
    const router = useRouter();
    const supabase = useSupabaseClient();

    useEffect(() => {
        if (session) {
            router.replace("/admin/quizz");
        }
    }, [session, router]);

    if (session === undefined) {
        return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-[#181818]">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-xl">
                <Auth
                    supabaseClient={supabase}
                    appearance={{ theme: ThemeSupa }}
                    providers={["google"]}
                    theme="dark"
                />
            </div>
        </main>
    );
}






