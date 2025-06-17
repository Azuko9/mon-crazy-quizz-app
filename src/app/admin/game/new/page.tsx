import { Suspense } from "react";
import NewGamePage from "./NewGamePage";

export default function Page() {
    return (
        <Suspense fallback={<div>Chargement de la page...</div>}>
            <NewGamePage />
        </Suspense>
    );
}
