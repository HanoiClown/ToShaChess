import type { Puzzle } from "../content/puzzles";
export type LibraryStatus = {
  puzzles: boolean;
  games: boolean;
  puzzleCount: number;
  gameCount: number;
  bytes: number;
  path: string;
  source: string;
  issue?: "game_payload_unavailable";
};
export type LibraryFilter = {
  theme?: string;
  minRating?: number;
  maxRating?: number;
  after?: { rating: number; id: string };
  id?: string;
};
export type LibraryGame = {
  id: number;
  white: string;
  black: string;
  white_elo: number;
  black_elo: number;
  result: string;
  date: string;
  eco: string;
  opening: string;
};
export type GameFilter = {
  player?: string;
  eco?: string;
  minRating?: number;
  after?: number;
};
export type PuzzlePage = { items: Puzzle[]; more: boolean };
