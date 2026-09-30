# Обучение / Training

## Русский

### Найти нужный режим

В основном меню четыре раздела: «Сегодня», «Играть», «Обучение» и «Анализ». В обучении доступны уроки, задачи, видение доски и личная практика. В анализе — мои партии, разбор, исследования, конструктор и база партий. Внутри каждого раздела переключай режимы кнопками над заголовком страницы.

### Проверить свой вариант во время разбора

Выбери ход партии или открой лучшее продолжение и просто передвинь фигуру на доске. Можно играть за обе стороны, возвращаться назад, пробовать другой ход и проверять текущую позицию Stockfish. Нажатие на ход в найденном продолжении показывает эту позицию, следующие ходы доступны стрелкой вперёд. «Вернуться к партии» закрывает временный вариант. Исходные ходы, точность и объяснения партии сохраняются. Чтобы оставить вариант на будущее, нажми «Исследовать позицию».

ПКМ рисует планы за любой цвет, независимо от очереди хода и занятых полей. Например, можно отметить d2–d3 и затем c1–g5 до реального хода пешкой. Форма движения остаётся правильной: слон — по диагонали, ладья — по вертикали или горизонтали, конь — буквой Г. Стрелка показывает намерение, а не гарантирует легальность в текущей позиции. ЛКМ или Escape очищает метки.

### Выбрать помощь для позиции

Обычный разбор и проверка позиции используют Stockfish автоматически. В «Изучить позицию глубже» выбери вопрос: «Как ответит человек» использует Maia; «Как играли в похожих партиях» показывает местную статистику; «Точный исход окончания» использует таблицы Syzygy; «Получить второе мнение» запускает подключённый дополнительный движок. У каждого режима есть пояснение. Установка пакетов и настройка моделей доступны через «Открыть настройки инструментов» или «Настройки → Дополнительные возможности анализа».

### Пройти дебют и проверить понимание

1. В «Обучении» открой курс и прочитай идею и цену выбранного дебюта. Просмотр показывает объяснение после каждого хода; расширенная заметка разбирает ключевое решение.
2. Изучи основную линию и разные ответы соперника. Ветка — альтернативное продолжение из конкретной позиции, а не новый ход после конца основной линии.
3. В «Ловушках» выбери эпизод. Первый ход показывает ошибку соперника, следующий нужно найти самому. В «Защите» играй за сторону, которой предстоит избежать той же ошибки. Ошибки встречаются у обоих цветов.
4. Запусти практику без подсказки. Просмотр и практика учитываются отдельно; простое перелистывание не подтверждает усвоение.
5. Открой реальные партии из курса и сравни дальнейший план. Это примеры практической игры: даже сильные игроки ошибаются, поэтому спорный ход проверяй Stockfish.

### Исследовать позицию

Из курса, партии или редактора открой исследование. Делай легальные ходы за обе стороны, возвращайся по дереву и добавляй варианты. Комментарии относятся к выбранному узлу. Сохрани исследование в активном профиле; исходный курс или партия не переписываются. Импорт PGN с вариантами и комментариями создаёт новое исследование (одна партия, до 1 МБ). Перед импортом сохрани текущие изменения. «Получить PGN» позволяет перенести своё дерево.

Панель Stockfish показывает оценку и продолжение. Maia показывает вероятные человеческие ответы при выбранном уровне, а не доказательство силы хода. Можно доиграть текущую позицию против нужного соперника. Не путай оценку Stockfish, вероятность Maia и частоту хода в местном архиве: это разные вопросы.

Ходы, анализ Stockfish, Maia и дополнительные инструменты собраны в правой панели. Прокручивай её колёсиком; с клавиатуры перейди в панель клавишей Tab и используй Page Up / Page Down. В небольшом окне панель располагается под доской и прокручивается вместе со страницей. Новый результат Stockfish появляется выше заметок. Нажми на продолжение, чтобы добавить до 20 полуходов в дерево и разобрать их на доске.

### Повторять с интервалами

В «Личной практике» выбери исследование и добавь позицию с продолжением в очередь. Повторяй карточки, когда наступает срок. Доступны вспоминание продолжения, поиск защиты, прогноз ответа Maia, доигрывание и «Рука и мозг». Режим Maia требует установленного пакета. Карточку можно отложить на день или убрать из очереди; исследования и очередь принадлежат активному профилю. Смена профиля не переносит его задания другому пользователю.

Для отдельной комбинации решай задачу до конца варианта. Неверный ход остаётся видимым для разбора; повтор возвращает начальную позицию. В редакторе сначала проверь легальность FEN, затем анализируй или играй из позиции.

### Тренер и перенос

Локальный тренер использует анализ движка и работает без ключа. Облачный тренер необязателен: запрос отправляет выбранный шахматный контекст провайдеру и расходует локально учитываемый бюджет. Текст не заменяет проверку линии на доске. Ключи не включаются в экспорт профиля. Для полного переноса закрой приложение и следуй инструкции переноса в README; установленные `library-packs` и `engine-packs` копируются отдельно от экспорта профилей. Собственные движки/сети вне этих папок перенеси отдельно и выбери заново.

## English

### Find a mode

The main menu has four sections: Today, Play, Learn and Analysis. Learn contains lessons, puzzles, board vision and personal practice. Analysis contains your games, game review, studies, the position editor and the game database. Use the section buttons above the page heading to switch modes.

### Try a variation during review

Select a game move or open the best continuation, then move a piece on the board. Play either side, step backwards, try another move and ask Stockfish about the displayed position. Clicking a move in a returned line opens that position; step forward to see the rest. Return to game closes the temporary variation. Saved game moves, accuracy and explanations stay intact. Use Explore position to keep the current line as a study.

Right-drag draws plans for either color, ignoring turn and occupied squares. For example, mark d2–d3 and c1–g5 before moving the pawn. Arrows keep the piece's movement shape: bishops diagonal, rooks straight and knights L-shaped. An arrow expresses a plan, not proof that the move is legal now. Left click or Escape clears marks.

### Choose help for a position

Standard review and position checks use Stockfish automatically. In Explore this position further, choose a question: human replies use Maia; historical games use local archive statistics; exact endgame outcomes use Syzygy tables; a second opinion uses your configured additional engine. Each choice explains when to use it. Open tool settings takes you to installation and configuration, also available under Settings → More analysis options.

### Learn an opening, then practise

Open a course from Learning. Read its idea and cost, follow the main line with move explanations, then compare the opponent's alternatives. Extended notes explain critical decisions. A branch starts at its marked position, not at the end of the main line.

Choose a trap episode: the first move demonstrates the opponent's mistake and you find the punishment. Defence uses the other side to avoid that mistake. Both colours can be wrong. Switch to practice to recall the moves; watching and successful practice have separate progress. Real games illustrate later plans, but are not flawless engine-certified models.

### Explore and repeat

Open a study from a course, game or editor. Make legal moves for either side, navigate the tree, add branches and comments, then save to the active profile. The original course/game remains intact. PGN import accepts one game with comments and variations up to 1 MB and creates a new study; save current changes before importing. Generate PGN to export your tree.

Stockfish supplies evaluation and calculated lines. Maia supplies likely human replies for a selected skill level. Local archive frequency reports what occurred in that archive. None is interchangeable with the others. Play out the current position to test a plan.

Moves, Stockfish analysis, Maia and advanced tools share the right panel. Scroll with the wheel, or Tab into the panel and use Page Up / Page Down. In a narrow window the panel sits below the board and scrolls with the page. New Stockfish results appear above notes. Select a continuation to add up to 20 plies to the tree and explore them on the board.

In Personal practice, select a study and add a position with a continuation. Work through due cards using recall, defence, Maia prediction, play-out or hand-and-brain mode. Maia prediction needs its installed pack. Postpone or remove a card as needed. Studies and repetition progress stay with the active profile.

Puzzles require the full continuation. A wrong move remains visible for review; retry resets the position. Validate custom FENs in the editor before analysis or play. The local coach works offline; optional cloud explanations send the selected chess context to the provider and use the app's budget. Check their claims against legal engine lines. Profile backups omit API keys; see README for full portable-folder transfer. Profile backups exclude `library-packs` and `engine-packs`; copy those separately, along with any custom engine/network stored elsewhere.

Engine installation, limitations and benchmarks: [ENGINES.md](ENGINES.md). Content evidence and contribution rules: [AUTHORING.md](AUTHORING.md).

## Positions from images

### По-русски

Открой **Конструктор → Импорт по фото**. Выбери PNG/JPG/WebP, перетащи файл или вставь скриншот через Ctrl+V. Файл — до 20 МБ, изображение — до 32 Мп, минимум 128 пикселей по каждой стороне. Поддерживаются плоские 2D-доски и диаграммы, а не фотографии настоящих фигур под углом.

Нажми **Распознать доску**. Если автоматический поиск ошибся, выдели мышью внешний край всех 64 полей без рамки. Границы также задаются числами в процентах; **Автообрезка** сбрасывает выделение. В правой части сравни фигуры с оригиналом. Знак «?» означает неуверенное распознавание, но проверять нужно все поля: модель иногда уверенно ошибается, особенно под надписями и значками. Выбери фигуру или ластик в поле исправления и нажми нужную клетку.

Проверь **Снизу на фото** и **Ход после снимка**. Ориентация предположена по фигурам. При смене ориентации ручные исправления сохраняются и поворачиваются вместе с расстановкой. **Перенести в конструктор** заменяет текущий черновик только после твоего нажатия. Рокировка, взятие на проходе и история ходов по картинке неизвестны; при необходимости задай их в конструкторе. Даже неполную расстановку можно перенести для исправления, но анализ и игра доступны только после проверки её легальности.

Чтобы исследовать последний ход, раскрой **Восстановить последний ход**. На доске должна быть позиция *после* хода. Введи поля «Откуда» / «Куда» (например d4 / c6) и взятую фигуру, если было взятие. Приложение проверит ход по правилам, рассчитает позиции до и после через Stockfish и покажет оценку и ответ. Кнопки **До хода** / **После хода** позволяют играть продолжения на доске. **Разобрать варианты** создаёт личное исследование с исходной позицией и этим ходом; там можно возвращаться, добавлять ответвления и комментарии. Рокировку, превращение и взятие на проходе восстанавливай вручную: одного снимка недостаточно для их истории. Оценка относится к введённой позиции и текущей глубине расчёта, а не к значкам на фото.

Распознавание работает офлайн на CPU. Модель и среда включены в приложение; ключи API и отдельная загрузка не нужны. Картинка обрабатывается в памяти и исчезает при выходе из раздела или смене профиля. Изображение не попадает в сохранения и резервные копии. Чтобы сохранить результат, создай исследование: оно хранит расстановку и выбранные ходы.

### English

Open **Position editor → Import from image**. Choose, drop or paste a PNG/JPG/WebP with Ctrl+V (up to 20 MB / 32 megapixels, minimum 128 pixels per side). Press **Recognize board**. The offline model supports axis-aligned 2D screenshots and diagrams, not perspective photos of physical boards.

If detection misses the board, drag around all 64 squares, excluding the border, or enter crop boundaries in percent. **Automatic crop** resets the crop. Review every square, including confident results. A question mark identifies low confidence. Text overlays and unfamiliar pieces can cause mistakes. Choose a piece or eraser and click a square to correct it.

Check **Bottom of the image**. Changing orientation rotates the corrected position and preserves your edits. Select **Next to move**, then **Use in position editor**. No position replaces your editor draft until that button is pressed. Castling and en passant start disabled because a picture contains no move history. Set these manually if known. Incomplete positions may be imported for editing, but cannot be analyzed or played until valid.

For an image taken after a move, expand **Reconstruct the last move**, enter source/destination and any captured piece. The app validates the move by playing it forward, then compares both positions with Stockfish. Use **Before move** / **After move** to play continuations, or **Explore alternatives** to save a study with the position and move. Rebuild castling, promotion and en passant manually. Engine labels depend on the entered position and search depth; badges in the image are not evidence of move quality.

Recognition uses bundled CPU/WASM assets without a key, upload or runtime download. Images stay in memory only and are cleared on navigation or profile change. Saved studies and backups contain chess positions and chosen moves, not the source image.
