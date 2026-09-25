# ToShaChess

Open-source chess training for Windows, powered by local Stockfish. Russian and English UI, separate family profiles, no account required. Electron + React + TypeScript + chess.js. Licensed under GPL-3.0-or-later.

## Features

- Play five educational bot levels; review games with engine evaluations, variations and move labels. Paste PGN, open a file, or import a folder into the selected profile.
- **30,048 puzzles**, including 30,000 rated Lichess positions; filters for theme, difficulty and solved status. Complete the whole continuation, with automatic opponent replies and engine-checked alternatives.
- **14,661 endgame positions** and **9,283 mate positions** within that library; categories overlap.
- **3,815 opening lines**, gambit filtering, a beginner study priority and interactive rehearsal for either color. Source variation names remain English where untranslated.
- **19 bilingual lessons**, personal mistake reviews, an hour-long suggested plan, favorites and a daily set of five puzzles.
- Coordinate practice: free mode or 30/60/120 seconds, either board orientation, optional file/rank labels.
- Green, dark purple, dark blue and dark red themes, saved separately for each profile.

Daily sets are selected locally from the bundled library and change with the local calendar date. They are not Lichess's official daily puzzle. Favorites and solved progress are personal to each profile. Beginner priority is a learning recommendation, not an objective ranking of opening strength. Puzzle ratings are not estimates of your playing rating.

## Запуск и перенос / Run and move

Распакуй всю папку **ToShaChess Portable**, открой **ToShaChess.exe**. В настройках можно изменить имена двух профилей, язык, учебный маршрут и тему. Установка Node.js или отдельного Stockfish для готового приложения не нужна.

Для переноса закрой приложение и скопируй всю папку, **включая `data`**. Одного EXE недостаточно. Партии, прогресс и темы сохранятся. API-ключ на новом ПК вводится заново. При обновлении старого Chess Home перенеси его папку `data` в новую папку ToShaChess, пока оба приложения закрыты. Копии на разных ПК автоматически не синхронизируются.

Extract the entire portable folder and run **ToShaChess.exe**. Close the app before copying the full folder, including `data`, to another PC. Alternatively export/import profiles in Settings. The database remains `data/chess-home.json` for backward compatibility. Existing profiles retain their names and progress; fresh installations use two editable generic profiles. A backup merge unions favorites; it does not propagate deletions between computers.

## Offline coach and optional API

Stockfish analysis, play, puzzles, lessons and structured local advice work offline without a subscription or daily analysis limit. OpenAI optionally adds free-form explanations. The default shared local budget is **$5 per calendar month**. It excludes spending by other apps and does not sync between PCs. Windows encrypts the key; JSON backups omit it.

When API credits run out, offline features and cached explanations remain available. API calls do **not** train a local language model. Move labels are our own estimates, not Chess.com's exact grading. Cloud prose can be wrong. Live paid requests require the user's key and are not part of automated testing.

## Build from source

Windows x64, Node.js 24+, npm, and PowerShell are required. Python is only needed to refresh the dataset/theme generator, not to build or run the app.

```powershell
npm ci
npm run setup:engine
npm run typecheck
npm test
npm run verify:content
npm run build
npm run test:ui
npm start
npm run package:win
```

The engine setup downloads the official Stockfish 19 Windows universal ZIP and checks a pinned SHA-256. Keep its included source and license when distributing the engine. Builds appear in `release/win-unpacked`. `node scripts/smoke-portable.mjs` checks a copied packaged app, engine play/analysis and restart persistence. The Windows GitHub Actions workflow runs these checks and uploads a build artifact; it does not publish a release automatically.

Refresh the Lichess subset with Python 3.14 and `python-chess`: `py scripts/import-library.py`. Existing IDs are retained. The script streams the database instead of storing the full archive. Recreate palette overrides with `py scripts/generate-themes.py`.

## Data and licenses

Puzzles: [Lichess open database](https://database.lichess.org/), CC0. Opening lines: [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings), CC0. Import date, hashes and selection rules are in `src/content/library-manifest.json`. All bundled continuations are legally replayed by content verification; source puzzles were engine-analyzed by Lichess. The app does not claim a new exhaustive engine analysis of every imported puzzle.

Stockfish is GPL-3.0. Cburnett pieces use the GPL-compatible license option. See [third-party notices](THIRD_PARTY_NOTICES.md), [contributing](CONTRIBUTING.md), [security](SECURITY.md), [changelog](CHANGELOG.md) and [GitHub publishing instructions](docs/PUBLISHING.md).

ToShaChess is independently developed and is not affiliated with Chess.com or Lichess. Public source/builds contain no private PGN archive, saved progress or API keys.
