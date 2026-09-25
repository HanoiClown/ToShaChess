import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
export function seedLibrary(dir: string) {
  mkdirSync(dir, { recursive: true });
  const p = new DatabaseSync(join(dir, "puzzles.sqlite"));
  p.exec(
    "CREATE TABLE puzzles(id TEXT PRIMARY KEY,fen TEXT,moves TEXT,rating INTEGER,themes TEXT,game_url TEXT,popularity INTEGER,plays INTEGER,opening_tags TEXT); CREATE TABLE puzzle_themes(theme TEXT,puzzle_id TEXT,rating INTEGER); CREATE INDEX puzzles_rating_id ON puzzles(rating,id); CREATE INDEX puzzle_themes_theme_rating_id ON puzzle_themes(theme,rating,puzzle_id); CREATE TABLE metadata(key TEXT PRIMARY KEY,value TEXT); INSERT INTO metadata VALUES('count','1');",
  );
  p.prepare("INSERT INTO puzzles VALUES(?,?,?,?,?,?,?,?,?)").run(
    "lichess_TST01",
    "7k/8/5KQ1/8/8/8/8/8 w - - 0 1",
    "g6g7",
    800,
    "mate mateIn1",
    "https://lichess.org/test",
    100,
    1000,
    "",
  );
  p.exec("INSERT INTO puzzle_themes VALUES('mateIn1','lichess_TST01',800)");
  p.close();
  const pgn =
    '[Event "Test fixture"]\n[White "Example"]\n[Black "Opponent"]\n[Result "0-1"]\n[ECO "A00"]\n\n1. f3 e5 2. g4 Qh4# 0-1\n';
  writeFileSync(join(dir, "sample.pgn"), pgn);
  const g = new DatabaseSync(join(dir, "games.sqlite"));
  g.exec(
    "CREATE TABLE games(id INTEGER PRIMARY KEY,site TEXT,white TEXT,black TEXT,result TEXT,date TEXT,white_elo INTEGER,black_elo INTEGER,eco TEXT,opening TEXT,time_control TEXT,byte_offset INTEGER,byte_length INTEGER,source_file TEXT); CREATE TABLE metadata(key TEXT PRIMARY KEY,value TEXT); INSERT INTO metadata VALUES('count','1'); CREATE INDEX games_eco_id ON games(eco,id); CREATE INDEX games_white_id ON games(white COLLATE NOCASE,id); CREATE INDEX games_black_id ON games(black COLLATE NOCASE,id); CREATE INDEX games_white_elo_id ON games(white_elo,id); CREATE INDEX games_black_elo_id ON games(black_elo,id);",
  );
  g.prepare("INSERT INTO games VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
    1,
    "https://lichess.org/test",
    "Example",
    "Opponent",
    "0-1",
    "2020.01.01",
    1500,
    1600,
    "A00",
    "Test opening",
    "300+0",
    0,
    Buffer.byteLength(pgn),
    "sample.pgn",
  );
  g.close();
}
