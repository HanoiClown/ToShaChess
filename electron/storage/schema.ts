import { z } from "zod";
import { Chess } from "chess.js";
import type { Database, Progress } from "../../src/shared/contracts";
const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const text = z.string().max(50000);
const score = z.object({
  cp: z.number().finite(),
  mate: z.number().int().nullable(),
});
const line = z.object({
  score,
  pv: z.array(z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/)).max(100),
  depth: z.number().int().min(0).max(256),
});
const profileName = z.string().trim().min(1).max(40);
const nickname = z
  .string()
  .transform((value) => value.normalize("NFKC").trim())
  .pipe(
    z
      .string()
      .min(2)
      .max(24)
      .regex(/^[\p{L}\p{N}_-]+$/u),
  );
const skillLevel = z.enum(["new", "beginner", "intermediate", "advanced"]);
const rating = z.number().int().min(0).max(3000);
export const normalizeNickname = (value: string) =>
  value.normalize("NFKC").trim().toLowerCase();
export const createProfileSchema = z.object({
  name: profileName,
  nickname,
  skillLevel,
  rating: rating.optional(),
  locale: z.enum(["ru", "en"]),
});
export const profileSchema = z.object({
  theme: z.enum(["green", "purple", "blue", "red"]).default("green"),
  id,
  name: profileName,
  nickname: nickname.optional(),
  skillLevel: skillLevel.optional(),
  rating: rating.optional(),
  locale: z.enum(["ru", "en"]),
  level: z.enum(["new", "beginner"]),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
});
export const attemptSchema = z.object({
  id,
  profileId: id,
  itemId: id,
  theme: z.string().max(80),
  correct: z.boolean(),
  at: z.iso.datetime(),
  seconds: z.number().min(0).max(86400),
});
const review = z.object({
  id,
  fen: z.string().max(160),
  best: z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/),
  theme: z.string().max(80),
  due: z.iso.datetime(),
  interval: z.number().min(0).max(365),
  gameId: id.optional(),
  ply: z.number().int().positive().optional(),
});
export const visionSettingsSchema = z.object({
  duration: z.union([
    z.literal(0),
    z.literal(30),
    z.literal(60),
    z.literal(120),
  ]),
  orientation: z.enum(["w", "b"]),
  coordinates: z.boolean(),
});
export const visionResultSchema = visionSettingsSchema.extend({
  id,
  profileId: id,
  at: z.iso.datetime(),
  seconds: z.number().min(0).max(86400),
  correct: z.number().int().min(0).max(100000),
  wrong: z.number().int().min(0).max(100000),
});
const progress = z.object({
  favorites: z.array(id).max(50000).default([]),
  vision: z.array(visionResultSchema).max(100000).default([]),
  visionSettings: visionSettingsSchema.default({
    duration: 60,
    orientation: "w",
    coordinates: true,
  }),
  completed: z.array(id).max(20000),
  attempts: z.array(attemptSchema).max(100000),
  reviews: z.array(review).max(50000),
  activity: z
    .array(
      z.object({
        id,
        at: z.iso.datetime(),
        seconds: z.number().min(0).max(60),
        section: z.string().max(30),
      }),
    )
    .max(200000)
    .default([]),
});
export const gameSchema = z.object({
  id,
  profileId: id,
  initialFen: z.string().max(160),
  moves: z.array(z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/)).max(4000),
  headers: z.record(z.string().max(100), z.string().max(2000)),
  playerColor: z.enum(["w", "b"]),
  mode: z.enum(["normal", "training", "import"]),
  bot: z.boolean(),
  playedAt: z.string().max(40).nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().optional(),
  result: z.enum(["1-0", "0-1", "1/2-1/2", "*"]),
  analysis: z
    .array(
      z.object({
        ply: z.number().int().positive(),
        before: line,
        after: line,
        best: z.string().max(5),
        quality: z.enum([
          "best",
          "excellent",
          "good",
          "inaccuracy",
          "mistake",
          "blunder",
          "brilliant",
          "book",
        ]),
        loss: z.number().min(0),
        provisional: z.boolean(),
      }),
    )
    .max(4000),
  explanations: z.object({
    ru: z.record(z.string(), text).optional(),
    en: z.record(z.string(), text).optional(),
  }),
  clock: z
    .object({
      w: z.number().min(0),
      b: z.number().min(0),
      increment: z.number().min(0).max(600000),
    })
    .optional(),
  level: z.number().int().min(0).max(4).optional(),
});
export const settingsSchema = z.object({
  budget: z.number().int().min(0).max(5000000),
  sound: z.boolean(),
  engineMs: z.number().int().min(100).max(1500),
});
const databaseSchema = z.object({
  version: z.literal(1),
  profiles: z.array(profileSchema).max(20),
  games: z.array(gameSchema).max(10000),
  progress: z.record(id, progress),
  usage: z
    .array(
      z.object({
        id,
        month: z.string().regex(/^\d{4}-\d{2}$/),
        reserved: z.number().int().nonnegative(),
        actual: z.number().int().nonnegative().nullable(),
      }),
    )
    .max(100000),
  settings: settingsSchema,
  archiveImported: z.boolean(),
});
export const emptyProgress = (): Progress => ({
  favorites: [],
  vision: [],
  visionSettings: { duration: 60, orientation: "w", coordinates: true },
  completed: [],
  attempts: [],
  reviews: [],
  activity: [],
});
export function freshDatabase(): Database {
  return {
    version: 1,
    profiles: [],
    games: [],
    progress: {},
    usage: [],
    settings: { budget: 5000000, sound: true, engineMs: 300 },
    archiveImported: false,
  };
}
export function validateDatabase(input: unknown): Database {
  const d = databaseSchema.parse(input);
  const ids = new Set(d.profiles.map((p) => p.id));
  if (ids.size !== d.profiles.length) throw Error("Duplicate profiles");
  const nicknames = d.profiles.flatMap((profile) =>
    profile.nickname ? [normalizeNickname(profile.nickname)] : [],
  );
  if (new Set(nicknames).size !== nicknames.length)
    throw Error("nickname_taken");
  if (
    d.profiles.some((p) => !d.progress[p.id]) ||
    Object.keys(d.progress).some((k) => !ids.has(k))
  )
    throw Error("Invalid profile progress");
  if (
    Object.entries(d.progress).some(([owner, p]) =>
      p.attempts.some((a) => a.profileId !== owner),
    )
  )
    throw Error("Mixed profile attempts");
  for (const p of Object.values(d.progress))
    for (const r of p.reviews) {
      const c = new Chess(r.fen);
      c.move({
        from: r.best.slice(0, 2),
        to: r.best.slice(2, 4),
        promotion: r.best[4],
      });
    }
  const gameIds = new Set<string>();
  if (
    Object.entries(d.progress).some(([owner, p]) =>
      p.vision.some((r) => r.profileId !== owner),
    )
  )
    throw Error("Mixed profile vision");
  for (const g of d.games) {
    if (!ids.has(g.profileId) || gameIds.has(g.id))
      throw Error("Invalid game owner or duplicate");
    gameIds.add(g.id);
    const c = new Chess(g.initialFen);
    for (const move of g.moves)
      c.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move[4],
      });
    if (g.analysis.some((a) => a.ply > g.moves.length))
      throw Error("Analysis outside game");
  }
  if (new Set(d.usage.map((u) => u.id)).size !== d.usage.length)
    throw Error("Duplicate expenses");
  return d;
}
export function mergeBackup(current: Database, source: unknown): Database {
  const imported = validateDatabase(source),
    d = structuredClone(current);
  for (const p of imported.profiles) {
    if (!d.profiles.some((x) => x.id === p.id)) {
      d.profiles.push(p);
      d.progress[p.id] = emptyProgress();
    } else d.profiles[d.profiles.findIndex((x) => x.id === p.id)] = p;
    const a = d.progress[p.id],
      b = imported.progress[p.id];
    a.vision = [
      ...new Map([...a.vision, ...b.vision].map((r) => [r.id, r])).values(),
    ];
    a.visionSettings = b.visionSettings;
    a.favorites = [...new Set([...a.favorites, ...b.favorites])];
    const last = (progress: Progress, id: string) =>
      progress.attempts
        .filter((x) => x.itemId === id)
        .map((x) => x.at)
        .sort()
        .at(-1) ?? "";
    const reviews = new Map(a.reviews.map((r) => [r.id, r]));
    for (const r of b.reviews)
      if (!reviews.has(r.id) || last(b, r.id) > last(a, r.id))
        reviews.set(r.id, r);
    a.completed = [...new Set([...a.completed, ...b.completed])];
    a.attempts = [
      ...new Map([...a.attempts, ...b.attempts].map((x) => [x.id, x])).values(),
    ];
    a.activity = [
      ...new Map([...a.activity, ...b.activity].map((x) => [x.id, x])).values(),
    ];
    a.reviews = [...reviews.values()];
  }
  for (const g of imported.games) {
    const i = d.games.findIndex((x) => x.id === g.id);
    if (i < 0) d.games.push(g);
    else if (g.profileId !== d.games[i].profileId)
      throw Error("Conflicting game owner");
    else if (g.updatedAt > d.games[i].updatedAt) d.games[i] = g;
  }
  for (const u of imported.usage) {
    const old = d.usage.find((x) => x.id === u.id);
    if (!old) d.usage.push(u);
    else {
      if (old.month !== u.month) throw Error("Conflicting expense month");
      old.reserved = Math.max(old.reserved, u.reserved);
      old.actual =
        old.actual === null || u.actual === null
          ? null
          : Math.max(old.actual, u.actual);
    }
  }
  d.archiveImported ||= imported.archiveImported;
  d.settings = {
    ...imported.settings,
    budget: Math.min(d.settings.budget, imported.settings.budget),
  };
  return validateDatabase(d);
}
