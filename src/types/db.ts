// src/types/db.ts

export interface Player {
  id: string;
  pseudo: string;
  game_id: string;
  // Ajoute ici tous les champs utiles de ta table 'players'
}

export interface Game {
  id: string;
  status: "waiting" | "playing" | "finished";
  started_at?: string; // ou Date si tu préfères
  // Ajoute ici tous les champs utiles de ta table 'games'
}
