import type { Locale, Position } from "../shared/contracts";
export type TrainingCard = {
  id: string;
  profileId: string;
  title: Record<Locale, string>;
  reason: Record<Locale, string>;
  position: Position;
  acceptedMoves: string[];
  source: { kind: "study" | "mistake" | "course"; id: string; nodeId?: string };
  createdAt: string;
  updatedAt: string;
  dueAt: string;
  intervalDays: number;
  successes: number;
  lapses: number;
  lastAttemptAt?: string;
  attemptIds: string[];
};
export type TrainingAttempt = {
  id: string;
  cardId: string;
  profileId: string;
  outcome: "remembered" | "again";
  at: string;
};
export type TrainingReviewInput = {
  cardId: string;
  attemptId: string;
  outcome: "remembered" | "again";
};
export type TrainingMode =
  "recall" | "guess" | "rescue" | "handbrain" | "convert";
