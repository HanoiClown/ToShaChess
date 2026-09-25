# Changelog

## 1.3.0 — Profiles, practice progress and large offline library

- Empty first-run registration: name, unique nickname, four experience levels and optional rating; add and switch up to 20 local profiles.
- Preserve existing profiles, private progress, favorites, settings and keys when updating the local installation.
- XP levels, daily goals, weekly activity, current/best streaks and nine achievements, calculated independently for each profile.
- Stable game completion timestamps: subsequent engine analysis no longer changes the day counted toward a streak.
- Daily puzzle difficulty follows the selected experience level.
- Add a resumable official Lichess data importer and an indexed offline database browser. Search the full installed puzzle snapshot and game archive without loading them into memory.
- Replay archived games and save selected games for analysis; full-pack puzzles support solutions, favorites and personal mistake review.
- Run database searches in a worker; bound pages and PGN reads, use indexed queries, reject missing payloads and paths escaping the pack.
- Public sources and application archives contain no pre-created personal profiles, private PGN history or API keys.

## 1.2.0 — ToShaChess

- Rename the app and Windows executable to ToShaChess.
- Four profile-specific themes: green, dark purple, dark blue and dark red.
- Expand the Lichess subset to 30,000 puzzles, preserving previous IDs; 14,661 endgame positions and 9,283 mate positions, with overlapping themes.
- Add puzzle favorites and a stable daily set of five puzzles matched to the starting learning path.
- Import a user-selected PGN folder into the active profile.
- Prepare a clean open-source export, Windows CI, pinned Stockfish setup, contribution and publishing documentation.
- Preserve existing local profiles, progress and encrypted API key on upgrade.

## 1.1.0

Large offline library, opening rehearsal and coordinate training.

## 1.0.0

Initial local game, analysis, lessons and separate profiles.
