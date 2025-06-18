import { useSyncUserToDB } from "../hooks/useSyncUserToDB";

import type { AppProps } from "next/app";

function MyApp({ Component, pageProps }: AppProps) {
    useSyncUserToDB(); // <-- Ajoute ça ici
    return <Component {...pageProps} />;
}

export default MyApp;
