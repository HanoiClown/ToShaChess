"""Install the useful, CC0 Lichess offline pack (Python 3.14 + python-chess).

Downloads are resumable, use at most four concurrent HTTPS requests, and verify
the published game-archive SHA256. SQLite files are published only after checks.
No uncompressed duplicate puzzle CSV or duplicate game payload is retained.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import contextlib
import csv
import datetime
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import sqlite3
import subprocess
import threading
import time
import urllib.error
import urllib.request
from compression import zstd

import chess
import chess.pgn

ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT / "library-packs"
CACHE = PACK / ".download"
PUZZLE_URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst"
GAME_URL = "https://database.lichess.org/standard/lichess_db_standard_rated_2016-12.pgn.zst"
GAME_SHA256 = "285d09bcb7f47af2d58594ecee7da8c18f9e800fd7df2e0158b4fb5429f9a904"
GAME_COUNT = 9_433_412
PUZZLE_COUNT = 6_100_952
MIN_PUZZLE_COUNT = 1_000_000
MAX_PUZZLE_COUNT = 20_000_000
MAX_PACK_BYTES = 20 * 1024**3
MAX_PGN_BYTES = 14 * 1024**3
CHUNK_SIZE = 4 * 1024**2
NETWORK_SLOTS = threading.Semaphore(4)
PRINT_LOCK = threading.Lock()
MANIFEST_LOCK = threading.Lock()
PROGRESS_LOCK = threading.Lock()
PROGRESS = {}
STOP = threading.Event()


def log(event, **data):
    with PRINT_LOCK:
        print(json.dumps({"time": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                          "event": event, **data}, ensure_ascii=False), flush=True)


def request(url, headers=None):
    return urllib.request.urlopen(urllib.request.Request(url, headers={
        "User-Agent": "ToShaChess-offline-library/1.3 (CC0 personal offline archive)",
        **(headers or {})}), timeout=90)


def file_hash(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8 * 1024**2), b""):
            h.update(chunk)
    return h.hexdigest()


def write_json(path, value):
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")
    temp.replace(path)


def update_manifest(section, value):
    with MANIFEST_LOCK:
        path = PACK / "manifest.json"
        m = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {
            "schemaVersion": 1, "license": "CC0-1.0",
            "source": "https://database.lichess.org/", "maxPackBytes": MAX_PACK_BYTES,
            "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat()}
        m[section] = value
        write_json(path, m)


def reporter():
    while not STOP.wait(30):
        with PROGRESS_LOCK:
            snapshot = dict(PROGRESS)
        log("progress", jobs=snapshot)


def validate_chunk_directory(path):
    expected_cache = PACK.resolve() / ".download"
    resolved = path.resolve()
    if CACHE.resolve() != expected_cache or resolved.parent != expected_cache:
        raise RuntimeError("Download chunk path resolves outside the intended .download folder")
    return resolved


def download(url, expected_sha=None):
    name = url.rsplit("/", 1)[1]
    final = CACHE / name
    archive_metadata = final.with_suffix(final.suffix + ".source.json")
    with NETWORK_SLOTS, request(url, {"Range": "bytes=0-0"}) as r:
        cr = r.headers.get("Content-Range", "")
        if r.status != 206 or not cr.startswith("bytes 0-0/"):
            raise RuntimeError(f"Source does not support bounded byte-range requests: {url}")
        total = int(cr.rsplit("/", 1)[1])
        etag = r.headers.get("ETag")
        modified = r.headers.get("Last-Modified")
    if total > 3 * 1024**3:
        raise RuntimeError(f"Unexpected source size: {total}")
    chunks_dir = validate_chunk_directory(CACHE / (name + ".chunks"))
    chunks_dir.mkdir(parents=True, exist_ok=True)
    identity = chunks_dir / "source.json"
    source = {"url": url, "bytes": total, "etag": etag, "lastModified": modified}
    if identity.exists() and json.loads(identity.read_text()) != source:
        raise RuntimeError(f"Upstream file changed; inspect old download before retrying: {identity}")
    identity.write_text(json.dumps(source), encoding="utf-8")
    if final.exists() and final.stat().st_size == total:
        cached = json.loads(archive_metadata.read_text()) if archive_metadata.exists() else None
        if cached and {key: cached.get(key) for key in source} != source:
            raise RuntimeError(f"Cached archive upstream identity changed; preserved {final}")
        if not cached and not expected_sha:
            raise RuntimeError(f"Cached rolling archive has no source metadata; preserved {final}")
        digest = file_hash(final)
        if expected_sha and digest != expected_sha:
            raise RuntimeError(f"Existing archive checksum mismatch: {final}")
        if cached and cached.get("sha256") and digest != cached["sha256"]:
            raise RuntimeError(f"Cached archive checksum mismatch: {final}")
        result = {**source, "sha256": digest, "upstreamSha256Verified": bool(expected_sha)}
        write_json(archive_metadata, result)
        return final, result
    chunks = [(i, start, min(total - 1, start + CHUNK_SIZE - 1))
              for i, start in enumerate(range(0, total, CHUNK_SIZE))]

    def part(item):
        i, start, end = item
        out = chunks_dir / f"{i:06d}.part"
        needed = end - start + 1
        if out.exists() and out.stat().st_size == needed:
            return
        for attempt in range(8):
            have = out.stat().st_size if out.exists() else 0
            if have == needed:
                return
            if have > needed:
                raise RuntimeError(f"Oversized range chunk: {out}")
            try:
                curl = shutil.which("curl.exe")
                if curl:
                    # Native Schannel curl is substantially faster than urllib/OpenSSL
                    # on this Windows connection. Still validate every requested range.
                    body = out.with_suffix(".curl")
                    headers_file = out.with_suffix(".headers")
                    with NETWORK_SLOTS:
                        response = subprocess.run([curl, "--silent", "--show-error", "--fail",
                            "--location", "--range", f"{start + have}-{end}",
                            "--header", "If-Range: " + (etag or modified),
                            "--user-agent", "ToShaChess-offline-library/1.3",
                            "--connect-timeout", "30", "--max-time", "180",
                            "--dump-header", str(headers_file), "--output", str(body),
                            "--write-out", "%{http_code}", url], capture_output=True, text=True,
                            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
                    status = int(response.stdout.strip() or "0")
                    if status >= 400:
                        raise urllib.error.HTTPError(url, status, response.stderr, {}, None)
                    header_text = headers_file.read_text().lower() if headers_file.exists() else ""
                    expected_range = f"content-range: bytes {start + have}-{end}/{total}"
                    if status != 206 or expected_range not in [line.strip() for line in header_text.splitlines()]:
                        raise RuntimeError("Native downloader returned an unexpected HTTP range")
                    if body.stat().st_size + have > needed:
                        raise RuntimeError("HTTP range exceeded requested size")
                    with out.open("ab") as target, body.open("rb") as src:
                        shutil.copyfileobj(src, target, length=1024**2)
                    body.unlink()
                    headers_file.unlink()
                    if response.returncode:
                        raise IOError(response.stderr.strip())
                else:
                    with NETWORK_SLOTS, request(url, {"Range": f"bytes={start + have}-{end}",
                                                      "If-Range": etag or modified}) as r:
                        if r.status != 206 or r.headers.get("Content-Range") != f"bytes {start + have}-{end}/{total}":
                            raise RuntimeError("Server returned unexpected range or changed source")
                        with out.open("ab") as f:
                            while block := r.read(256 * 1024):
                                if f.tell() + len(block) > needed:
                                    raise RuntimeError("HTTP range exceeded requested size")
                                f.write(block)
                if out.stat().st_size != needed:
                    raise IOError("Truncated HTTP range")
                with PROGRESS_LOCK:
                    PROGRESS[name] = {"phase": "download", "bytes": sum(p.stat().st_size for p in chunks_dir.glob("*.part")), "total": total}
                return
            except (OSError, urllib.error.URLError) as exc:
                delay = min(60, 2 ** (attempt + 1))
                if isinstance(exc, urllib.error.HTTPError) and exc.code == 429:
                    delay = max(delay, int(exc.headers.get("Retry-After", "60")))
                log("download-retry", file=name, part=i, error=str(exc), delaySeconds=delay)
                time.sleep(delay)
        raise RuntimeError(f"Cannot download range {start}-{end}")

    log("download-start", **source)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(part, chunks))
    assembling = final.with_suffix(final.suffix + ".assembling")
    h = hashlib.sha256()
    with assembling.open("wb") as out:
        for i, _, _ in chunks:
            part_path = chunks_dir / f"{i:06d}.part"
            with part_path.open("rb") as f:
                while block := f.read(1024**2):
                    h.update(block)
                    out.write(block)
    digest = h.hexdigest()
    if expected_sha and digest != expected_sha:
        raise RuntimeError(f"Archive SHA256 mismatch for {name}: {digest}")
    result = {**source, "sha256": digest, "upstreamSha256Verified": bool(expected_sha)}
    write_json(archive_metadata, result)
    assembling.replace(final)
    # These bounded, verified download chunks are now represented by the archive.
    validate_chunk_directory(chunks_dir)
    for i, _, _ in chunks:
        (chunks_dir / f"{i:06d}.part").unlink()
    identity.unlink()
    chunks_dir.rmdir()
    log("download-complete", **result)
    return final, result


def connection(path):
    db = sqlite3.connect(path)
    db.execute("PRAGMA journal_mode=OFF")
    db.execute("PRAGMA synchronous=OFF")
    db.execute("PRAGMA temp_store=FILE")
    db.execute("PRAGMA cache_size=-65536")
    return db


def restore_completed(kind):
    """Validate existing payloads and restore a manifest lost after atomic publish."""
    final = PACK / f"{kind}.sqlite"
    if not final.exists():
        return False
    manifest_path = PACK / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    prior = manifest.get(kind, {})
    with contextlib.closing(sqlite3.connect(final.as_uri() + "?mode=ro", uri=True)) as db:
        if db.execute("PRAGMA quick_check").fetchone()[0] != "ok":
            raise RuntimeError(f"Installed {kind} SQLite integrity failed; files preserved")
        metadata = dict(db.execute("SELECT key,value FROM metadata"))
        count = db.execute(f"SELECT COUNT(*) FROM {kind}").fetchone()[0]
        if count != int(metadata.get("count", "-1")) or (prior and count != prior.get("count")):
            raise RuntimeError(f"Installed {kind} count differs from metadata/manifest; files preserved")
        source = json.loads(metadata["source_json"]) if "source_json" in metadata else prior.get("source")
        if not source:
            raise RuntimeError(f"Installed {kind} is missing provenance metadata and manifest; files preserved")
        digest = file_hash(final)
        if prior and (final.stat().st_size != prior.get("bytes") or digest != prior.get("sha256")):
            raise RuntimeError(f"Installed {kind} checksum differs from manifest; files preserved")
        result = {"file": final.name, "count": count, "bytes": final.stat().st_size,
                  "source": source, "sha256": digest}
        if kind == "puzzles":
            themes = json.loads(metadata["themes_json"]) if "themes_json" in metadata else prior.get("themes")
            if themes is None:
                themes = dict(db.execute("SELECT theme,COUNT(*) FROM puzzle_themes GROUP BY theme"))
            result.update({"themes": themes,
                "setupMovesValidated": int(metadata.get("setupMovesValidated", prior.get("setupMovesValidated", 0))),
                "fullContinuationsValidated": int(metadata.get("fullContinuationsValidated", prior.get("fullContinuationsValidated", 0)))})
        else:
            pgn_name = metadata.get("source_file", "")
            pgn = (PACK / pgn_name).resolve()
            if pgn.parent != PACK.resolve() or not pgn.is_file():
                raise RuntimeError("Installed game manifest/PGN path is invalid; files preserved")
            pgn_digest = file_hash(pgn)
            if prior and (pgn.stat().st_size != prior.get("pgnBytes") or pgn_digest != prior.get("pgnSha256")):
                raise RuntimeError("Installed PGN checksum differs from manifest; files preserved")
            last = db.execute("SELECT byte_offset,byte_length FROM games ORDER BY id DESC LIMIT 1").fetchone()
            if not last or sum(last) != pgn.stat().st_size:
                raise RuntimeError("Installed PGN end offset is inconsistent; files preserved")
            result.update({"pgnFile": pgn.name, "pgnBytes": pgn.stat().st_size, "pgnSha256": pgn_digest,
                "sampleGamesLegallyParsed": int(metadata.get("sampleGamesLegallyParsed", prior.get("sampleGamesLegallyParsed", 0)))})
    update_manifest(kind, result)
    log(f"{kind}-already-installed", count=count, bytes=result["bytes"], manifestVerified=True)
    return True


def import_puzzles():
    final = PACK / "puzzles.sqlite"
    if restore_completed("puzzles"):
        return
    archive, source = download(PUZZLE_URL)
    work = PACK / "puzzles.building.sqlite"
    if work.exists():
        work.unlink()
    db = connection(work)
    try:
        db.executescript("""
          CREATE TABLE puzzles(id TEXT PRIMARY KEY, fen TEXT NOT NULL, moves TEXT NOT NULL,
            rating INTEGER NOT NULL, themes TEXT NOT NULL, game_url TEXT NOT NULL,
            popularity INTEGER NOT NULL, plays INTEGER NOT NULL, opening_tags TEXT NOT NULL);
          CREATE TABLE puzzle_themes(theme TEXT NOT NULL, puzzle_id TEXT NOT NULL, rating INTEGER NOT NULL);
          CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
        """)
        count = 0
        theme_counts = {}
        rows_batch, themes_batch = [], []
        started = time.monotonic()
        with zstd.open(archive, "rt", encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                moves = row["Moves"].split()
                if len(moves) < 2:
                    raise ValueError(f"Puzzle has no solution: {row['PuzzleId']}")
                board = chess.Board(row["FEN"])
                setup = chess.Move.from_uci(moves[0])
                if not board.is_legal(setup):
                    raise ValueError(f"Illegal puzzle setup: {row['PuzzleId']}")
                board.push(setup)
                puzzle_id = "lichess_" + row["PuzzleId"]
                rating = int(row["Rating"])
                tags = row["Themes"].split()
                rows_batch.append((puzzle_id, board.fen(), " ".join(moves[1:]), rating,
                                   row["Themes"], row["GameUrl"], int(row["Popularity"]),
                                   int(row["NbPlays"]), row.get("OpeningTags", "")))
                for tag in tags:
                    themes_batch.append((tag, puzzle_id, rating))
                    theme_counts[tag] = theme_counts.get(tag, 0) + 1
                count += 1
                if count > MAX_PUZZLE_COUNT:
                    raise RuntimeError("Puzzle snapshot exceeds the bounded record limit; archive preserved")
                if count % 10_000 == 0:
                    db.executemany("INSERT INTO puzzles VALUES(?,?,?,?,?,?,?,?,?)", rows_batch)
                    db.executemany("INSERT INTO puzzle_themes VALUES(?,?,?)", themes_batch)
                    db.commit()
                    rows_batch.clear()
                    themes_batch.clear()
                    with PROGRESS_LOCK:
                        PROGRESS["puzzles"] = {"phase": "import", "count": count, "expected": PUZZLE_COUNT,
                                                "perSecond": round(count / (time.monotonic() - started))}
                    if work.stat().st_size > 7 * 1024**3:
                        raise RuntimeError("Puzzle database exceeded size bound")
        if rows_batch:
            db.executemany("INSERT INTO puzzles VALUES(?,?,?,?,?,?,?,?,?)", rows_batch)
            db.executemany("INSERT INTO puzzle_themes VALUES(?,?,?)", themes_batch)
        if count < MIN_PUZZLE_COUNT:
            raise RuntimeError(f"Suspiciously small puzzle snapshot: {count}; archive preserved")
        db.commit()
        log("puzzles-index-start", count=count, themes=sum(theme_counts.values()))
        db.executescript("""
          CREATE INDEX puzzles_rating_id ON puzzles(rating,id);
          CREATE INDEX puzzle_themes_theme_rating_id ON puzzle_themes(theme,rating,puzzle_id);
        """)
        db.executemany("INSERT INTO metadata VALUES(?,?)", [("count", str(count)), ("license", "CC0-1.0"),
            ("source", PUZZLE_URL), ("source_last_modified", source.get("lastModified", "")),
            ("reference_snapshot", "2026-09-10"), ("reference_count", str(PUZZLE_COUNT)),
            ("source_json", json.dumps(source)), ("themes_json", json.dumps(theme_counts)),
            ("setupMovesValidated", str(count))])
        db.commit()
        if db.execute("PRAGMA quick_check").fetchone()[0] != "ok":
            raise RuntimeError("Puzzle SQLite check failed")
        # Deterministic sample validates complete UCI lines; every setup was validated above.
        sample_count = 0
        for fen, moves in db.execute("SELECT fen,moves FROM puzzles WHERE rowid % 6101 = 1"):
            board = chess.Board(fen)
            for uci in moves.split():
                move = chess.Move.from_uci(uci)
                if not board.is_legal(move):
                    raise RuntimeError("Illegal sampled puzzle continuation")
                board.push(move)
            sample_count += 1
        db.execute("INSERT INTO metadata VALUES(?,?)", ("fullContinuationsValidated", str(sample_count)))
        db.commit()
        db.close()
        work.replace(final)
        result = {"file": final.name, "count": count, "bytes": final.stat().st_size,
                  "source": source, "themes": theme_counts, "setupMovesValidated": count,
                  "fullContinuationsValidated": sample_count, "sha256": file_hash(final)}
        update_manifest("puzzles", result)
        archive.unlink()
        archive.with_suffix(archive.suffix + ".source.json").unlink(missing_ok=True)
        with PROGRESS_LOCK:
            PROGRESS["puzzles"] = {"phase": "ready", "count": count, "bytes": result["bytes"]}
        log("puzzles-ready", count=count, bytes=result["bytes"], fullContinuationsValidated=sample_count)

    finally:
        db.close()


TAG = re.compile(rb'^\[([A-Za-z0-9_]+) "(.*)"\]')


def import_games():
    final = PACK / "games.sqlite"
    if restore_completed("games"):
        return
    archive, source = download(GAME_URL, GAME_SHA256)
    pgn = PACK / "lichess-2016-12.pgn"
    if not pgn.exists():
        partial = pgn.with_suffix(".pgn.building")
        total = 0
        with zstd.open(archive, "rb") as src, partial.open("wb") as out:
            while block := src.read(8 * 1024**2):
                total += len(block)
                if total > MAX_PGN_BYTES:
                    raise RuntimeError("PGN expansion exceeded bounded 14GiB")
                out.write(block)
                with PROGRESS_LOCK:
                    PROGRESS["games"] = {"phase": "decompress", "bytes": total}
        partial.replace(pgn)
        log("games-decompressed", bytes=pgn.stat().st_size)
    work = PACK / "games.building.sqlite"
    if work.exists():
        work.unlink()
    db = connection(work)
    try:
        db.executescript("""
          CREATE TABLE games(id INTEGER PRIMARY KEY, site TEXT NOT NULL, white TEXT NOT NULL,
            black TEXT NOT NULL, result TEXT NOT NULL, date TEXT NOT NULL,
            white_elo INTEGER NOT NULL, black_elo INTEGER NOT NULL, eco TEXT NOT NULL,
            opening TEXT NOT NULL, time_control TEXT NOT NULL, byte_offset INTEGER NOT NULL,
            byte_length INTEGER NOT NULL, source_file TEXT NOT NULL);
          CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
        """)
        batch = []
        count = 0
        offset = 0
        game_start = None
        headers = {}
        started = time.monotonic()

        def append_game(end):
            nonlocal count, batch
            if game_start is None:
                return
            def number(k):
                try:
                    return int(headers.get(k, "0"))
                except ValueError:
                    return 0
            count += 1
            batch.append((count, headers.get("Site", ""), headers.get("White", ""),
                headers.get("Black", ""), headers.get("Result", "*"), headers.get("UTCDate", headers.get("Date", "")),
                number("WhiteElo"), number("BlackElo"), headers.get("ECO", ""), headers.get("Opening", ""),
                headers.get("TimeControl", ""), game_start, end-game_start, pgn.name))
            if len(batch) == 10_000:
                db.executemany("INSERT INTO games VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)", batch)
                db.commit()
                batch.clear()
                with PROGRESS_LOCK:
                    PROGRESS["games"] = {"phase": "index", "count": count, "expected": GAME_COUNT,
                                         "perSecond": round(count / (time.monotonic()-started))}

        with pgn.open("rb", buffering=8 * 1024**2) as f:
            for line in f:
                if line.startswith(b'[Event "'):
                    append_game(offset)
                    game_start = offset
                    headers = {}
                if line.startswith(b"["):
                    match = TAG.match(line)
                    if match:
                        headers[match[1].decode()] = match[2].decode("utf-8", errors="replace")
                offset += len(line)
        append_game(offset)
        if batch:
            db.executemany("INSERT INTO games VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)", batch)
        db.commit()
        if count != GAME_COUNT:
            raise RuntimeError(f"Expected {GAME_COUNT} games; parsed {count}")
        log("games-search-index-start", count=count)
        db.executescript("""
          CREATE INDEX games_eco_id ON games(eco,id);
          CREATE INDEX games_white_id ON games(white COLLATE NOCASE,id);
          CREATE INDEX games_black_id ON games(black COLLATE NOCASE,id);
          CREATE INDEX games_white_elo_id ON games(white_elo,id);
          CREATE INDEX games_black_elo_id ON games(black_elo,id);
        """)
        db.executemany("INSERT INTO metadata VALUES(?,?)", [("count", str(count)), ("license", "CC0-1.0"),
            ("source", GAME_URL), ("source_file", pgn.name), ("month", "2016-12"),
            ("source_json", json.dumps(source))])
        db.commit()
        if db.execute("PRAGMA quick_check").fetchone()[0] != "ok":
            raise RuntimeError("Games SQLite check failed")
        sample_count = 0
        with pgn.open("rb") as f:
            for start, length in db.execute("SELECT byte_offset,byte_length FROM games WHERE id % 9433 = 1"):
                f.seek(start)
                raw = f.read(length).decode("utf-8")
                if raw.count('[Event "') != 1:
                    raise RuntimeError("Invalid PGN byte range")
                game = chess.pgn.read_game(io.StringIO(raw))
                if game is None or game.errors:
                    raise RuntimeError("Sample PGN failed legal parser")
                sample_count += 1
        db.execute("INSERT INTO metadata VALUES(?,?)", ("sampleGamesLegallyParsed", str(sample_count)))
        db.commit()
        db.close()
        work.replace(final)
        result = {"file": final.name, "pgnFile": pgn.name, "count": count,
                  "bytes": final.stat().st_size, "pgnBytes": pgn.stat().st_size,
                  "source": source, "sampleGamesLegallyParsed": sample_count,
                  "sha256": file_hash(final), "pgnSha256": file_hash(pgn)}
        update_manifest("games", result)
        archive.unlink()
        archive.with_suffix(archive.suffix + ".source.json").unlink(missing_ok=True)
        with PROGRESS_LOCK:
            PROGRESS["games"] = {"phase": "ready", "count": count, "bytes": result["bytes"] + result["pgnBytes"]}
        log("games-ready", count=count, bytes=result["bytes"] + result["pgnBytes"], sampleGamesLegallyParsed=sample_count)

    finally:
        db.close()


def main():
    global PACK, CACHE
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=PACK,
                        help="Destination library-packs folder (default: repository/library-packs)")
    args = parser.parse_args()
    PACK = args.output.resolve()
    CACHE = PACK / ".download"
    PACK.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(exist_ok=True)
    if shutil.disk_usage(PACK).free < 30 * 1024**3:
        raise RuntimeError("At least 30GiB free space is required for bounded build + SQLite sorting")
    threading.Thread(target=reporter, daemon=True).start()
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(import_puzzles), pool.submit(import_games)]
            for future in concurrent.futures.as_completed(futures):
                future.result()
        size = sum(p.stat().st_size for p in PACK.rglob("*") if p.is_file())
        if size > MAX_PACK_BYTES:
            raise RuntimeError(f"Pack exceeds 20GiB maximum: {size}")
        update_manifest("status", "ready")
        # Include the manifest itself; its first size update changes its length.
        for _ in range(3):
            size = sum(p.stat().st_size for p in PACK.rglob("*") if p.is_file())
            update_manifest("installedBytes", size)
        log("library-ready", bytes=size, gib=round(size/1024**3, 3))
    finally:
        STOP.set()


if __name__ == "__main__":
    main()
