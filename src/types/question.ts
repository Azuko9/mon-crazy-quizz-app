export interface Question {
  id: number;
  question: string;
  options: string[];
  answer: number; // index de la bonne réponse dans options
}
