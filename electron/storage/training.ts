import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  renameSync,
  statSync,
  openSync,
  fsyncSync,
  closeSync,
} from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  createTrainingCard,
  reviewTrainingCard,
  validateTrainingCard,
} from "../../src/training/cards";
import type {
  TrainingCard,
  TrainingReviewInput,
} from "../../src/training/types";
const MAX_BYTES = 25_000_000,
  MAX_CARDS = 2000;
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
const review = z.object({
  cardId: id,
  attemptId: id,
  outcome: z.enum(["remembered", "again"]),
});
export class TrainingStore {
  private cards: TrainingCard[] = [];
  readonly file: string;
  recovered = false;
  constructor(dir: string) {
    mkdirSync(dir, { recursive: true });
    this.file = join(dir, "training.json");
    if (!existsSync(this.file)) return;
    const read = (path: string) => {
      if (statSync(path).size > MAX_BYTES)
        throw Error("training_storage_limit");
      const body = JSON.parse(readFileSync(path, "utf8"));
      if (body.version !== 1) throw Error("invalid_training_storage");
      return this.validate(body.cards);
    };
    try {
      this.cards = read(this.file);
    } catch (error) {
      if (!existsSync(this.file + ".bak")) throw error;
      this.cards = read(this.file + ".bak");
      copyFileSync(this.file, this.file + ".damaged-" + Date.now());
      this.recovered = true;
      this.persist(this.cards, false);
    }
  }
  private validate(input: unknown) {
    if (!Array.isArray(input) || input.length > MAX_CARDS)
      throw Error("training_storage_limit");
    const cards = input.map(validateTrainingCard);
    if (new Set(cards.map((c) => c.id)).size !== cards.length)
      throw Error("duplicate_training_card");
    const seen = new Set<string>();
    for (const c of cards)
      for (const a of c.attemptIds) {
        if (seen.has(a)) throw Error("duplicate_training_attempt");
        seen.add(a);
      }
    if (Buffer.byteLength(JSON.stringify(cards)) > MAX_BYTES)
      throw Error("training_storage_limit");
    return cards;
  }
  private persist(cards: TrainingCard[], backup = true) {
    const safe = this.validate(cards),
      body = JSON.stringify({ version: 1, cards: safe }),
      temp = this.file + ".tmp";
    writeFileSync(temp, body);
    const fd = openSync(temp, "r+");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    if (backup && existsSync(this.file))
      copyFileSync(this.file, this.file + ".bak");
    renameSync(temp, this.file);
    this.cards = safe;
  }
  list(profileId: string) {
    return structuredClone(
      this.cards
        .filter((c) => c.profileId === profileId)
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    );
  }
  save(profileId: string, input: unknown) {
    const card = validateTrainingCard(input);
    if (card.profileId !== profileId) throw Error("wrong_profile");
    const old = this.cards.find((c) => c.id === card.id);
    if (old && old.profileId !== profileId) throw Error("wrong_profile");
    const saved = old
      ? {
          ...old,
          title: card.title,
          reason: card.reason,
          updatedAt: new Date().toISOString(),
        }
      : { ...createTrainingCard(card), id: card.id };
    this.persist([...this.cards.filter((c) => c.id !== card.id), saved]);
    return structuredClone(saved);
  }
  private owned(profileId: string, cardId: string) {
    id.parse(cardId);
    const card = this.cards.find((c) => c.id === cardId);
    if (!card) throw Error("training_card_not_found");
    if (card.profileId !== profileId) throw Error("wrong_profile");
    return card;
  }
  review(profileId: string, input: TrainingReviewInput) {
    const request = review.parse(input),
      card = this.owned(profileId, request.cardId);
    if (
      this.cards.some(
        (c) => c.id !== card.id && c.attemptIds.includes(request.attemptId),
      )
    )
      throw Error("duplicate_training_attempt");
    const now = new Date().toISOString(),
      saved = reviewTrainingCard(
        card,
        {
          id: request.attemptId,
          cardId: card.id,
          profileId,
          outcome: request.outcome,
          at: now,
        },
        now,
      );
    this.persist(this.cards.map((c) => (c.id === saved.id ? saved : c)));
    return structuredClone(saved);
  }
  postpone(profileId: string, cardId: string) {
    const c = this.owned(profileId, cardId),
      now = new Date(),
      saved = {
        ...c,
        dueAt: new Date(
          Math.max(now.valueOf(), Date.parse(c.dueAt)) + 86400000,
        ).toISOString(),
        updatedAt: now.toISOString(),
      };
    this.persist(this.cards.map((c) => (c.id === saved.id ? saved : c)));
    return structuredClone(saved);
  }
  delete(profileId: string, cardId: string) {
    this.owned(profileId, cardId);
    this.persist(this.cards.filter((c) => c.id !== cardId));
  }
  export() {
    return structuredClone(this.cards);
  }
  prepareMerge(input: unknown, owners: string[]) {
    const imported = this.validate(input),
      next = new Map(this.cards.map((c) => [c.id, c]));
    for (const c of imported) {
      if (!owners.includes(c.profileId)) throw Error("wrong_profile");
      const old = next.get(c.id);
      if (old && old.profileId !== c.profileId) throw Error("wrong_profile");
      if (!old) {
        next.set(c.id, c);
        continue;
      }
      const latest = c.updatedAt > old.updatedAt ? c : old;
      next.set(c.id, {
        ...latest,
        attemptIds: [...new Set([...old.attemptIds, ...c.attemptIds])],
        successes: Math.max(old.successes, c.successes),
        lapses: Math.max(old.lapses, c.lapses),
      });
    }
    return this.validate([...next.values()]);
  }
  replace(input: TrainingCard[]) {
    this.persist(input);
  }
}
