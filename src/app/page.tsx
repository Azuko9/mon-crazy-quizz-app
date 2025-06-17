"use client";

export default function HomePage() {
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
    </main>
  );
}


