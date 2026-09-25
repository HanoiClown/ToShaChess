# Contributing to ToShaChess

Use Windows x64, Node.js 24 and `npm ci`. Run `npm run setup:engine` to fetch the pinned official Stockfish distribution with its source and license. No API key is needed for offline development or tests.

Before submitting a change, run `npm run typecheck`, `npm test`, `npm run verify:content`, `npm run build`, and `npm run test:ui`. UI changes should cover Russian and English, both profiles, and all four themes. Data changes must retain stable puzzle IDs and legally replay every move. Preserve existing save compatibility and profile ownership checks.

Use small pull requests explaining the behavior and validation. Do not submit saved games, API keys, personal PGN archives, node_modules, compiled binaries, or private analysis reports. Contributions are provided under GPL-3.0-or-later. Include source attribution and compatible licenses for imported assets/data.
