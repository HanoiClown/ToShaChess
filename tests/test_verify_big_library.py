"""Small, offline regression fixtures for the read-only pack verifier."""
import contextlib
import hashlib
import importlib.util
import json
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts/verify-big-library.py"


class LibraryVerifyTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.spec_from_file_location("fixture_verify_library", SCRIPT)
        self.verifier = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.verifier)
        self.temp = tempfile.TemporaryDirectory(prefix="toshachess-verify-test-")
        self.addCleanup(self.temp.cleanup)
        self.pack = Path(self.temp.name)
        self.games = [f'[Event "Fixture {i}"]\n\n1. e4 e5 *\n\n'.encode() for i in range(2)]
        (self.pack / "games.pgn").write_bytes(b"".join(self.games))
        with contextlib.closing(sqlite3.connect(self.pack / "puzzles.sqlite")) as db:
            db.executescript("""
                CREATE TABLE puzzles(id TEXT PRIMARY KEY, fen TEXT NOT NULL, moves TEXT NOT NULL);
                CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
            """)
            db.executemany("INSERT INTO puzzles VALUES(?,?,?)", [
                (f"lichess_{i}", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "e2e4")
                for i in range(2)
            ])
            db.execute("INSERT INTO metadata VALUES('count','2')")
            db.commit()
        with contextlib.closing(sqlite3.connect(self.pack / "games.sqlite")) as db:
            db.executescript("""
                CREATE TABLE games(id INTEGER PRIMARY KEY, byte_offset INTEGER NOT NULL,
                    byte_length INTEGER NOT NULL, source_file TEXT NOT NULL);
                CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
            """)
            db.executemany("INSERT INTO games VALUES(?,?,?,?)", [
                (1, 0, len(self.games[0]), "games.pgn"),
                (2, len(self.games[0]), len(self.games[1]), "games.pgn"),
            ])
            db.execute("INSERT INTO metadata VALUES('count','2')")
            db.commit()
        self.manifest = {
            "status": "ready", "schemaVersion": 1, "license": "CC0-1.0", "maxPackBytes": 1024**2,
            "puzzles": self.file_meta("puzzles.sqlite"), "games": self.file_meta("games.sqlite"),
        }
        self.manifest["games"].update({
            "pgnFile": "games.pgn", "pgnBytes": sum(map(len, self.games)),
            "pgnSha256": hashlib.sha256(b"".join(self.games)).hexdigest(),
        })
        self.write_manifest()

    def file_meta(self, filename):
        data = (self.pack / filename).read_bytes()
        return {"file": filename, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "count": 2}

    def write_manifest(self):
        (self.pack / "manifest.json").write_text(json.dumps(self.manifest), encoding="utf-8")

    def change_db(self, kind, sql):
        with contextlib.closing(sqlite3.connect(self.pack / f"{kind}.sqlite")) as db:
            db.execute(sql)
            db.commit()
        self.manifest[kind].update(self.file_meta(f"{kind}.sqlite"))
        self.write_manifest()

    def assert_cli_error(self):
        result = subprocess.run([sys.executable, str(SCRIPT), str(self.pack)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertEqual(result.stdout, "")
        self.assertNotIn("Traceback", result.stderr)
        self.assertIs(json.loads(result.stderr)["ok"], False)

    def test_tiny_valid_pack_checks_requested_samples_without_modifying_files(self):
        before = {p.name: p.read_bytes() for p in self.pack.iterdir()}
        for samples, expected in ((1, 1), (2, 2), (101, 2)):
            with self.subTest(samples=samples):
                result = self.verifier.verify(self.pack, full_hash=True, legal=True, samples=samples)
                self.assertEqual(result["sampledRecords"], {"puzzles": expected, "games": expected})
                self.assertTrue(result["ok"])
        self.assertEqual({p.name: p.read_bytes() for p in self.pack.iterdir()}, before)

    def test_malformed_manifest_shapes_return_json_errors(self):
        valid = json.loads(json.dumps(self.manifest))
        for malformed in ([], None, {**valid, "puzzles": None}, {**valid, "games": []}):
            with self.subTest(manifest=malformed):
                self.manifest = malformed
                self.write_manifest()
                self.assert_cli_error()

    def test_malformed_manifest_field_types_return_json_errors(self):
        valid = json.loads(json.dumps(self.manifest))
        cases = (("file", None), ("bytes", None), ("sha256", None), ("count", "2"))
        for field, value in cases:
            with self.subTest(field=field):
                self.manifest = json.loads(json.dumps(valid))
                self.manifest["puzzles"][field] = value
                self.write_manifest()
                self.assert_cli_error()
        self.manifest = {**valid, "maxPackBytes": []}
        self.write_manifest()
        self.assert_cli_error()

    def test_missing_metadata_count_returns_json_error(self):
        self.change_db("puzzles", "DELETE FROM metadata WHERE key='count'")
        self.assert_cli_error()

    def test_noncontiguous_puzzle_rowids_are_rejected(self):
        self.change_db("puzzles", "UPDATE puzzles SET rowid=rowid+100")
        with self.assertRaisesRegex(ValueError, "contiguous|sample"):
            self.verifier.verify(self.pack, full_hash=True, legal=True)

    def test_noncontiguous_game_ids_are_rejected(self):
        self.change_db("games", "UPDATE games SET id=id+100")
        with self.assertRaisesRegex(ValueError, "contiguous|sample"):
            self.verifier.verify(self.pack, full_hash=True, legal=True)

    def test_first_sampled_game_must_end_at_next_game_offset(self):
        self.change_db("games", "UPDATE games SET byte_length=21 WHERE id=1")
        with self.assertRaisesRegex(ValueError, "PGN.*(range|boundar)"):
            self.verifier.verify(self.pack, full_hash=True, legal=True, samples=1)

    def test_final_sampled_game_must_end_at_eof(self):
        self.change_db("games", "UPDATE games SET byte_length=21 WHERE id=2")
        with self.assertRaisesRegex(ValueError, "PGN.*(range|boundar)"):
            self.verifier.verify(self.pack, full_hash=True, legal=True)

    def test_missing_payload_returns_json_error(self):
        (self.pack / "games.pgn").unlink()
        self.assert_cli_error()

    def test_payload_path_cannot_escape_pack(self):
        self.manifest["puzzles"]["file"] = "../outside.sqlite"
        self.write_manifest()
        with self.assertRaisesRegex(ValueError, "outside"):
            self.verifier.verify(self.pack)

    def test_full_hash_rejects_same_length_payload_change(self):
        path = self.pack / "games.pgn"
        path.write_bytes(path.read_bytes().replace(b"Fixture", b"Changed"))
        with self.assertRaisesRegex(ValueError, "SHA256"):
            self.verifier.verify(self.pack, full_hash=True)

    def test_oversized_individual_pgn_is_rejected(self):
        data = self.games[0] + b" " * 1024**2 + self.games[1]
        (self.pack / "games.pgn").write_bytes(data)
        self.manifest["games"]["pgnBytes"] = len(data)
        self.manifest["games"]["pgnSha256"] = hashlib.sha256(data).hexdigest()
        self.change_db("games", f"UPDATE games SET byte_length={len(self.games[0]) + 1024**2} WHERE id=1")
        self.change_db("games", f"UPDATE games SET byte_offset={len(self.games[0]) + 1024**2} WHERE id=2")
        with self.assertRaisesRegex(ValueError, "large individual PGN"):
            self.verifier.verify(self.pack)


if __name__ == "__main__":
    unittest.main()
