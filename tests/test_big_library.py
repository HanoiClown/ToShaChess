"""Small offline regression fixtures for library install/resume integrity."""
import contextlib
import csv
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from compression import zstd


ROOT = Path(__file__).resolve().parent.parent


class LibraryInstallTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.spec_from_file_location("fixture_library", ROOT / "scripts/download-big-library.py")
        self.m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.m)
        self.temp = tempfile.TemporaryDirectory(prefix="toshachess-library-test-")
        self.addCleanup(self.temp.cleanup)
        self.m.PACK = Path(self.temp.name)
        self.m.CACHE = self.m.PACK / ".download"
        self.m.CACHE.mkdir()
        original_connection = self.m.connection
        def fixture_connection(path):
            db = original_connection(path)
            self.addCleanup(db.close)
            return db
        self.m.connection = fixture_connection
        self.m.PUZZLE_COUNT = 2
        self.m.GAME_COUNT = 2
        self.m.MIN_PUZZLE_COUNT = 1
        self.m.MAX_PUZZLE_COUNT = 10

    def archive(self, data, name="fixture.zst"):
        path = self.m.CACHE / name
        path.write_bytes(zstd.compress(data.encode()))
        source = {"url": "https://database.lichess.org/fixture", "bytes": path.stat().st_size,
                  "etag": '"fixture"', "lastModified": "Wed, 09 Sep 2026 17:40:14 GMT",
                  "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "upstreamSha256Verified": False}
        self.m.download = lambda *args: (path, source)
        return path

    def puzzles(self):
        text = io.StringIO()
        writer = csv.writer(text)
        writer.writerow(["PuzzleId", "FEN", "Moves", "Rating", "Popularity", "NbPlays", "Themes", "GameUrl", "OpeningTags"])
        for i in range(2):
            writer.writerow([f"check{i}", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                             "e2e4 e7e5 g1f3", 1000, 90, 1000, "opening short", "local", "Kings_Pawn"])
        self.archive(text.getvalue())

    def test_new_complete_puzzle_snapshot_may_exceed_reference_count(self):
        self.puzzles()
        self.m.PUZZLE_COUNT = 1
        self.m.import_puzzles()
        manifest = json.loads((self.m.PACK / "manifest.json").read_text())
        self.assertEqual(manifest["puzzles"]["count"], 2)

    def test_failed_import_closes_database_and_preserves_archive(self):
        self.puzzles()
        self.m.MAX_PUZZLE_COUNT = 1
        with self.assertRaisesRegex(RuntimeError, "record limit"):
            self.m.import_puzzles()
        building = self.m.PACK / "puzzles.building.sqlite"
        building.replace(self.m.PACK / "preserved-building.sqlite")
        self.assertTrue((self.m.CACHE / "fixture.zst").exists())

    def test_completed_puzzles_restore_missing_manifest(self):
        self.puzzles()
        self.m.import_puzzles()
        manifest = self.m.PACK / "manifest.json"
        manifest.unlink()
        self.m.import_puzzles()
        self.assertEqual(json.loads(manifest.read_text())["puzzles"]["count"], 2)

    def test_completed_sqlite_corruption_is_not_skipped(self):
        self.puzzles()
        self.m.import_puzzles()
        with contextlib.closing(sqlite3.connect(self.m.PACK / "puzzles.sqlite")) as db:
            db.execute("UPDATE puzzles SET fen='invalid' WHERE rowid=1")
            db.commit()
        with self.assertRaisesRegex(RuntimeError, "checksum|SHA256|manifest"):
            self.m.import_puzzles()

    def test_completed_games_restore_missing_manifest(self):
        text = "".join(f'[Event "Fixture {i}"]\n[White "White"]\n[Black "Black"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 1-0\n\n' for i in range(2))
        self.archive(text)
        self.m.import_games()
        manifest = self.m.PACK / "manifest.json"
        manifest.unlink()
        self.m.import_games()
        self.assertEqual(json.loads(manifest.read_text())["games"]["count"], 2)

    def test_cached_archive_cannot_adopt_changed_upstream_identity(self):
        url = self.m.PUZZLE_URL
        path = self.m.CACHE / url.rsplit("/", 1)[1]
        path.write_bytes(b"ab")
        source = {"url": url, "bytes": 2, "etag": '"old"', "lastModified": "yesterday"}
        path.with_suffix(path.suffix + ".source.json").write_text(json.dumps(source))

        class Response:
            status = 206
            headers = {"Content-Range": "bytes 0-0/2", "ETag": '"new"', "Last-Modified": "today"}
            def __enter__(self): return self
            def __exit__(self, *_): return False

        self.m.request = lambda *args: Response()
        with self.assertRaisesRegex(RuntimeError, "changed|identity|metadata"):
            self.m.download(url)
        self.assertEqual(path.read_bytes(), b"ab")

    def test_download_chunk_cleanup_is_confined_to_pack_cache(self):
        inside = self.m.CACHE / "fixture.chunks"
        self.assertEqual(self.m.validate_chunk_directory(inside), inside.resolve())
        with self.assertRaisesRegex(RuntimeError, "outside"):
            self.m.validate_chunk_directory(self.m.PACK / "outside.chunks")


if __name__ == "__main__":
    unittest.main()
