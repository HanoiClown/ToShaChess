# Движки и модели / Engines and models

## Установка / Installation

Stockfish уже входит в готовое приложение. Для Maia открой «Настройки → Движки и модели», выбери Maia-3 5M и нажми «Установить / продолжить». Пакет включает собственный Python и CPU-библиотеки; системный Python и видеокарта не нужны. Дождись готовности, выполни проверку пакета, затем выбери Maia в игре или сравнении ответов. 23M и 79M устанавливаются после базового 5M и используют тот же runtime. Установка требует сети и места для архива и распаковки; последующая игра работает офлайн. Отмена сохраняет возможность продолжить загрузку. Удаление базового пакета также удаляет зависимые модели, но сохраняет партии и прогресс.

In Settings → Engines & models, install Maia-3 5M first, wait for Ready and verify the pack. It includes portable Python and CPU libraries; no system Python or GPU is required. Install 23M/79M afterwards if desired. Downloads require internet and temporary disk space; inference works offline after installation. Cancel/resume and checksum verification are available. Removing the base runtime also removes dependent models, but preserves personal games and progress. Stockfish is already included in the packaged app.

«Дополнительные инструменты» позволяют установить Lc0 CPU, выбрать свой UCI-движок и отдельно файл сети. Для таблиц установи Syzygy 3–5 либо выбери свою папку. Чтение таблиц использует Python из базового пакета Maia. Архив Lc0 содержит сеть 791556.pb.gz, но её лицензия отдельно не подтверждена: приложение требует явного выбора сети и не объявляет любые веса GPL по лицензии движка. Публичный исходный дистрибутив содержит загрузчики, а не установленные runtime/веса.

Advanced tools can install Lc0 CPU or select a local UCI engine and an explicit network file. Syzygy can be downloaded or selected from a local folder; probing uses the portable Python from the Maia base pack. The upstream Lc0 archive contains 791556.pb.gz whose separate license has not been established here. The app does not infer a network license from the engine's GPL, or select a network implicitly. Public source distributions carry loaders, not installed runtimes or weights.

## Pinned components

| Component       | Exact selection                                        | Source / terms                                                                                                                                              |
| --------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stockfish       | 19, Windows x86-64 universal                           | [Official releases](https://github.com/official-stockfish/Stockfish/releases/tag/sf_19), GPL-3.0                                                            |
| Maia code       | 0.1.0, commit 1e13597c42d4858b7cfd7cfdae01e297263364b2 | [CSSLab source](https://github.com/CSSLab/maia3/tree/1e13597c42d4858b7cfd7cfdae01e297263364b2), AGPL-3.0                                                    |
| Maia 5M         | b6559de2398d7140b985f28fd2c19fb5e47ddabe               | [Model card](https://huggingface.co/UofTCSSLab/Maia3-5M); 20,968,049-byte model                                                                             |
| Maia 23M        | 51a0145a8178046f7de23119160b136672deeb2b               | [Model card](https://huggingface.co/UofTCSSLab/Maia3-23M); 91,799,307-byte model                                                                            |
| Maia 79M        | a107d6ceb7b298cb04ae1da4edffe2939858b894               | [Model card](https://huggingface.co/UofTCSSLab/Maia3-79M); 315,651,851-byte model                                                                           |
| Portable Python | 3.13.15, Windows amd64 embedded                        | [Python release files](https://www.python.org/ftp/python/3.13.15/), PSF license and included notices                                                        |
| PyTorch         | 2.14.0+cpu                                             | Pinned wheel and SHA-256 in scripts/maia-lock.json; BSD-style license and third-party notices                                                               |
| python-chess    | distribution 1.999, chess module 1.11.2                | [Source](https://github.com/niklasf/python-chess), GPL-3.0-or-later                                                                                         |
| Lc0             | 0.32.1, windows-cpu-dnnl                               | [Release](https://github.com/LeelaChessZero/lc0/releases/tag/v0.32.1), engine GPL-3.0-or-later; network terms separate                                      |
| Syzygy          | 3–5 pieces, 290 WDL/DTZ files, 983,957,920 bytes       | Checksums from syzygy-tables.info commit 9d79edb273faa1217760b53ed0df642ee8596896; [table redistribution terms](https://github.com/syzygy1/tb#terms-of-use) |

Exact dependency versions, download URLs, sizes and SHA-256 hashes are in scripts/maia-lock.json, electron/packs/manifest.ts, electron/packs/lc0.ts and electron/packs/syzygy-manifest.json. This table documents this app's pins, not a claim about the newest upstream release. The Maia cards identify CC BY 4.0 for the paper and refer to the repository for code/weights terms; the source repository carries AGPL-3.0. Do not describe the model weights as CC BY merely because the paper is. Copies of the pinned cards and upstream license are in licenses/maia3-*.

## Что означают ответы / Interpreting results

Stockfish оценивает шахматную силу продолжения. Maia предсказывает человеческий выбор при условном уровне 600–2600 по шкале Lichess. Это вход модели, не измеренный рейтинг бота и не эквивалент рейтинга Chess.com. Размер модели не превращает вероятность человеческого хода в доказательство его силы. Доступность модели показана явно: отсутствие пакета не означает, что Stockfish стал Maia.

Stockfish evaluates continuations. Maia predicts human choices conditioned on a 600–2600 Lichess-scale level. That input is not a calibrated bot rating or a Chess.com rating. Larger models can cost more CPU time without providing tactical proof. If a model is missing, install it explicitly; Stockfish analysis is a separate provider.

Syzygy охватывает поддержанные позиции с 3–5 фигурами, включая королей, без прав рокировки. WDL — исход; DTZ — расстояние до следующего взятия или хода пешки при правильной игре, а не число ходов до мата. Учитываются счётчик 50 ходов и возможная ничья. Для неподдержанной позиции или отсутствующей таблицы результат помечается недоступным, а не заменяется приблизительной «точной» оценкой.

Syzygy handles supported 3–5-piece positions including kings, without castling rights. WDL is the game outcome; DTZ measures distance to a zeroing move, not mate. The fifty-move clock matters, and stored DTZ may be rounded by a ply. Missing or unsupported tables produce an unavailable result.

## CPU measurements

Recorded 2026-09-29 on Intel Core i5-12450H (12 logical processors), 16 GB RAM, CPU backend with two threads, 18 positions per model, during concurrent development. These are local observations, not Ryzen measurements or performance guarantees. Cold time includes worker/model startup; p50/p95 are observed request latency percentiles.

| Pack                          | Cold start |     p50 |     p95 | Installed bytes recorded |
| ----------------------------- | ---------: | ------: | ------: | -----------------------: |
| Maia-3 5M + shared runtime    |     4.86 s | 0.627 s | 1.557 s |              767,687,988 |
| Maia-3 23M (additional model) |     4.19 s | 1.435 s | 2.224 s |               91,799,307 |
| Maia-3 79M (additional model) |     6.78 s | 4.426 s | 5.799 s |              315,651,851 |

Source: local development evidence .superpowers/sdd/community-training/maia-benchmark.json. Additional-model sizes exclude the shared runtime. No Lc0 speed claim is made; network and backend selection can change its memory and compute requirements substantially. Для обычного CPU начни с 5M; более крупные модели имеют смысл, если устраивает измеренная на твоём ПК задержка.

## Memory and portability observations / Память и переносимость

A separate Maia-3 5M measurement on the same Windows 11/i5-12450H host used the CPU backend with two PyTorch threads, one cold load and one complete-policy request. Only the spawned Python process was measured, excluding Electron, the UI, build tools and all other processes. Sampling interval: 100 ms.

| Process metric                       | Recorded bytes |   MiB |
| ------------------------------------ | -------------: | ----: |
| Loaded, idle working set             |    253,730,816 | 242.0 |
| After-inference and peak working set |    271,966,208 | 259.4 |
| After-inference private bytes        |    696,254,464 | 664.0 |

The approximately 259 MiB peak working set is resident process memory, not total app memory or committed private memory. Private bytes are shown separately. This single request used 703.1 ms of process CPU over 364.6 ms observed wall time (about 1.93 logical cores). It does not replace the 18-position latency benchmark above. Evidence: .superpowers/sdd/community-training/maia-memory-audit.json, also referenced by the benchmark's resourceAudit field.

Пиковый working set около 259 МиБ относится только к отдельному процессу Maia 5M, без Electron и остальных процессов. Это резидентная память; private bytes указаны отдельно и означают другую метрику. Замер одного запроса не определяет общие требования приложения и не заменяет таблицу задержек.

Fresh portable installation and relocation were exercised on this host. A clean second Windows computer, Ryzen 5 2600 and RTX 3060/CUDA have not been tested. The installed runtime is CPU-only; these results do not establish GPU compatibility or performance on another machine.

Свежая переносимая установка и перемещение папки проверялись на этом компьютере. Чистая другая Windows-машина, Ryzen 5 2600 и RTX 3060/CUDA не проверены. Установлен CPU-runtime; выводов о производительности или GPU-совместимости на другом ПК эти измерения не дают.

## Diagnostics

If loading fails, verify the pack, note its status/error and the provider/model/version, then retry. Report the app version, OS, CPU/RAM, exact action and a minimal public position when needed. Do not attach API keys or a private game archive. A cancelled request or missing model should remain distinct from an engine result.

Stockfish, installed Maia/Lc0, local studies and installed tables do not need an API key. Optional cloud prose uses OpenAI gpt-4.1-mini-2025-04-14 through the app's explicit cloud coach, subject to the configured local monthly budget; it is not required for these engines. API prose is checked against supplied legal engine lines but still needs human judgment. See [training workflows](TRAINING.md) and [third-party notices](../THIRD_PARTY_NOTICES.md).

## Перенос пакетов / Moving packs

Закрой приложение перед копированием. Установленные модели и runtime находятся в `engine-packs`, отдельно от персональных данных и `library-packs`. Экспорт профиля не содержит эти пакеты. Скопируй папки отдельно или скачай пакеты заново; затем выполни проверку. Внешний UCI-движок, собственная папка таблиц и файл сети вне управляемых пакетов требуют отдельного переноса и повторного выбора пути. CPU-пакет не устанавливает и не обещает GPU/CUDA-поддержку.

Close the app before copying. Installed models and runtimes are in `engine-packs`, separate from personal data and `library-packs`. Profile exports omit these packs. Copy them separately or download again, then verify. Custom engines, table folders and networks outside managed packs need separate transfer and path selection. The CPU pack does not install or promise GPU/CUDA support. Network licensing remains independent of its engine.
