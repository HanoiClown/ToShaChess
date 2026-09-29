import { z } from "zod";
import { boardAt, playUci, hash } from "../chess/game";
import type { GameRecord } from "../shared/contracts";
import { getStudyPosition, type StudyDocument } from "../study/tree";
import type { TrainingCard, TrainingAttempt } from "./types";
const id = z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  uci = z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/),
  text = z.object({
    ru: z.string().min(1).max(2000),
    en: z.string().min(1).max(2000),
  });
const cardSchema = z.object({
  id,
  profileId: id,
  title: text,
  reason: text,
  position: z.object({
    initialFen: z.string().max(200),
    moves: z.array(uci).max(512),
  }),
  acceptedMoves: z.array(uci).min(1).max(32),
  source: z.object({
    kind: z.enum(["study", "mistake", "course"]),
    id: z.string().min(1).max(200),
    nodeId: id.optional(),
  }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  dueAt: z.iso.datetime(),
  intervalDays: z.number().int().min(0).max(365),
  successes: z.number().int().min(0).max(100000),
  lapses: z.number().int().min(0).max(100000),
  lastAttemptAt: z.iso.datetime().optional(),
  attemptIds: z.array(id).max(4096),
});
export function validateTrainingCard(input: unknown): TrainingCard {
  const c = cardSchema.parse(input),
    board = boardAt(c.position);
  if (
    new Set(c.attemptIds).size !== c.attemptIds.length ||
    new Set(c.acceptedMoves).size !== c.acceptedMoves.length
  )
    throw Error("invalid_training_card");
  for (const move of c.acceptedMoves) {
    const copy = boardAt(c.position);
    playUci(copy, move);
  }
  if (board.isGameOver()) throw Error("training_finished_position");
  return c;
}
export function createTrainingCard(
  input: Pick<
    TrainingCard,
    "profileId" | "title" | "reason" | "position" | "acceptedMoves" | "source"
  >,
  now = new Date().toISOString(),
): TrainingCard {
  return validateTrainingCard({
    ...input,
    id: `training_${hash(JSON.stringify([input.profileId, input.source, input.position, input.acceptedMoves]))}`,
    createdAt: now,
    updatedAt: now,
    dueAt: now,
    intervalDays: 0,
    successes: 0,
    lapses: 0,
    attemptIds: [],
  });
}
export function reviewTrainingCard(
  card: TrainingCard,
  attempt: TrainingAttempt,
  serverNow = new Date().toISOString(),
): TrainingCard {
  if (attempt.profileId !== card.profileId || attempt.cardId !== card.id)
    throw Error("wrong_profile");
  if (card.attemptIds.includes(attempt.id)) return card;
  if (!["remembered", "again"].includes(attempt.outcome))
    throw Error("invalid_training_attempt");
  if (!Number.isFinite(Date.parse(serverNow)))
    throw Error("invalid_training_time");
  const now = Math.max(
      Date.parse(serverNow),
      Date.parse(card.lastAttemptAt ?? card.createdAt),
    ),
    success = attempt.outcome === "remembered";
  const intervalDays = success
    ? ({ 0: 1, 1: 3, 3: 7, 7: 14, 14: 30, 30: 60, 60: 60 }[card.intervalDays] ??
      1)
    : 1;
  return validateTrainingCard({
    ...card,
    intervalDays,
    dueAt: new Date(now + intervalDays * 86400000).toISOString(),
    updatedAt: new Date(now).toISOString(),
    lastAttemptAt: new Date(now).toISOString(),
    successes: card.successes + Number(success),
    lapses: card.lapses + Number(!success),
    attemptIds: [...card.attemptIds, attempt.id],
  });
}
export function dueTrainingCards(
  cards: TrainingCard[],
  profileId: string,
  now = new Date().toISOString(),
) {
  return cards
    .filter(
      (c) =>
        c.profileId === profileId && Date.parse(c.dueAt) <= Date.parse(now),
    )
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}
export function cardFromStudy(
  study: StudyDocument,
  nodeId = study.selectedNodeId,
  now = new Date().toISOString(),
): TrainingCard {
  const node = study.nodes[nodeId];
  if (!node?.mainChildId) throw Error("training_no_continuation");
  return createTrainingCard(
    {
      profileId: study.profileId,
      title: { ru: study.title, en: study.title },
      reason: {
        ru: "Повтори выбранное продолжение из своего исследования. Это проверка памяти, а не единственного правильного хода.",
        en: "Recall the selected continuation from your study. This tests memory, not the only correct chess move.",
      },
      position: getStudyPosition(study, nodeId),
      acceptedMoves: [study.nodes[node.mainChildId].uci!],
      source: { kind: "study", id: study.id, nodeId },
    },
    now,
  );
}
export function cardsFromMistakes(
  games: GameRecord[],
  profileId: string,
  now = new Date().toISOString(),
): TrainingCard[] {
  const output: TrainingCard[] = [];
  for (const game of games.filter((g) => g.profileId === profileId))
    for (const a of game.analysis) {
      if (a.provisional || !["mistake", "blunder"].includes(a.quality))
        continue;
      const position = {
          initialFen: game.initialFen,
          moves: game.moves.slice(0, a.ply - 1),
        },
        board = boardAt(position);
      if (board.turn() !== game.playerColor) continue;
      output.push(
        createTrainingCard(
          {
            profileId,
            title: {
              ru: `Вернуться к ходу ${board.moveNumber()}`,
              en: `Revisit move ${board.moveNumber()}`,
            },
            reason: {
              ru: "В разборе этой партии Stockfish нашёл более сильное продолжение. Найди его и проверь ответ соперника.",
              en: "In this game review, Stockfish found a stronger continuation. Find it and check the opponent's reply.",
            },
            position,
            acceptedMoves: [a.best],
            source: { kind: "mistake", id: game.id, nodeId: `ply_${a.ply}` },
          },
          now,
        ),
      );
      if (output.length >= 500) return output;
    }
  return output;
}
