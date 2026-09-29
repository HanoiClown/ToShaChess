import { Chess } from "chess.js";
import { START } from "../../chess/game";
import type { Course } from "../../library/courses";
export type Text = { ru: string; en: string };
export const text = (ru: string, en: string): Text => ({ ru, en });
export type Step = { san: string; note: Text; detail?: Text };
/** Only notation conversion: every explanation below is supplied by an author. */
export function steps(rows: string): Step[] {
  return rows
    .trim()
    .split("\n")
    .map((row) => {
      const [san, ru, en, detailRu, detailEn] = row
        .split("|")
        .map((s) => s.trim());
      if (!san || !ru || !en)
        throw Error("Missing authored move explanation: " + row);
      return {
        san,
        note: text(ru, en),
        ...(detailRu && detailEn ? { detail: text(detailRu, detailEn) } : {}),
      };
    });
}
export const openGames = steps(`
e4|Белые занимают e4 и освобождают диагональ слону f1; пешка d ещё может поддержать центр.|White claims e4 and frees the f1 bishop; the d-pawn can still support the centre.
e5|Чёрные симметрично удерживают центр: пешка e5 ограничивает d4 и f4.|Black meets the centre directly: the e5 pawn restrains d4 and f4.
Nf3|Конь атакует e5, поэтому развитие одновременно задаёт сопернику конкретный вопрос.|The knight attacks e5, so development also asks Black a concrete question.
Nc6|Конь защищает e5 без закрытия слона f8 и контролирует d4.|The knight protects e5 without closing the f8 bishop and also controls d4.
`);
export type AuthoredPath = { intro: Text; steps: Step[] };
export function compile(path: AuthoredPath, initialFen = START) {
  const c = new Chess(initialFen);
  const notes = {
    ru: { 0: path.intro.ru } as Record<number, string>,
    en: { 0: path.intro.en } as Record<number, string>,
  };
  const details = {
    ru: {} as Record<number, string>,
    en: {} as Record<number, string>,
  };
  const line = path.steps.map((s, i) => {
    const m = c.move(s.san);
    notes.ru[i + 1] = s.note.ru;
    notes.en[i + 1] = s.note.en;
    if (s.detail) {
      details.ru[i + 1] = s.detail.ru;
      details.en[i + 1] = s.detail.en;
    }
    return m.from + m.to + (m.promotion ?? "");
  });
  return { initialFen, line, notes, details };
}
export type Source = { label: string; url: string; license?: string };
export type Episode = {
  id: string;
  title: Text;
  initialFen: string;
  line: string[];
  notes: { ru: Record<number, string>; en: Record<number, string> };
  details?: { ru: Record<number, string>; en: Record<number, string> };
  defence: string[];
  defenceNotes: { ru: Record<number, string>; en: Record<number, string> };
  conditions: Text;
  risk: Text;
  sources: Source[];
  verification?: {
    engine: string;
    depth: number;
    beforeCp: number;
    afterCp: number;
  };
};
export type CourseSeed = {
  id: string;
  title: Text;
  overview: Text;
  main: AuthoredPath;
  replies: AuthoredPath[];
  planStart: number;
  plan: Text;
  episodes: Episode[];
  sources: Source[];
};
export function buildCourse(
  s: CourseSeed,
): Course & { episodes: Episode[]; overview: Text } {
  const main = compile(s.main),
    alts = s.replies.map((p) => compile(p));
  const practiceColor = s.id === "caro" ? ("b" as const) : ("w" as const);
  const basic = { practiceColor, sources: s.sources };
  const ep = s.episodes[0];
  const c = new Chess();
  for (const u of main.line.slice(0, s.planStart))
    c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  const plans = compile(
    { intro: s.plan, steps: s.main.steps.slice(s.planStart) },
    c.fen(),
  );
  const branches = alts.map((a, i) => {
    let atPly = 0;
    while (atPly < main.line.length && main.line[atPly] === a.line[atPly])
      atPly++;
    return {
      id: `${s.id}-reply-${i + 1}`,
      title: s.replies[i].intro,
      atPly,
      line: a.line.slice(atPly),
      notes: a.notes,
      details: a.details,
      sources: s.sources,
    };
  });
  const chapters = [
    {
      ...basic,
      id: "ideas",
      title: text("Идея и цена дебюта", "The idea and its price"),
      summary: s.overview,
      ...compile({
        intro: s.overview,
        steps: s.main.steps.slice(
          0,
          s.id === "caro" ? 8 : s.id === "evans" ? 10 : 6,
        ),
      }),
      branches: [],
    },
    {
      ...basic,
      id: "main",
      title: text(
        "Основная линия: почему именно так",
        "Main line: why these moves",
      ),
      summary: s.main.intro,
      ...main,
      branches,
    },
    {
      ...basic,
      id: "replies",
      title: text("Разные ответы соперника", "Different opposing replies"),
      summary: s.replies[0].intro,
      ...alts[0],
      branches: alts.slice(1).map((a, i) => {
        let atPly = 0;
        while (
          atPly < alts[0].line.length &&
          alts[0].line[atPly] === a.line[atPly]
        )
          atPly++;
        return {
          id: `${s.id}-answer-${i + 2}`,
          title: s.replies[i + 1].intro,
          atPly,
          line: a.line.slice(atPly),
          notes: a.notes,
          details: a.details,
          sources: s.sources,
        };
      }),
    },
    {
      ...basic,
      id: "traps",
      title: text("Ловушки и типичные ошибки", "Traps and typical mistakes"),
      summary: ep.conditions,
      initialFen: ep.initialFen,
      line: ep.line,
      notes: ep.notes,
      details: ep.details,
      branches: [],
    },
    {
      ...basic,
      id: "defence",
      title: text(
        "Защита: не помогай атакующему",
        "Defence: do not help the attacker",
      ),
      summary: ep.risk,
      initialFen: ep.initialFen,
      line: ep.defence,
      notes: ep.defenceNotes,
      branches: [],
    },
    {
      ...basic,
      id: "plans",
      title: text("Структура и дальнейший план", "Structure and the next plan"),
      summary: s.plan,
      ...plans,
      branches: [],
    },
  ];
  return {
    id: s.id,
    title: s.title,
    overview: s.overview,
    chapters,
    episodes: s.episodes,
  };
}
export const sourceFor = (name: string): Source[] => [
  {
    label: "Lichess opening names / move classification",
    url: "https://github.com/lichess-org/chess-openings",
    license: "CC0-1.0",
  },
  {
    label: `Stockfish — local engine verification for ${name}`,
    url: "https://github.com/official-stockfish/Stockfish",
    license: "GPL-3.0 (engine only)",
  },
];
