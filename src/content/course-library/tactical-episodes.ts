import { text, sourceFor, type Episode, type Text } from "./authoring";
import audit from "./episode-audit.json" with { type: "json" };
import { episodeText } from "./episode-text";
export const episodeLibrary: Record<string, Episode[]> = {
  kings: [],
  evans: [],
  scotch: [],
  goring: [],
  danish: [],
  vienna: [],
  morra: [],
  caro: [],
};
for (const block of episodeText.trim().split("\n@")) {
  const [header, ...rows] = block.replace(/^@/, "").split("\n");
  const [key, titleRu, titleEn] = header.split("|");
  const [course, id] = key.split("/");
  const copy: Record<string, Text> = {};
  for (const row of rows.filter(Boolean)) {
    const [kind, ru, en] = row.split("|");
    if (!ru || !en)
      throw Error("Missing bilingual episode field " + key + "/" + kind);
    copy[kind] = text(ru, en);
  }
  for (const kind of ["C", "M", "P", "D", "R", "K"])
    if (!copy[kind]) throw Error("Missing episode field " + key + "/" + kind);
  const entry = audit.find((a) => a.course === course && a.id === id);
  if (!entry) throw Error("Missing engine check " + key);
  const line = entry.line.slice(0, copy.E && copy.F ? 4 : 2);
  const notes = {
    ru: { 0: copy.C.ru, 1: copy.M.ru, 2: copy.P.ru } as Record<number, string>,
    en: { 0: copy.C.en, 1: copy.M.en, 2: copy.P.en } as Record<number, string>,
  };
  if (line.length === 4) {
    notes.ru[3] = copy.E.ru;
    notes.en[3] = copy.E.en;
    notes.ru[4] = copy.F.ru;
    notes.en[4] = copy.F.en;
  }
  episodeLibrary[course].push({
    id: `${course}-${id}`,
    title: text(titleRu, titleEn),
    initialFen: entry.fen,
    line,
    notes,
    details: { ru: { 1: copy.K.ru }, en: { 1: copy.K.en } },
    defence: entry.defence.slice(0, 2),
    defenceNotes: {
      ru: { 0: copy.C.ru, 1: copy.D.ru, 2: copy.R.ru },
      en: { 0: copy.C.en, 1: copy.D.en, 2: copy.R.en },
    },
    conditions: copy.C,
    risk: copy.K,
    sources: sourceFor(course),
    verification: {
      engine:
        "Local Stockfish · 500 ms/position · best found, not proof of uniqueness",
      depth: entry.depth,
      beforeCp: entry.before.cp,
      afterCp: entry.after.cp,
    },
  });
}
