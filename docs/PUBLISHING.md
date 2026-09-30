# Публикация ToShaChess 1.6.0 / Publishing

Публикуй подготовленный чистый исходный экспорт, а не всю рабочую папку. Частная Git-история, данные профилей и установленные пакеты не должны попадать в публичный репозиторий. Эта инструкция не означает, что публикация уже разрешена или выполнена: создание удалённого репозитория, push и release выполняются после согласования с владельцем.

## Подготовка исходников

После завершения локальной интеграции и проверок запусти npm run prepare:github. Скрипт создаёт новую папку ToShaChess-GitHub и отказывается перезаписывать существующую. Он копирует только выбранные каталоги исходников, тесты, лицензии, конфигурацию, перечисленные скрипты и руководства. Документы PUBLISHING, LIBRARY, TRAINING, AUTHORING, ENGINES и OPTIONAL_TOOLS входят в явный список. Частные .superpowers-отчёты и планы не копируются.

Экспорт не создаёт Git-репозиторий или коммит, не добавляет remote и ничего не отправляет в сеть. После успешного аудита просмотри экспорт и создай новый репозиторий в этой чистой папке. При необходимости через терминал:

```powershell
git init -b main
git add .
git commit -m "Initial public ToShaChess 1.6.0 source"
git remote add origin https://github.com/YOUR_USERNAME/ToShaChess.git
git push -u origin main
```

Замените YOUR_USERNAME; удалённый репозиторий должен быть создан владельцем или с его разрешения. Существующий публичный проект обновляй обычной проверяемой веткой/PR, не заменяя его историю повторным частным экспортом.

## Проверки и релиз

Перед релизом проверь typecheck, тесты, контент, сборку и переносимую копию. Команды приведены в README. Ошибки необязательных runtime-тестов нельзя скрывать: отсутствие установленного пакета должно быть явным пропуском. Workflow Windows проверяет push и создаёт Actions artifact; он не публикует GitHub Release автоматически. Запуск workflow на GitHub подтверждается только фактическим результатом, а не локальной проверкой.

Для версии 1.6.0 используй tag v1.6.0 и проверенный чистый ZIP приложения. Чистая сборка предлагает создать профиль и не содержит заранее сохранённых пользователей. Публичный ZIP готовится из release/win-unpacked, не из установленной папки с прогрессом. Сохраняй лицензии и соответствующие исходники распространяемых компонентов, включая Stockfish. Включи Private vulnerability reporting, если принимаешь закрытые отчёты.

## Границы пакетов и лицензий

Распознавание доски включено в готовое приложение: модель fenshot и WASM ONNX Runtime берутся из фиксированных npm-зависимостей при сборке Vite. В исходном Git-экспорте остаются package-lock.json и лицензии, без копирования node_modules или отдельных весов. Это небольшой встроенный компонент, а не загружаемый пользователем engine-pack. Его лицензия, версия и хеш модели указаны в THIRD_PARTY_NOTICES.md.

data, library-packs, engine-packs, личные PGN, ключи, скачанные архивы, runtime, веса и производные индексы не входят в публичный Git-экспорт. Аудит также запрещает исполняемые файлы, Python binaries, распространённые форматы весов и файлы Syzygy. Вместо пакетов публикуются загрузчики с фиксированными URL/хешами и инструкции. Сам факт наличия описания пакета в исходниках не означает, что его файлы включены в релиз.

Stockfish включается отдельно при сборке приложения. Maia CPU и дополнительные модели пользователь устанавливает явно. Lc0 engine имеет собственную GPL-лицензию; это не устанавливает лицензию любой сети. Для сети 791556.pb.gz из официального CPU ZIP отдельные права здесь не подтверждены, поэтому не добавляй её в публичный исходный экспорт и не объявляй GPL по аналогии с движком. При отдельном распространении весов сначала установи применимые условия. CPU-пакет не обещает GPU/CUDA-работу.

Для личного переноса закрой приложение и скопируй data, library-packs и engine-packs вместе с приложением. Экспорт профиля не включает общие пакеты. Внешние движки и сети вне этих папок копируются отдельно и выбираются заново. Такой личный перенос отличается от подготовки чистого публичного ZIP.

## English

The built app includes the fenshot screenshot model and ONNX WASM runtime from pinned npm dependencies. The source export retains the lockfile and licenses, without node_modules or separate weight files. This is a small bundled component, not a user-downloaded engine pack; see THIRD_PARTY_NOTICES.md for model provenance and checksum.

Run npm run prepare:github only after integration and verification. It creates a fresh ToShaChess-GitHub source folder, audits its allowlisted content and refuses to overwrite an existing folder. It does not initialize Git, create a commit, configure a remote or publish. Review the result before creating a fresh public repository; updates to an existing public repository belong in its normal branch/PR workflow.

Version 1.6.0 uses tag v1.6.0 after approval and a verified clean application ZIP. GitHub Actions artifacts are not automatically published releases. Preserve component licenses and corresponding source obligations. Exclude profiles, private PGN, keys, downloaded packs, runtimes, weights and derived indexes from source exports. Publish their loaders and documentation instead. Lc0 network rights are separate from the engine GPL, and the CPU package makes no GPU promise.

Personal migration includes data, library-packs and engine-packs with the closed application; profile backups omit the latter two. Transfer and reselect custom external engines/networks separately. Consult [engine installation and measurements](ENGINES.md), [optional tools](OPTIONAL_TOOLS.md) and [third-party notices](../THIRD_PARTY_NOTICES.md).
