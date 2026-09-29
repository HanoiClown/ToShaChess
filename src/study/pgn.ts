import { Chess } from "chess.js";
import { boardAt, playUci, START } from "../chess/game";
import {
  addStudyMove,
  createStudy,
  getStudyPosition,
  updateStudyNode,
  validateStudy,
  STUDY_LIMITS,
  type StudyDocument,
} from "./tree";
type Token = { type: "comment" | "word" | "(" | ")"; value: string };
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  for (let i = 0; i < input.length;) {
    const c = input[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === ";") {
      const end = input.indexOf("\n", i);
      i = end < 0 ? input.length : end;
      continue;
    }
    if (c === "{") {
      const end = input.indexOf("}", i + 1);
      if (end < 0) throw Error("study_pgn_invalid");
      tokens.push({ type: "comment", value: input.slice(i + 1, end).trim() });
      i = end + 1;
      continue;
    }
    if (c === "(" || c === ")") {
      tokens.push({ type: c, value: c });
      i++;
      continue;
    }
    if (c === "}" || c === "[") throw Error("study_pgn_invalid");
    const start = i;
    while (i < input.length && !/[\s{}();]/.test(input[i])) i++;
    tokens.push({ type: "word", value: input.slice(start, i) });
  }
  return tokens;
}
function encodeComment(value: string) {
  return btoa(
    Array.from(new TextEncoder().encode(value), (n) =>
      String.fromCharCode(n),
    ).join(""),
  );
}
function decodeComment(value: string) {
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(atob(value), (c) => c.charCodeAt(0)),
  );
}
export function importStudyPgn(
  pgn: string,
  input: { profileId: string; title?: string; sourceKey?: string },
): StudyDocument {
  if (new TextEncoder().encode(pgn).length > STUDY_LIMITS.pgnBytes)
    throw Error("study_pgn_size");
  const headers: Record<string, string> = {};
  let body = pgn.replace(/^\uFEFF/, "").trim();
  while (body.startsWith("[")) {
    const h = body.match(
      /^\[([A-Za-z][A-Za-z0-9_]{0,79})\s+"((?:\\[\\"]|[^"\\])*)"\s*\]\s*/,
    );
    if (
      !h ||
      Object.keys(headers).length >= 100 ||
      h[1] in headers ||
      h[2].length > 2000
    )
      throw Error("study_pgn_invalid");
    headers[h[1]] = h[2].replace(/\\([\\"])/g, "$1");
    body = body.slice(h[0].length);
  }
  let study = createStudy({
    ...input,
    title: input.title ?? headers.Event ?? "Study",
    initialFen: headers.FEN ?? START,
  });
  study.headers = headers;
  const tokens = tokenize(body);
  let cursor = 0;
  function sequence(startId: string, nesting: number): void {
    if (nesting > STUDY_LIMITS.branches) throw Error("study_pgn_nesting");
    let currentId = startId,
      priorId: string | null = null,
      ended = false;
    while (cursor < tokens.length) {
      const token = tokens[cursor++];
      if (token.type === ")") {
        if (!nesting) throw Error("study_pgn_invalid");
        return;
      }
      if (token.type === "(") {
        if (!priorId || ended) throw Error("study_pgn_invalid");
        sequence(priorId, nesting + 1);
        continue;
      }
      if (token.type === "comment") {
        let comment = token.value,
          bookmarked = study.nodes[currentId].bookmarked;
        const encoded = comment.match(/\[%tosha-comment ([A-Za-z0-9+/=]+)\]/);
        if (encoded) {
          try {
            comment = decodeComment(encoded[1]);
          } catch {
            throw Error("study_pgn_invalid");
          }
        } else {
          bookmarked ||= comment.includes("[%tosha-bookmark]");
          comment = comment.replace(/\[%tosha-bookmark\]/g, "").trim();
        }
        bookmarked ||= token.value.includes("[%tosha-bookmark]");
        const previous = study.nodes[currentId].comment;
        study = updateStudyNode(study, currentId, {
          comment: previous ? previous + "\n" + comment : comment,
          bookmarked,
        });
        continue;
      }
      let word = token.value.replace(/^\d+\.(?:\.\.)?/, "");
      if (
        !word ||
        /^\.+$/.test(word) ||
        /^\$\d+$/.test(word) ||
        /^[!?]+$/.test(word)
      )
        continue;
      if (ended) throw Error("study_pgn_invalid");
      if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(word)) {
        ended = true;
        if (!nesting) study.headers.Result = word;
        continue;
      }
      word = word.replace(/[!?]+$/, "").replace(/0/g, "O");
      const board = boardAt(getStudyPosition(study, currentId));
      let move;
      try {
        move = board.move(word, { strict: true });
      } catch {
        throw Error("study_pgn_invalid");
      }
      priorId = currentId;
      study = addStudyMove(
        study,
        currentId,
        move.from + move.to + (move.promotion ?? ""),
      );
      currentId = study.selectedNodeId;
    }
    if (nesting) throw Error("study_pgn_invalid");
  }
  sequence(study.rootId, 0);
  if (
    !study.nodes[study.rootId].children.length &&
    !study.headers.FEN &&
    !study.headers.Result
  )
    throw Error("study_pgn_invalid");
  study.selectedNodeId = study.rootId;
  return validateStudy(study);
}
export function exportStudyPgn(input: StudyDocument): string {
  const study = validateStudy(input),
    headers: Record<string, string> = { ...study.headers, Event: study.title };
  if (study.initialFen !== new Chess(START).fen()) {
    headers.SetUp = "1";
    headers.FEN = study.initialFen;
  } else {
    delete headers.SetUp;
    delete headers.FEN;
  }
  headers.Result = /^(1-0|0-1|1\/2-1\/2|\*)$/.test(headers.Result ?? "")
    ? headers.Result
    : "*";
  const comment = (id: string) => {
    const n = study.nodes[id];
    if (!n.comment && !n.bookmarked) return "";
    const readable = n.comment.replace(/[{}]/g, (c) => (c === "{" ? "(" : ")"));
    const encoded = /[{}]/.test(n.comment)
      ? ` [%tosha-comment ${encodeComment(n.comment)}]`
      : "";
    return `{${readable}${encoded}${n.bookmarked ? " [%tosha-bookmark]" : ""}}`;
  };
  const continuation = (parentId: string, fen: string): string[] => {
    const parent = study.nodes[parentId];
    if (!parent.mainChildId) return [];
    const ids = [
        parent.mainChildId,
        ...parent.children.filter((id) => id !== parent.mainChildId),
      ],
      first = ids[0];
    const renderMove = (id: string) => {
      const b = new Chess(fen),
        number = b.moveNumber(),
        side = b.turn(),
        m = playUci(b, study.nodes[id].uci!);
      return {
        text: [
          `${number}.${side === "b" ? ".." : ""}`,
          m.san,
          comment(id),
        ].filter(Boolean),
        fen: b.fen(),
      };
    };
    const main = renderMove(first),
      out = [...main.text];
    for (const id of ids.slice(1)) {
      const alternative = renderMove(id);
      out.push(
        `(${[...alternative.text, ...continuation(id, alternative.fen)].join(" ")})`,
      );
    }
    out.push(...continuation(first, main.fen));
    return out;
  };
  const tags = Object.entries(headers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([key, value]) =>
        `[${key} "${value
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"')
          .replace(/[\r\n]/g, " ")}"]`,
    )
    .join("\n");
  return (
    tags +
    "\n\n" +
    [
      comment(study.rootId),
      ...continuation(study.rootId, study.initialFen),
      headers.Result,
    ]
      .filter(Boolean)
      .join(" ")
  );
}
