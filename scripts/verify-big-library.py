"""Verify an installed offline pack against its manifest without modifying it."""
from __future__ import annotations

import argparse
import contextlib
import hashlib
import io
import json
from pathlib import Path
import sqlite3
import sys


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8 * 1024**2), b""):
            h.update(chunk)
    return h.hexdigest()


def verify(pack, full_hash=False, legal=False, samples=101):
    pack = pack.resolve()
    manifest = json.loads((pack / "manifest.json").read_text(encoding="utf-8"))
    if not isinstance(manifest, dict):
        raise ValueError("Manifest must be a JSON object")
    if manifest.get("status") != "ready":
        raise ValueError("Pack is not marked ready; installation may still be running")
    if manifest.get("schemaVersion") != 1 or manifest.get("license") != "CC0-1.0":
        raise ValueError("Unrecognized manifest schema/license")
    if type(manifest.get("maxPackBytes")) is not int or manifest["maxPackBytes"] < 1:
        raise ValueError("Invalid manifest size bound")
    for kind in ("puzzles", "games"):
        meta = manifest.get(kind)
        if not isinstance(meta, dict):
            raise ValueError(f"Invalid manifest section: {kind}")
        if type(meta.get("count")) is not int or meta["count"] < 1:
            raise ValueError(f"Invalid manifest count: {kind}")
    if legal:
        import chess
        import chess.pgn

    def check_file(filename, expected_bytes, expected_hash):
        if not isinstance(filename, str) or not filename:
            raise ValueError("Invalid manifest filename")
        if type(expected_bytes) is not int or expected_bytes < 0:
            raise ValueError(f"Invalid manifest byte size: {filename}")
        if (not isinstance(expected_hash, str) or len(expected_hash) != 64
                or any(c not in "0123456789abcdef" for c in expected_hash)):
            raise ValueError(f"Invalid manifest SHA256: {filename}")
        path = (pack / filename).resolve()
        if not path.is_relative_to(pack) or path.parent != pack:
            raise ValueError("Manifest file is outside the library folder")
        if path.stat().st_size != expected_bytes:
            raise ValueError(f"Size mismatch: {filename}")
        if full_hash and sha256(path) != expected_hash:
            raise ValueError(f"SHA256 mismatch: {filename}")
        return path

    puzzle_meta, game_meta = manifest["puzzles"], manifest["games"]
    puzzle_file = check_file(puzzle_meta["file"], puzzle_meta["bytes"], puzzle_meta["sha256"])
    game_file = check_file(game_meta["file"], game_meta["bytes"], game_meta["sha256"])
    pgn_file = check_file(game_meta["pgnFile"], game_meta["pgnBytes"], game_meta["pgnSha256"])
    checks = {"puzzles": 0, "games": 0}

    for kind, path, meta in (("puzzles", puzzle_file, puzzle_meta), ("games", game_file, game_meta)):
        with contextlib.closing(sqlite3.connect(path.as_uri() + "?mode=ro", uri=True)) as db:
            if db.execute("PRAGMA quick_check").fetchone()[0] != "ok":
                raise ValueError(f"SQLite integrity failed: {kind}")
            count = db.execute(f"SELECT COUNT(*) FROM {kind}").fetchone()[0]
            metadata_row = db.execute("SELECT value FROM metadata WHERE key='count'").fetchone()
            if metadata_row is None or not isinstance(metadata_row[0], str) or not metadata_row[0].isdecimal():
                raise ValueError(f"Missing or invalid metadata count: {kind}")
            metadata_count = int(metadata_row[0])
            if count != meta["count"] or count != metadata_count:
                raise ValueError(f"Count mismatch: {kind}")
            id_column = "rowid" if kind == "puzzles" else "id"
            first_id = db.execute(f"SELECT {id_column} FROM {kind} ORDER BY {id_column} LIMIT 1").fetchone()
            last_id = db.execute(f"SELECT {id_column} FROM {kind} ORDER BY {id_column} DESC LIMIT 1").fetchone()
            if first_id != (1,) or last_id != (count,):
                raise ValueError(f"Record IDs must be contiguous from 1 to count: {kind}")
            sample_slots = min(samples, count)
            ids = sorted({1 + round(i * (count - 1) / max(1, sample_slots - 1)) for i in range(sample_slots)})
            placeholders = ",".join("?" for _ in ids)
            if kind == "puzzles":
                for puzzle_id, fen, moves in db.execute(
                        f"SELECT id,fen,moves FROM puzzles WHERE rowid IN ({placeholders})", ids):
                    if not puzzle_id.startswith("lichess_") or len(fen.split()) != 6 or not moves:
                        raise ValueError(f"Invalid puzzle record: {puzzle_id}")
                    if legal:
                        board = chess.Board(fen)
                        for uci in moves.split():
                            move = chess.Move.from_uci(uci)
                            if not board.is_legal(move):
                                raise ValueError(f"Illegal puzzle continuation: {puzzle_id}")
                            board.push(move)
                    checks["puzzles"] += 1
            else:
                with pgn_file.open("rb") as pgn:
                    for game_id, offset, length, filename, next_offset in db.execute(
                            f"""SELECT g.id,g.byte_offset,g.byte_length,g.source_file,n.byte_offset
                                FROM games AS g LEFT JOIN games AS n ON n.id=g.id+1
                                WHERE g.id IN ({placeholders})""", ids):
                        if filename != pgn_file.name or offset < 0 or length < 1 or offset + length > game_meta["pgnBytes"]:
                            raise ValueError(f"Invalid PGN range: {game_id}")
                        expected_end = game_meta["pgnBytes"] if game_id == count else next_offset
                        if offset + length != expected_end:
                            raise ValueError(f"Invalid PGN end boundary: {game_id}")
                        if length > 1024**2:
                            raise ValueError(f"Unexpectedly large individual PGN: {game_id}")
                        pgn.seek(offset)
                        raw = pgn.read(length).decode("utf-8")
                        if not raw.startswith('[Event "') or raw.count('[Event "') != 1:
                            raise ValueError(f"Invalid PGN boundaries: {game_id}")
                        if legal:
                            game = chess.pgn.read_game(io.StringIO(raw))
                            if game is None or game.errors:
                                raise ValueError(f"Illegal sampled PGN: {game_id}")
                        checks["games"] += 1
            if checks[kind] != sample_slots:
                raise ValueError(f"Missing sampled records: {kind}")
    payload_bytes = puzzle_meta["bytes"] + game_meta["bytes"] + game_meta["pgnBytes"]
    if payload_bytes > manifest["maxPackBytes"]:
        raise ValueError("Data payload exceeds the declared size bound")
    return {"ok": True, "pack": str(pack), "puzzles": puzzle_meta["count"],
            "games": game_meta["count"], "payloadBytes": payload_bytes,
            "payloadGiB": round(payload_bytes / 1024**3, 3), "sha256Checked": full_hash,
            "sampledRecords": checks, "sampledLinesLegallyReplayed": legal}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pack", nargs="?", type=Path,
                        default=Path(__file__).resolve().parent.parent / "library-packs")
    parser.add_argument("--full-hash", action="store_true", help="Read and SHA256-check every payload byte")
    parser.add_argument("--legal", action="store_true", help="Legally replay sampled puzzles and games (requires python-chess)")
    parser.add_argument("--samples", type=int, default=101, help="Evenly spaced records per database (1..10001)")
    args = parser.parse_args()
    if not 1 <= args.samples <= 10001:
        parser.error("--samples must be in 1..10001")
    try:
        print(json.dumps(verify(args.pack, args.full_hash, args.legal, args.samples), ensure_ascii=False, indent=2))
    except (OSError, ValueError, KeyError, sqlite3.Error, ImportError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
