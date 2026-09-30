# ToShaChess

Open-source chess training for Windows, powered by local Stockfish. Russian and English UI, separate family profiles, no account required. Electron + React + TypeScript + chess.js. Licensed under GPL-3.0-or-later.

**[Download ToShaChess 2.0 for Windows / Скачать для Windows](https://github.com/HanoiClown/ToShaChess/releases/tag/v2.0)** — portable app, source archive and release notes.

## Features

- Four main sections: Today, Play, Learn and Analysis. Related training modes and analysis tools stay together, with optional engine setup in expandable settings.
- Play 12 named bots with portraits, different styles and optional offline dialogue, including three ≈600 Elo personalities. Ratings are difficulty guides, not calibrated Chess.com ratings. Strong analysis stays independent of bot difficulty.
- Review games with a coach card, move-quality badges and accuracy for each side. Try your own moves for either side on the same board, check the position with Stockfish and return to the game. Temporary variations do not change saved game moves or accuracy. Accuracy is our own normalized evaluation-loss metric; partial analysis is labelled. Paste PGN, open a file, or import a folder into the selected profile.
- Draw planning arrows with a right-button drag: your side is orange, the opponent is red. Continue from any arrow's endpoint to sketch several moves or alternative plans; knights keep an L-shaped path. Right-click marks a square, repeating an arrow removes it and its dependent continuation, and left-click or Escape clears all marks. Plans may pass through blocked lines; actual moves remain fully legal. See remaining pieces, captures and material balance during play and review.
- A position editor supports piece placement, full FEN fields, position validation, Stockfish analysis, free exploration and playing from the setup. Drafts remain separate per profile during the app session.
- Import a board screenshot by file, drag-and-drop or paste. A bundled offline recognizer finds 2D boards; crop manually and correct pieces before importing. Reconstruct a last move/capture, compare it with Stockfish and explore alternatives. No API key, uploads or extra downloads. Perspective photos of physical boards are not supported. [Image import guide](docs/TRAINING.md#positions-from-images).
- Wrong puzzle moves stay visible with red feedback and an optional engine continuation; retry returns to the exercise position. Reduced-motion settings suppress shaking.
- **30,048 puzzles**, including 30,000 rated Lichess positions; filters for theme, difficulty and solved status. Complete the whole continuation, with automatic opponent replies and engine-checked alternatives.
- **14,661 endgame positions** and **9,283 mate positions** within that library; categories overlap.
- **3,815 opening lines**, gambit filtering, a beginner study priority and interactive rehearsal for either color. Source variation names remain English where untranslated.
- **8 guided courses / 48 chapters**: Evans, Scotch, Göring, Danish, Vienna, King's Gambit, Smith–Morra and Caro–Kann. Each course has six distinct chapters, three opposing replies and bilingual move explanations. Explore **48 trap/error episodes** and **16 actual illustrative games**, then practise without returning to the menu between chapters. Watching and practice have separate progress; only practice awards XP.
- **19 bilingual lessons**, personal mistake reviews, an hour-long suggested plan, favorites and a daily set of five puzzles.
- Personal studies with move trees, comments and PGN variations; save them per profile and rehearse positions through an interval review queue. Practice includes recall, defence, Maia prediction, play-out and hand-and-brain modes.
- Optional local Maia-3 5M/23M/79M predicts human replies. The 5M package includes a portable CPU runtime; no system Python or GPU is required. Stockfish evaluation remains separate.
- Optional Lc0/custom UCI analysis, Syzygy 3–5-piece WDL/DTZ and opening statistics from an indexed sample of the installed archive. See [optional tools](docs/OPTIONAL_TOOLS.md).
- Coordinate practice: free mode or 30/60/120 seconds, either board orientation, optional file/rank labels.
- Green, dark purple, dark blue and dark red themes, saved separately for each profile.
- Fullscreen startup; F11 toggles fullscreen and Escape exits it. All new screens support both languages and smaller desktop windows.
- Create up to 20 local profiles with a name, unique nickname, experience level and optional rating. New installations start with a registration form; upgrades retain existing profiles.
- Personal XP levels, daily goals, practice streaks, weekly activity and nine achievements. Rewards come from completed practice, without repeated XP for the same puzzle or imported games.
- An optional large offline pack: the complete downloaded Lichess puzzle snapshot and a searchable archive of rated games. Filter puzzles by rating and motif; browse games by player, ECO and rating, replay them and save selected games for Stockfish analysis. See [large library installation](docs/LIBRARY.md).

Daily sets are selected locally from the bundled library and change with the local calendar date. They are not Lichess's official daily puzzle. Favorites and solved progress are personal to each profile. Beginner priority is a learning recommendation, not an objective ranking of opening strength. Puzzle ratings are not estimates of your playing rating.

## Запуск и перенос / Run and move

Распакуй всю папку **ToShaChess Portable**, открой **ToShaChess.exe**. При первом запуске создай профиль: имя, ник и уровень игры. Кнопка «Создать профиль» на экране выбора добавляет других пользователей; настройки позволяют изменить данные, язык, учебный маршрут и тему. Установка Node.js или отдельного Stockfish для готового приложения не нужна.

Для переноса закрой приложение и скопируй всю папку, **включая `data`, установленную `library-packs` и `engine-packs`**. Экспорт профиля не включает общие пакеты: при таком переносе скопируй `library-packs` и `engine-packs` отдельно. Пользовательские движки и сети вне этих папок тоже нужно перенести и выбрать заново. Одного EXE недостаточно. Партии, прогресс, достижения и темы сохранятся. API-ключ на новом ПК вводится заново. При обновлении старого Chess Home перенеси его папку `data` в новую папку ToShaChess, пока оба приложения закрыты. Копии на разных ПК автоматически не синхронизируются.

Extract the entire portable folder and run **ToShaChess.exe**. Close the app before copying the full folder, including `data`, any installed `library-packs` and `engine-packs`, to another PC. Alternatively export/import profiles in Settings; profile backups do not embed shared library or engine packs. Copy those folders separately when transferring a profile backup; custom engines/networks stored elsewhere must be copied and selected again. The database remains `data/chess-home.json` for backward compatibility. Existing profiles retain their names and progress; fresh installations contain no users. A backup merge unions favorites; it does not propagate deletions between computers.

## Offline coach and optional API

Stockfish analysis, play, puzzles, lessons and structured local advice work offline without a subscription or daily analysis limit. OpenAI optionally adds free-form explanations. The default shared local budget is **$5 per calendar month**. It excludes spending by other apps and does not sync between PCs. Windows encrypts the key; JSON backups omit it.

When API credits run out, offline features and cached explanations remain available. API calls do **not** train a local language model. Move labels are our own estimates, not Chess.com's exact grading. Cloud prose can be wrong. Live paid requests require the user's key and are not part of automated testing.

## Guides / Руководства

- [Training workflows / Как заниматься](docs/TRAINING.md)
- [Engines, model installation and CPU measurements / Движки и модели](docs/ENGINES.md)
- [Optional local tools / Дополнительные инструменты](docs/OPTIONAL_TOOLS.md)
- [Authoring courses and evidence rules / Создание учебных материалов](docs/AUTHORING.md)

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
