# Дополнительные локальные инструменты / Optional local tools

В разборе партии и исследованиях откройте «Изучить позицию глубже» и выберите задачу: «Как ответит человек», «Как играли в похожих партиях», «Точный исход окончания» или «Получить второе мнение». На экране появляются только инструменты для выбранной задачи. Для обычной проверки позиции достаточно Stockfish.

Установка пакетов и выбор файлов находятся в «Настройки → Дополнительные возможности анализа». Ссылка «Открыть настройки инструментов» ведёт прямо к этому разделу. Анализ и загрузки начинаются только по нажатию пользователя. Stockfish, прогноз Maia, статистика партий и таблицы окончаний показывают разные виды информации.

In Review and Studies, open **Explore this position further** and choose a task: **How a human might reply**, **What happened in other games**, **Exact endgame outcome**, or **Get a second opinion**. Only the relevant controls appear. Stockfish is sufficient for an ordinary position check.

Package installation and file selection are under **Settings → More analysis options**. **Open tool settings** takes you directly there. Analysis and downloads start only on request. Stockfish evaluations, Maia predictions, game frequencies, and tablebase outcomes are separate results.

## Lc0 и пользовательский UCI-движок

1. Установите пакет Lc0 CPU или выберите свой исполняемый UCI-файл через системный диалог.
2. Для Lc0 отдельно выберите файл сети. CPU использует backend `blas` из сборки DNNL; для NVIDIA CUDA нужна соответствующая сборка движка и совместимая сеть.
3. Сохраните выбор. В разборе или исследовании выберите «Изучить позицию глубже → Получить второе мнение» и запустите анализ текущей позиции. Приложение показывает имя движка, его ответ `id name`, выбранную сеть, время поиска, оценку за белых и легальное продолжение.

Choose a local executable through the native picker. Lc0 also requires an explicitly chosen network and backend. No engine silently replaces another on failure. A searched evaluation is requested: an advertised `OwnBook` is disabled so engines such as Arasan do not return an unscored book move.

- Pinned CPU release: [Lc0 v0.32.1](https://github.com/LeelaChessZero/lc0/releases/tag/v0.32.1), asset `lc0-v0.32.1-windows-cpu-dnnl.zip`.
- Download: **24,001,097 bytes**, SHA-256 `b9cfcfbd3dabffbfd452f6e8e087c22273721bef48eba19640b6d92006c142f5`.
- Runtime installation verified locally: **40,742,549 bytes** before its small local receipt.
- Engine source and license: [tag v0.32.1, including its submodules](https://github.com/LeelaChessZero/lc0/tree/v0.32.1), [GPL-3.0-or-later with additional permission](https://github.com/LeelaChessZero/lc0/blob/v0.32.1/COPYING). Preserve DNNL/mimalloc notices from the official archive.
- The official archive includes `791556.pb.gz`. It is not automatically selected. **A separate affirmative redistribution license for these weights has not been established by this project. Do not label weights GPL merely because the engine is GPL.** Public source distribution contains the downloader, not the runtime/network/cache. The network was used only from the official download in the local CPU verification.
- [Official network guidance](https://lczero.org/play/networks/) explains network size and hardware compatibility. Lc0 returns numerical evaluations and variations; it does not author natural-language strategic explanations.

The generic UCI path was also tested with [Arasan 26.0](https://github.com/jdart1/arasan-chess/releases/tag/v26.0), `arasan26.0.zip`, **29,006,651 bytes**, SHA-256 `57e25af335d48fa3e82aa3a896895025fea3237d498be3baa9d83f218e2f2d94`. Its basic x64 executable and supplied NNUE produced legal searched lines through the same adapter. Arasan is not bundled as a required runtime. GPU/CUDA execution and another physical computer have not been tested.

## Syzygy: окончания с 3–5 фигурами

Полный пакет содержит **290 файлов WDL/DTZ**, **983,957,920 байт** (около 938 MiB). Проверенные SHA-256 и размеры закреплены в `electron/packs/syzygy-manifest.json`; загрузка возобновляется после остановки. Проверка файлов работает без интернета. Можно выбрать уже имеющуюся папку Syzygy; кнопка удаления пакета удаляет только управляемую папку приложения, не пользовательскую папку.

The complete package contains 290 WDL/DTZ files for 3–5 pieces. Every file is size- and SHA-256-verified. Only the fixed application-managed directory is removed by Remove pack. A user-selected table directory remains outside package deletion.

- Download host: [Lichess tablebase mirror](https://tablebase.lichess.ovh/tables/standard/), directories `3-4-5-wdl` and `3-4-5-dtz`.
- Hash/size source: [syzygy-tables.info checksum repository](https://github.com/niklasf/syzygy-tables.info/tree/9d79edb273faa1217760b53ed0df642ee8596896/checksums), pinned commit `9d79edb273faa1217760b53ed0df642ee8596896`.
- Table redistribution terms: [Ronald de Man’s Syzygy repository](https://github.com/syzygy1/tb#terms-of-use). The table files are freely redistributable; the generator source’s GPL-2.0 is a separate matter.
- Probing: [python-chess Syzygy API](https://python-chess.readthedocs.io/en/latest/syzygy.html), using the portable Python runtime installed with the Maia CPU pack.

WDL is always shown **for the side to move**, whereas engine cp is shown for White. WDL `2/0/−2` means win/draw/loss; `1/−1` means a theoretical win/loss that becomes a draw under the fifty-move rule. Full move history is supplied; mate, stalemate, insufficient material, repetition and the fifty-move clock are considered. Positions with more than five pieces or castling rights are explicitly unsupported. Missing tables are reported as missing, not replaced by a guessed evaluation.

**DTZ is not DTM.** It concerns a move that resets the fifty-move clock, or game end, under the tablebase metric; it is not a mate-distance promise. Original DTZ entries may be rounded by one ply. The bridge accounts for the current halfmove clock when classifying WDL; avoid treating the rounding boundary as a guaranteed exact move countdown. Per-move WDL is presented from the current player’s perspective. The bridge’s per-move `dtz` is the child-position value with its sign reversed; the UI deliberately does not present it as a root-position distance.

`src/content/tablebase-lessons.ts` provides original bilingual lessons: queen mate versus stalemate, rook-and-king coordination, and opposition with a side-to-move counterexample. Their four starting outcomes were verified against the complete local package; both authored mating continuations are legal.

## Индекс дебютов / Opening index

Индекс строится из установленного локального архива партий в отдельном worker-процессе. Поиск позиции читает компактный SQLite-индекс, не просматривает PGN заново. Начальная настройка — **50 000 партий и первые 24 полухода**. Можно продолжить индексирование, изменить лимит партий, при изменении глубины или источника — перестроить индекс. Неполные и некорректные партии пропускаются.

The index is built from the installed local game archive in a worker. Position queries do not rescan PGN files. Default coverage is 50,000 games and 24 plies. Resume avoids double-counting. Transpositions share the same normalized position key; a repeated position within one game is counted once. Rating bands use the average of both players’ ratings, with an explicit unknown-rating group. Statistics show actual sample size, source and dates; they are neither current worldwide opening frequencies nor Maia probabilities.

Limits: worker SQLite cache 32 MiB, batches of 50 games, per-PGN bounds, and 262,144 SQLite pages (about **1 GiB**) for the derived index. Disk/database failures roll back the active batch. Previously committed rows remain usable and resumable. The source database’s size/mtime fingerprint is checked before further indexing and before reading statistics; a changed archive requires a rebuild. When moving the installation, preserve the source database or rebuild the inexpensive derived index.

Local verification built a **78,909,440-byte** index from the existing archive without duplicating PGN files: 50,000 processed, 49,795 indexed, 205 skipped, out of 9,433,412 available games. This initial historical sample covers 2016-11-30 to 2016-12-01. It is deliberately labelled as a sample, not as the entire database.

## Проверки / Validation

The scoped engine/optional-tools test run covers protocol cancellation/restart, full-history Maia policies, installed Maia CPU inference, Stockfish compatibility, real Lc0 CPU and Arasan analysis, real Syzygy WDL/DTZ, pinned downloads, damaged files, safe managed removal, opening-index resume/transpositions/rating filters/stale-source detection, and authored endgame positions. Runtime tests skip explicitly if the optional local binaries or table files are absent; they do not download during the test run.

No personal profiles, played games, machine-specific configuration, binaries, networks, downloaded archives or generated index belong in the public Git repository.
