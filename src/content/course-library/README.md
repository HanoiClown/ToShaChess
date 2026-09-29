# Editorial course library

Eight courses retain the stable ideas/main/replies/plans chapter IDs and add traps/defence. Each has three authored opposing replies, six mistake episodes and two real illustrative games. Explanations in Russian and English are original ToShaChess writing, not copied lessons or Lichess study comments.

## Coordinates and practice

Chapter branches use absolute path ply numbers for atPly, notes and details. Episode initialFen is the position BEFORE the mistake: line[0] is the mistake, line[1] its punishment. The learner plays the opposite colour from initialFen's side to move. The defence line starts with the same side choosing a sound alternative; that side is the learner. Episode notes use local plies from initialFen.

## Provenance

Opening names/classification: https://github.com/lichess-org/chess-openings (CC0-1.0). Real game moves: https://database.lichess.org/ (CC0); every model game includes its direct Lichess game URL. Player names, moves and results are preserved. Games are practical illustrations, not engine-certified flawless models. No external study prose or paid course text is redistributed.

Annotations and instructional selections are original project material under the repository license. https://github.com/official-stockfish/Stockfish is credited for engine verification, not as a source of lesson prose.

## Verification and limits

All authored paths and game PGNs are replayed with chess.js. The editorial tests require complete bilingual move notes, six distinct chapter paths, 48 unique mistake positions/moves, both colours making mistakes in each course, critical notes and 16 legal games of at least 40 plies.

The frozen episode-audit.json records 500 ms Stockfish searches that selected demonstration and defensive moves. tactical-episodes.ts pairs those exact moves with handwritten notes; changing a principal variation requires reviewing the prose too. check-episodes.ts writes fresh candidates to the local report directory without replacing authored data.

A second audit (deep-check.ts, deep-audit.json) uses 1500 ms before and after each mistake and 1000 ms after each defensive first move. Across 48 episodes the smallest observed loss is 87 centipawns; the largest difference between the defensive continuation and the pre-move evaluation is 27 centipawns. Scores are White-relative. Mate scores are engine sentinels, not literal pawn valuations. These are best-found practical defences, not proofs of uniqueness. Modest positional errors are not described as forced wins. Nodes, depth and timing vary between runs.

Run from repository root: node --import tsx src/content/course-library/deep-check.ts. The audit uses the existing local stockfish/stockfish-windows-x86-64-universal.exe. It does not download or install anything.
