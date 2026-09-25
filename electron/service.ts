import { Chess } from "chess.js";
import type { Store } from "./storage/store";
import { UciEngine } from "./engine/uci";
import { CloudCoach } from "./coach/provider";
import {
  gameSchema,
  profileSchema,
  attemptSchema,
  settingsSchema,
  createProfileSchema,
  emptyProgress,
  normalizeNickname,
} from "./storage/schema";
import { parseGames, boardAt, playUci } from "../src/chess/game";
import {
  classify,
  brilliantCandidate,
  localAdvice,
  themeFor,
} from "../src/analysis/evaluate";
import { recordAttempt } from "../src/learning";
import {
  coachContext,
  parseGrounded,
  responseContract,
} from "./coach/grounding";
import { puzzles } from "../src/content/puzzles";
import { visionSettingsSchema, visionResultSchema } from "./storage/schema";
import type { VisionResult, VisionSettings } from "../src/shared/contracts";
import { randomUUID } from "node:crypto";
import type {
  GameRecord,
  Profile,
  Position,
  Analysis,
  Attempt,
  Database,
  CoachReply,
  Locale,
  CreateProfileInput,
} from "../src/shared/contracts";
export class AppService {
  extraPuzzle?: (
    id: string,
  ) => import("../src/content/puzzles").Puzzle | undefined;
  activeProfile: string | null = null;
  notice: string | null = null;
  apiKey = "";
  keyIssue = false;
  private interactive: UciEngine;
  private background: UciEngine;
  private interactiveAbort: AbortController | null = null;
  jobs = new Map<string, AbortController>();
  readonly cloud: CloudCoach;
  constructor(
    readonly store: Store,
    path: string,
    private notify: () => void,
  ) {
    this.interactive = new UciEngine(path);
    this.background = new UciEngine(path);
    this.cloud = new CloudCoach(store, () => this.apiKey);
  }
  snapshot() {
    return {
      database: this.store.data,
      activeProfile: this.activeProfile,
      hasKey: !!this.apiKey,
      keyIssue: this.keyIssue,
      dataPath: this.store.dir,
      analysisJobs: [...this.jobs.keys()],
      notice: this.notice,
    };
  }
  private owner() {
    if (!this.activeProfile) throw Error("select_profile");
    return this.activeProfile;
  }
  visibleGames() {
    return this.store.data.games.filter(
      (g) => g.profileId === this.activeProfile,
    );
  }
  favorite(profileId: string, puzzleId: string, enabled: boolean) {
    if (profileId !== this.owner()) throw Error("wrong_profile");
    if (
      typeof enabled !== "boolean" ||
      (!puzzles.some((p) => p.id === puzzleId) && !this.extraPuzzle?.(puzzleId))
    )
      throw Error("invalid_puzzle");
    this.store.update((d) => {
      const list = d.progress[profileId].favorites;
      d.progress[profileId].favorites = enabled
        ? [...new Set([...list, puzzleId])]
        : list.filter((id) => id !== puzzleId);
    });
    this.notify();
    return this.snapshot();
  }
  selectProfile(id: string | null) {
    if (id !== null && !this.store.data.profiles.some((p) => p.id === id))
      throw Error("unknown_profile");
    this.cancelEngine();
    this.activeProfile = id;
    this.notice = null;
    this.notify();
    return this.snapshot();
  }
  updateProfile(input: Profile) {
    const profile = profileSchema.parse(input);
    if (profile.id !== this.owner()) throw Error("wrong_profile");
    this.checkNickname(profile.nickname, profile.id);
    this.store.update((d) => {
      const i = d.profiles.findIndex((p) => p.id === profile.id);
      d.profiles[i] = profile;
    });
    this.notify();
    return this.snapshot();
  }
  private checkNickname(nickname?: string, exceptId?: string) {
    if (
      nickname &&
      this.store.data.profiles.some(
        (profile) =>
          profile.id !== exceptId &&
          profile.nickname &&
          normalizeNickname(profile.nickname) === normalizeNickname(nickname),
      )
    )
      throw Error("nickname_taken");
  }
  createProfile(input: CreateProfileInput) {
    const parsed = createProfileSchema.safeParse(input);
    if (!parsed.success) throw Error("invalid_profile");
    if (this.store.data.profiles.length >= 20) throw Error("profile_limit");
    this.checkNickname(parsed.data.nickname);
    const colors = ["#81b64c", "#b69be8", "#85b8e8", "#e79898"];
    const profile: Profile = {
      ...parsed.data,
      id: randomUUID(),
      level: parsed.data.skillLevel === "new" ? "new" : "beginner",
      color: colors[this.store.data.profiles.length % colors.length],
      theme: "green",
    };
    this.store.update((database) => {
      database.profiles.push(profile);
      database.progress[profile.id] = emptyProgress();
    });
    return this.selectProfile(profile.id);
  }
  getGame(id: string, owner = this.owner()) {
    const g = this.store.data.games.find(
      (x) => x.id === id && x.profileId === owner,
    );
    if (!g) throw Error("game_not_found");
    return g;
  }
  saveGame(input: GameRecord) {
    const g = gameSchema.parse(input);
    if (g.profileId !== this.owner()) throw Error("wrong_profile");
    boardAt(g);
    const existing = this.store.data.games.find((x) => x.id === g.id);
    if (existing && existing.profileId !== g.profileId)
      throw Error("wrong_profile");
    // The renderer cannot move an earned completion to a new calendar day.
    g.completedAt =
      existing?.completedAt ??
      (g.mode !== "import" && g.result !== "*"
        ? existing && existing.result !== "*"
          ? existing.createdAt
          : new Date().toISOString()
        : undefined);
    const changed =
      !!existing &&
      (existing.initialFen !== g.initialFen ||
        existing.moves.join(" ") !== g.moves.join(" "));
    if (changed) this.jobs.get(g.id)?.abort();
    this.store.update((d) => {
      const i = d.games.findIndex((x) => x.id === g.id);
      if (i < 0) d.games.push(g);
      else {
        d.games[i] = {
          ...g,
          analysis: changed ? [] : existing!.analysis,
          explanations: changed ? {} : existing!.explanations,
        };
        if (changed)
          d.progress[g.profileId].reviews = d.progress[
            g.profileId
          ].reviews.filter((r) => r.gameId !== g.id);
      }
    });
    this.notify();
    return this.snapshot();
  }
  importPgn(text: string, playerName?: string) {
    const owner = this.owner(),
      name =
        playerName ??
        (this.store.data.profiles.find((p) => p.id === owner)!.nickname || this.store.data.profiles.find((p) => p.id === owner)!.name);
    const games = parseGames(text, owner, name);
    let added = 0,
      skipped = 0;
    this.store.update((d) => {
      for (const g of games) {
        if (d.games.some((x) => x.id === g.id)) {
          skipped++;
          continue;
        }
        d.games.push(g);
        added++;
      }
    });
    this.notify();
    return { added, skipped };
  }
  attempt(input: Attempt) {
    const a = attemptSchema.parse(input),
      owner = this.owner();
    if (a.profileId !== owner) throw Error("wrong_profile");
    const found =
      puzzles.find((p) => p.id === a.itemId) ?? this.extraPuzzle?.(a.itemId);
    if (
      !found &&
      !this.store.data.progress[owner].reviews.some((r) => r.id === a.itemId)
    )
      throw Error("invalid_puzzle");
    this.store.update((d) => {
      const progress = d.progress[owner],
        p = found;
      if (!a.correct && p && !progress.reviews.some((r) => r.id === p.id))
        progress.reviews.push({
          id: p.id,
          fen: p.fen,
          best: p.best,
          theme: p.theme,
          due: a.at,
          interval: 1,
        });
      recordAttempt(progress, a);
    });
    this.notify();
    return this.snapshot();
  }
  recordActivity(profileId: string, section: string, seconds: number) {
    if (profileId !== this.owner()) throw Error("wrong_profile");
    if (
      !Number.isFinite(seconds) ||
      seconds < 0 ||
      seconds > 60 ||
      ![
        "today",
        "play",
        "review",
        "learn",
        "puzzles",
        "history",
        "settings",
        "vision",
        "openings",
        "endgames",
        "database",
      ].includes(section)
    )
      throw Error("invalid_activity");
    if (seconds < 1) return;
    this.store.update((d) => {
      d.progress[profileId].activity.push({
        id: randomUUID(),
        at: new Date().toISOString(),
        seconds: Math.round(seconds),
        section,
      });
    });
    this.notify();
  }
  completeLesson(id: string) {
    if (!/^[a-z0-9_-]{1,100}$/.test(id)) throw Error("invalid_lesson");
    const owner = this.owner();
    this.store.update((d) => {
      if (!d.progress[owner].completed.includes(id))
        d.progress[owner].completed.push(id);
    });
    this.notify();
    return this.snapshot();
  }
  saveVision(input: VisionResult) {
    const result = visionResultSchema.parse(input);
    if (result.profileId !== this.owner()) throw Error("wrong_profile");
    this.store.update((d) => {
      const history = d.progress[result.profileId].vision;
      if (!history.some((r) => r.id === result.id)) history.push(result);
    });
    this.notify();
    return this.snapshot();
  }
  visionSettings(profileId: string, input: VisionSettings) {
    if (profileId !== this.owner()) throw Error("wrong_profile");
    const settings = visionSettingsSchema.parse(input);
    this.store.update((d) => {
      d.progress[profileId].visionSettings = settings;
    });
    this.notify();
    return this.snapshot();
  }
  updateSettings(input: Database["settings"]) {
    const settings = settingsSchema.parse(input);
    this.owner();
    this.store.update((d) => {
      d.settings = settings;
    });
    this.notify();
    return this.snapshot();
  }
  cancelEngine() {
    this.interactiveAbort?.abort();
    this.interactiveAbort = null;
  }
  async engine(position: Position, level?: number) {
    const owner = this.owner();
    this.cancelEngine();
    const abort = new AbortController();
    this.interactiveAbort = abort;
    const c = boardAt(position);
    if (position.moves.length > 4000) throw Error("position_too_large");
    const ms = level === 4 ? 1500 : level === 3 ? 700 : 250;
    let lines = await this.interactive.analyze(
      position,
      ms,
      level !== undefined && level < 3 ? 5 : 3,
      abort.signal,
    );
    if (
      level !== undefined &&
      level < 3 &&
      Math.random() < [0.72, 0.35, 0.12][level]
    ) {
      const moves = c.moves({ verbose: true });
      if (moves.length) {
        const m = moves[Math.floor(Math.random() * moves.length)];
        const u = m.from + m.to + (m.promotion ?? "");
        const child = await this.interactive.analyze(
          { ...position, moves: [...position.moves, u] },
          100,
          1,
          abort.signal,
        );
        lines = [{ ...child[0], pv: [u, ...child[0].pv] }];
      }
    }
    if (abort.signal.aborted || owner !== this.activeProfile)
      throw Error("Cancelled");
    return lines;
  }
  analyze(id: string) {
    const owner = this.owner(),
      original = structuredClone(this.getGame(id, owner));
    if (original.mode === "normal" && original.result === "*")
      throw Error("finish_game_first");
    if (this.jobs.has(id) && !this.jobs.get(id)!.signal.aborted) return;
    const controller = new AbortController();
    this.jobs.set(id, controller);
    this.notify();
    void this.runAnalysis(original, controller)
      .catch((e) => {
        if (!controller.signal.aborted) {
          this.notice = String(e.message ?? e);
        }
      })
      .finally(() => {
        if (this.jobs.get(id) === controller) this.jobs.delete(id);
        this.notify();
      });
  }
  cancelAnalysis(id: string) {
    this.getGame(id);
    this.jobs.get(id)?.abort();
  }
  private async runAnalysis(game: GameRecord, abort: AbortController) {
    const ms = this.store.data.settings.engineMs;
    let beforeLines = await this.background.analyze(
      { initialFen: game.initialFen, moves: [] },
      ms,
      3,
      abort.signal,
    );
    for (let i = 0; i < game.moves.length; i++) {
      if (abort.signal.aborted) throw Error("Cancelled");
      const cached = this.getGame(game.id, game.profileId).analysis.find(
        (a) => a.ply === i + 1,
      );
      if (cached && !cached.provisional) {
        beforeLines = [cached.after];
        continue;
      }
      const position = {
          initialFen: game.initialFen,
          moves: game.moves.slice(0, i + 1),
        },
        pre = boardAt(game, i),
        color = pre.turn();
      let afterLines = await this.background.analyze(
        position,
        ms,
        3,
        abort.signal,
      );
      let quality = classify(
        beforeLines[0].score,
        afterLines[0].score,
        color,
        beforeLines[0].pv[0] === game.moves[i],
        pre.moves().length,
      );
      if (["blunder", "mistake"].includes(quality)) {
        beforeLines = await this.background.analyze(
          { initialFen: game.initialFen, moves: game.moves.slice(0, i) },
          Math.min(1500, ms * 3),
          3,
          abort.signal,
        );
        afterLines = await this.background.analyze(
          position,
          Math.min(1500, ms * 3),
          3,
          abort.signal,
        );
        quality = classify(
          beforeLines[0].score,
          afterLines[0].score,
          color,
          beforeLines[0].pv[0] === game.moves[i],
          pre.moves().length,
        );
      }
      if (abort.signal.aborted) throw Error("Cancelled");
      if (brilliantCandidate(pre, game.moves[i], beforeLines, afterLines[0]))
        quality = "brilliant";
      const a: Analysis = {
        ply: i + 1,
        before: beforeLines[0],
        after: afterLines[0],
        best: beforeLines[0].pv[0] ?? game.moves[i],
        quality,
        loss: Math.max(
          0,
          (beforeLines[0].score.cp - afterLines[0].score.cp) *
            (color === "w" ? 1 : -1),
        ),
        provisional: false,
      };
      this.store.update((d) => {
        const target = d.games.find(
          (x) => x.id === game.id && x.profileId === game.profileId,
        )!;
        target.analysis = target.analysis
          .filter((x) => x.ply !== a.ply)
          .concat(a)
          .sort((x, y) => x.ply - y.ply);
        target.updatedAt = new Date().toISOString();
        if (
          color === game.playerColor &&
          ["blunder", "mistake"].includes(quality)
        ) {
          const list = d.progress[game.profileId].reviews,
            rid = `${game.id}_${a.ply}`;
          if (!list.some((r) => r.id === rid))
            list.push({
              id: rid,
              fen: pre.fen(),
              best: a.best,
              theme: themeFor(game, a),
              due: new Date().toISOString(),
              interval: 1,
              gameId: game.id,
              ply: a.ply,
            });
        }
      });
      beforeLines = afterLines;
      this.notify();
    }
    if (this.apiKey && !abort.signal.aborted) {
      try {
        await this.autoExplain(game.id, game.profileId, abort.signal);
      } catch (e) {
        this.notice = String((e as Error).message);
      }
    }
  }
  private async autoExplain(id: string, owner: string, signal: AbortSignal) {
    const locale = this.store.data.profiles.find((p) => p.id === owner)!.locale;
    const game = this.getGame(id, owner),
      missing = game.analysis.filter(
        (a) => !game.explanations[locale]?.[String(a.ply)],
      );
    for (let i = 0; i < missing.length; i += 8) {
      if (signal.aborted) return;
      const batch = missing.slice(i, i + 8);
      const facts = batch.map((a) => coachContext(game, a, locale));
      const raw = await this.cloud.request(
        responseContract + " Data: " + JSON.stringify(facts),
        locale,
      );
      if (signal.aborted) return;
      const parsed = { moves: parseGrounded(raw, facts) };
      this.store.update((d) => {
        const target = d.games.find(
          (g) => g.id === id && g.profileId === owner,
        )!;
        const cache = target.explanations[locale] ?? {};
        for (const x of parsed.moves) cache[String(x.ply)] = x.text;
        target.explanations[locale] = cache;
        target.updatedAt = new Date().toISOString();
      });
      this.notify();
    }
  }
  async coach(id: string, ply: number, question = ""): Promise<CoachReply> {
    const owner = this.owner(),
      game = structuredClone(this.getGame(id)),
      a = game.analysis.find((x) => x.ply === ply);
    if (!a) throw Error("analysis_not_ready");
    const locale = this.store.data.profiles.find((p) => p.id === owner)!.locale;
    if (!question && game.explanations[locale]?.[String(ply)])
      return {
        source: "openai",
        text: game.explanations[locale]![String(ply)],
      };
    if (!this.apiKey)
      return { source: "local", text: localAdvice(game, a, locale, question) };
    try {
      const context = coachContext(game, a, locale);
      const raw = await this.cloud.request(
        responseContract +
          " Data: " +
          JSON.stringify({
            positions: [context],
            question: question.slice(0, 2000) || "Explain this move.",
          }),
        locale,
      );
      const text = parseGrounded(raw, [context])[0].text;
      const current = this.getGame(id, owner);
      if (
        current.initialFen !== game.initialFen ||
        current.moves.join(" ") !== game.moves.join(" ")
      )
        throw Error("Cancelled");
      if (!question)
        this.store.update((d) => {
          const target = d.games.find(
            (g) => g.id === id && g.profileId === owner,
          )!;
          target.explanations[locale] = {
            ...target.explanations[locale],
            [String(ply)]: text,
          };
          target.updatedAt = new Date().toISOString();
        });
      this.notify();
      return { source: "openai", text };
    } catch (e) {
      this.notice = String((e as Error).message);
      this.notify();
      return { source: "local", text: localAdvice(game, a, locale, question) };
    }
  }
  dispose() {
    this.cancelEngine();
    for (const c of this.jobs.values()) c.abort();
    this.interactive.dispose();
    this.background.dispose();
  }
}
