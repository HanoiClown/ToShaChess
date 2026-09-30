# Changelog

## 1.5.3 — Reachable analysis and clearer panels

- Restore wheel and keyboard scrolling in study, game-review and lesson panels; keep one page scroll in narrow windows.
- Bring Stockfish analysis above personal notes and group Maia and advanced tools inside the same side panel. Scroll new analysis into view and explain how to add a continuation to the move tree.
- Keep long explanations in the panel's main scroll area and let move-list scrolling continue into the panel at its edges.
- Group sound and opponent dialogue settings, align both checkboxes with their labels, and clarify that bot comments are text.
- Add regression checks for panel reachability and checkbox behavior across all four themes.
- Open each section at the top instead of retaining the previous section's page scroll.

## 1.5.2 — Panel spacing

- Separate human/engine comparison and advanced tools in Review and Studies, with consistent spacing before the board and accuracy summary.
- Preserve the same layout in all four themes, narrow windows and expanded panels.

## 1.5.1 — Screenshot positions

- Import PNG/JPG/WebP chess diagrams in the position editor by file, drop or paste. Recognition runs entirely offline with a bundled model and WASM runtime.
- Detect the board automatically or crop manually, review uncertain squares, correct pieces and choose image orientation and the side to move. Unknown move history is never inferred as castling or en passant rights.
- Reconstruct an ordinary last move or capture, compare both positions with Stockfish, explore before/after and save alternatives as a study. Special moves require manual setup.
- Start editor practice games from the currently explored continuation.

## 1.5.0 — Community training

- Rebuild eight courses into 48 distinct chapters with original RU/EN move explanations, 48 error/defence episodes, three opposing replies per course and 16 real illustrative games. Preserve existing chapter IDs and progress.
- Add personal studies with branching move trees, comments, PGN variations and reusable positions; retain separate profile ownership.
- Add interval review and recall, defence, Maia prediction, play-out and hand-and-brain practice.
- Add optional Maia-3 5M/23M/79M local CPU models with a portable runtime, pinned downloads, verification and cancellation. Human-move predictions remain distinct from Stockfish evaluation.
- Add optional Lc0/custom UCI analysis, Syzygy 3–5-piece outcomes and local opening-index statistics with explicit sample coverage.
- Ground coaching explanations in legal analysis; document cloud budget/privacy limits and preserve offline coaching.
- Add training, authoring, engine and optional-tool guides, benchmark evidence and upstream license notices. Public exports exclude personal data, installed runtimes, model weights and indexes.

## 1.4.0 — Training upgrade

- Keep course navigation above the board, move changing explanations below the chapter controls, add panel padding and center responsive move-quality badges.

- Add 12 bots with approximate Elo, styles, original portraits and optional local dialogue; keep coaching analysis at full strength.
- Add coach move cards, board quality badges, side-by-side accuracy and remaining/captured material.
- Add legal-move right-click arrows with L-shaped knight paths and square marks, cleared on moves, orientation changes, left click or Escape.
- Add a validated position editor with FEN, analysis, exploration and games from custom starts; retain session drafts per profile.
- Show incorrect puzzle moves, reduced-motion-aware red feedback and an optional engine refutation before retrying.
- Add eight continuous opening courses with 32 chapters, autoplay, branches, practice and next-lesson navigation.
- Start fullscreen; preserve RU/EN, all four themes, old profiles and existing offline packs.

## 1.3.3

- Styled every native dropdown with the active green, purple, blue or red palette, selected-item markers, keyboard focus and bounded scrolling.
- Added 170 ms menu and disclosure transitions, respecting reduced-motion preferences.
- Verified menu keyboard interaction, Russian/English labels and narrow-window layout across all four themes.

## 1.3.2 — Adaptive full screen

- Add native full screen from the header button or F11, including profile selection; Escape exits and restores the previous window bounds.
- Keep the active game intact when switching window modes, with synchronized RU/EN controls.
- Scale the board to screen height, use wider layouts on large full-screen displays and stack panels in narrow windows.
- Keep header controls accessible while scrolling and label compact sidebar icons.

## 1.3.1 — Sound, motion and gentler hints

- Shared offline sounds for moves, captures, check and training feedback across boards; separate completion and error cues.
- Add a 0–100% volume slider and preview in Russian and English. Preserve mute and migrate existing saves to 65% volume.
- Animate adjacent moves, including castling, promotion and reverse replay; respect reduced-motion preferences.
- Show the player's move and automatic reply separately in puzzles, lessons and opening practice; cancel pending replies when leaving a screen.
- Hints in training exercises highlight only the piece to move, without revealing its destination.

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
