# Большая офлайн-библиотека / Large offline library

## Русский

В опорной выгрузке Lichess от 10 сентября 2026 года **6 100 952 задачи**.
Загрузчик сохраняет полную текущую выгрузку задач: при последующих установках
число может измениться, точное количество находится в манифесте. Набор партий
фиксирован: **9 433 412 рейтинговых партий в обычные шахматы за декабрь 2016 года**.
Это партии игроков разной силы; база не обозначается как исключительно
гроссмейстерская. Итоговые размеры, контрольные суммы и состояние установки
записываются в `library-packs/manifest.json`. До появления `status: "ready"`
библиотека ещё устанавливается.

Файлы скачиваются из [открытой базы Lichess](https://database.lichess.org/).
Задачи и рейтинговые партии распространяются по
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/): их можно сохранять,
изменять и распространять. Архивы трансляций Lichess имеют другую лицензию и в
этот комплект не входят. Программа хранит полезные данные и поисковые индексы;
файлы для искусственного увеличения размера не создаются.

### Установка и продолжение загрузки

Нужны Python 3.14, `python-chess`, интернет для первоначальной загрузки и минимум
30 GiB свободного места для распаковки и создания индексов. Установленный набор
ограничен 20 GiB. После установки интернет для чтения базы не нужен.

В корне исходного проекта создайте окружение и установите зависимость:

```powershell
py -3.14 -m venv .library-venv
& ./.library-venv/Scripts/python.exe -m pip install python-chess
& ./.library-venv/Scripts/python.exe scripts/download-big-library.py
```

Для установки сразу в папку переносимой программы добавьте
`--output "ToShaChess Portable/library-packs"`. По умолчанию загрузчик использует
`library-packs` в корне проекта.

После прерывания запустите ту же команду. Завершённые диапазоны загрузки в
`library-packs/.download` используются повторно. Если прервалось построение
незавершённой SQLite-базы, она строится заново из сохранённого архива. Уже
готовые базы проходят проверку размеров, хешей, SQLite и количества записей;
повторно их строить не нужно. Если после завершения базы потерян её манифест,
загрузчик восстанавливает запись из сохранённых в SQLite данных происхождения.
При изменении файла на сервере загрузчик
останавливается: старые и новые части не смешиваются.

Для обновлённой выгрузки задач загрузчик принимает от 1 до 20 миллионов записей,
читает весь архив и проверяет начальный ход каждой задачи. Число 6 100 952 служит
ориентиром прогресса. Ограничения размера сохраняются: сжатый источник до 3 GiB,
база задач до 7 GiB перед созданием индексов и установленный набор до 20 GiB.
При превышении лимита загрузчик сохраняет архив и сообщает об ошибке.

Одновременно открывается не более четырёх HTTPS-соединений. При HTTP 429
загрузчик делает паузу. На Windows используется системный `curl.exe`, когда он
доступен. Сообщения JSON показывают прогресс примерно раз в 30 секунд. Не
запускайте две копии загрузчика для одной папки.

После успешного импорта временные сжатые архивы удаляются. Хранится один PGN с
партиями и индекс с байтовыми смещениями, поэтому партии не дублируются в SQLite.
Папку `library-packs` нужно переносить целиком рядом с переносимой программой.

### Проверка

Быстрая проверка размеров, SQLite, количества записей и выборки диапазонов PGN:

```powershell
& ./.library-venv/Scripts/python.exe scripts/verify-big-library.py
```

Полная проверка SHA256 всех файлов данных и легальный разбор 101 выбранной
задачи и партии:

```powershell
& ./.library-venv/Scripts/python.exe scripts/verify-big-library.py --full-hash --legal
```

Можно передать другой путь первым аргументом, например
`"ToShaChess Portable/library-packs"`. Успех возвращает JSON с `ok: true` и код
выхода 0; ошибка — `ok: false` и код 1. Параметр `--samples 1001` увеличивает
выборку. Полная проверка хешей читает все байты и занимает больше времени.

Загрузчик проверяет опубликованную Lichess SHA256 сжатого архива партий:
`285d09bcb7f47af2d58594ecee7da8c18f9e800fd7df2e0158b4fb5429f9a904`.
Для текущей выгрузки задач отдельная опубликованная сумма не использовалась;
локальная SHA256, HTTP ETag и размер сохранены в манифесте. Каждая начальная
позиция задачи проверяется после легального хода соперника. Полные решения и
партии легально проигрываются на детерминированной выборке; это не утверждение
о проверке каждого хода всех миллионов записей.

## English

The reference Lichess snapshot from September 10, 2026 contains **6,100,952
puzzles**. The installer imports the complete current puzzle export, so later
downloads can have a different count; consult the manifest for the installed
count. The game source is fixed at **9,433,412 rated standard games from December
2016**. These are
games at all playing strengths, not a master-only collection. Actual counts,
sizes, hashes, provenance, and installation status are in `manifest.json`.
Installation is complete only when its `status` is `ready`.

Both datasets come from the [Lichess open database](https://database.lichess.org/)
under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Broadcast
exports use a different license and are not included. The pack stores real chess
records and useful search indexes, with no padding or duplicated PGN payload.

Create `.library-venv` using `py -3.14 -m venv .library-venv`, install `python-chess`
with that environment's Python, and run `scripts/download-big-library.py` using
the commands above. Add `--output "ToShaChess Portable/library-packs"` to install
directly beside the portable executable; the default is the repository's
`library-packs` folder.
The command above resumes completed HTTP ranges. An interrupted SQLite import
restarts from its retained archive. Before reusing a finished database, the
installer verifies SQLite, counts, sizes, and recorded hashes. It can restore a
missing manifest entry from provenance metadata retained in that database. The installer
requires 30 GiB free working space and bounds the installed pack to 20 GiB. It
uses at most four HTTPS connections, retries with backoff, and rejects changed
upstream snapshots. Do not run two installers against the same folder.

The reference puzzle count is a progress estimate. The importer accepts complete
exports between 1 and 20 million records, checks all setup moves, and retains its
size limits: 3 GiB per compressed source, 7 GiB for puzzle tables before index
creation, and 20 GiB for the finished pack. A limit violation stops installation
and preserves the source archive.

The compressed game archive is checked against the published Lichess SHA256.
The puzzle source records a locally computed SHA256, server ETag, and byte size;
it does not claim an independent published puzzle checksum. Every puzzle setup
move is legally checked. Complete continuations and games are checked on a
deterministic sample, with the exact scope recorded in the manifest.

Run `scripts/verify-big-library.py` for read-only size, SQLite, count, and PGN-range
checks. Add `--full-hash --legal` to check every payload byte against its recorded
hash and legally replay the selected records. Pass a different pack directory as
the first positional argument. The CLI emits JSON and exits 0 on success or 1 on
failure. `--samples 1001` increases the deterministic sample.

Keep `library-packs` together beside the portable executable. The app loads small
query pages and individual PGNs on demand; it does not load the full pack into
memory. Temporary compressed archives are removed after verified imports.

## SQLite schema

Both databases have `metadata(key TEXT PRIMARY KEY, value TEXT)`; `count` is a
decimal text value. All paths are relative to the pack folder.

| File / table | Fields |
| --- | --- |
| `puzzles.sqlite` / `puzzles` | `id` text primary key; `fen`, `moves`, `themes`, `game_url`, `opening_tags` text; `rating`, `popularity`, `plays` integers |
| `puzzles.sqlite` / `puzzle_themes` | `theme`, `puzzle_id` text; `rating` integer |
| `games.sqlite` / `games` | `id` integer primary key; `site`, `white`, `black`, `result`, `date`, `eco`, `opening`, `time_control`, `source_file` text; `white_elo`, `black_elo`, `byte_offset`, `byte_length` integers |

Puzzle IDs are `lichess_` followed by the upstream PuzzleId, preserving IDs used
by the smaller bundled selection. `fen` is the position **after** the opponent's
setup move. `moves` contains the remaining space-separated UCI solution;
`themes` contains space-separated theme names.

Indexes: puzzles `(rating,id)`; themes `(theme,rating,puzzle_id)`; games `(eco,id)`,
`(white COLLATE NOCASE,id)`, `(black COLLATE NOCASE,id)`, `(white_elo,id)`, and
`(black_elo,id)`. Use bounded pages/keyset queries. Avoid `ORDER BY RANDOM()` or
large unrestricted result sets. Player prefix searches can use the name indexes.

To retrieve a game, open `source_file` in binary mode, seek to `byte_offset`, read
`byte_length` bytes, then decode UTF-8. Offsets are bytes, not character positions.
The PGN file is `lichess-2016-12.pgn`.
