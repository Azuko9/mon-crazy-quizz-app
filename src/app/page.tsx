"use client";
import { useRouter } from "next/navigation";
export default function HomePage() {
  const router = useRouter();
  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-[#281248]">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-10 text-white text-center drop-shadow">
        Bienvenue sur le Quizz !
      </h1>
      <img
        src="/img/Crazy_Quizz_clear.png"
        alt="Crazy Quizz Logo"
        className="mx-auto w-64 max-w-full rounded-lg "

      />
      <button
        className="bg-blue-700 text-white px-6 py-2 rounded mt-4 shadow hover:bg-blue-800"
        onClick={() => router.push("/admin/quizz")}
      >
        Accès Admin
      </button>
    </main>
  );
}


