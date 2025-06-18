import "./globals.css";
import UserSyncer from "@/components/UserSyncer";

export const metadata = {
  title: "Crazy Quiz App",
  description: "Ton app de quiz avec Next.js, Supabase et Google Auth",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <UserSyncer />
        {children}
      </body>
    </html>
  );
}




