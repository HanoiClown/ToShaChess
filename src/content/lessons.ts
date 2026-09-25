import { START } from "../chess/game";
export type Bilingual = { ru: string; en: string };
export const bi = (ru: string, en: string): Bilingual => ({ ru, en });
export type Chapter = {
  title: Bilingual;
  body: Bilingual;
  fen: string;
  line: string[];
};
export type Lesson = {
  id: string;
  group: "basics" | "openings" | "endgames";
  title: Bilingual;
  description: Bilingual;
  chapters: Chapter[];
};
const chapter = (
  title: Bilingual,
  body: Bilingual,
  line: string[],
  fen = START,
): Chapter => ({ title, body, line, fen });
export const lessons: Lesson[] = [
  {
    id: "board",
    group: "basics",
    title: bi("Знакомство с доской", "Meet the board"),
    description: bi(
      "Клетки, цвета и первый ход",
      "Squares, colours and your first move",
    ),
    chapters: [
      chapter(
        bi("64 клетки", "64 squares"),
        bi(
          "Доска состоит из 8 вертикалей a–h и 8 горизонталей 1–8. Белая клетка — справа внизу. Белые ходят первыми. Нажми на пешку e2, затем на e4: ты займёшь центр.",
          "The board has 8 files a–h and 8 ranks 1–8. A light square belongs at the bottom right. White moves first. Select the pawn on e2, then e4 to occupy the centre.",
        ),
        ["e4"],
      ),
    ],
  },
  {
    id: "pawn",
    group: "basics",
    title: bi("Пешка", "The pawn"),
    description: bi(
      "Вперёд ходит, наискосок берёт",
      "Forward moves, diagonal captures",
    ),
    chapters: [
      chapter(
        bi("Первый шаг", "The first step"),
        bi(
          "Пешка ходит вперёд на одну клетку. С начальной клетки можно на две, если путь свободен. Сыграй e4.",
          "A pawn moves one square forward. From its starting square it may move two if both squares are clear. Play e4.",
        ),
        ["e4"],
      ),
      chapter(
        bi("Взятие", "A capture"),
        bi(
          "Пешка берёт на одну клетку по диагонали. Пешкой e4 забери пешку d5.",
          "A pawn captures one square diagonally. Capture the d5 pawn with your e4 pawn.",
        ),
        ["exd5"],
        "7k/8/8/3p4/4P3/8/8/7K w - - 0 1",
      ),
    ],
  },
  {
    id: "rook",
    group: "basics",
    title: bi("Ладья", "The rook"),
    description: bi("Прямые линии", "Straight lines"),
    chapters: [
      chapter(
        bi("Открытая вертикаль", "An open file"),
        bi(
          "Ладья ходит по вертикали и горизонтали на любое число свободных клеток. Она не перепрыгивает фигуры. Подними ладью с a1 на a8 и объяви шах.",
          "A rook moves any distance along a rank or file without jumping pieces. Move the rook from a1 to a8 to give check.",
        ),
        ["Ra8+"],
        "7k/8/8/8/8/8/8/R6K w - - 0 1",
      ),
    ],
  },
  {
    id: "bishop",
    group: "basics",
    title: bi("Слон", "The bishop"),
    description: bi("Длинные диагонали", "Long diagonals"),
    chapters: [
      chapter(
        bi("По диагонали", "Along the diagonal"),
        bi(
          "Слон ходит по диагонали и всегда остаётся на клетках одного цвета. Переведи слона с c1 на h6.",
          "A bishop moves diagonally and always stays on one colour. Move the bishop from c1 to h6.",
        ),
        ["Bh6"],
        "7k/8/8/8/8/8/8/2B4K w - - 0 1",
      ),
    ],
  },
  {
    id: "knight",
    group: "basics",
    title: bi("Конь", "The knight"),
    description: bi("Ход буквой Г", "The L-shaped move"),
    chapters: [
      chapter(
        bi("Два плюс один", "Two plus one"),
        bi(
          "Конь идёт на две клетки по прямой и одну вбок. Он единственный перепрыгивает фигуры. Переведи коня e4 на f6.",
          "A knight moves two squares in one direction and one sideways. It can jump over other pieces. Move the e4 knight to f6.",
        ),
        ["Nf6"],
        "7k/8/8/8/4N3/8/8/7K w - - 0 1",
      ),
    ],
  },
  {
    id: "queen",
    group: "basics",
    title: bi("Ферзь", "The queen"),
    description: bi("Ладья и слон в одной фигуре", "Rook and bishop combined"),
    chapters: [
      chapter(
        bi("Сильнейшая фигура", "The strongest piece"),
        bi(
          "Ферзь ходит прямо и по диагонали, но не перепрыгивает фигуры. С d1 сыграй Qh5.",
          "The queen moves along ranks, files and diagonals, but cannot jump. Play Qh5 from d1.",
        ),
        ["Qh5"],
        "7k/8/8/8/8/8/8/3Q3K w - - 0 1",
      ),
    ],
  },
  {
    id: "king",
    group: "basics",
    title: bi("Король и шах", "King and check"),
    description: bi(
      "Короля нельзя оставлять под ударом",
      "Never leave your king attacked",
    ),
    chapters: [
      chapter(
        bi("Безопасная клетка", "A safe square"),
        bi(
          "Король ходит на одну клетку. На атакованную клетку идти нельзя. Переведи короля e1 на e2.",
          "The king moves one square. It cannot move onto an attacked square. Move the king from e1 to e2.",
        ),
        ["Ke2"],
        "7k/8/8/8/8/8/8/4K3 w - - 0 1",
      ),
      chapter(
        bi("Уйти от шаха", "Escape check"),
        bi(
          "При шахе обязательно защитить короля: уйти, закрыться или взять нападающего. Здесь уйди королём на f1.",
          "When in check, move the king, block the attack or capture the attacker. Here move the king to f1.",
        ),
        ["Kf1"],
        "4r2k/8/8/8/8/8/8/4K3 w - - 0 1",
      ),
    ],
  },
  {
    id: "castle",
    group: "basics",
    title: bi("Рокировка", "Castling"),
    description: bi(
      "Король в безопасности, ладья в игре",
      "A safer king, an active rook",
    ),
    chapters: [
      chapter(
        bi("Короткая рокировка", "Kingside castling"),
        bi(
          "Король и ладья не должны были ходить. Между ними нет фигур; король не под шахом и не проходит атакованные клетки. Перемести короля e1 на g1 — ладья перейдёт сама.",
          "Neither the king nor rook may have moved. The path must be clear; the king cannot castle out of, through or into check. Move e1 to g1: the rook follows automatically.",
        ),
        ["O-O"],
        "r3k2r/ppp2ppp/8/8/8/8/PPP2PPP/R3K2R w KQkq - 0 1",
      ),
    ],
  },
  {
    id: "promotion",
    group: "basics",
    title: bi("Превращение и взятие на проходе", "Promotion and en passant"),
    description: bi("Два особых правила пешки", "Two special pawn rules"),
    chapters: [
      chapter(
        bi("Новая фигура", "A new piece"),
        bi(
          "Дойдя до последней горизонтали, пешка становится ферзём, ладьёй, слоном или конём. Здесь выбери ферзя.",
          "On the last rank, a pawn becomes a queen, rook, bishop or knight. Choose a queen here.",
        ),
        ["a8=Q+"],
        "7k/P7/8/8/8/8/8/7K w - - 0 1",
      ),
      chapter(
        bi("Только немедленно", "Only immediately"),
        bi(
          "Чёрная пешка только что пошла d7–d5. Пешка e5 может взять её как будто та пошла на d6. Этот ответ доступен только сразу.",
          "Black just played d7–d5. Your e5 pawn may capture it as though it moved to d6. This is only available immediately.",
        ),
        ["exd6"],
        "7k/8/8/3pP3/8/8/8/7K w - d6 0 2",
      ),
    ],
  },
  {
    id: "checklist",
    group: "basics",
    title: bi("Проверка перед ходом", "Before you move"),
    description: bi("Шахи, взятия, угрозы", "Checks, captures, threats"),
    chapters: [
      chapter(
        bi("Развивай фигуры", "Develop your pieces"),
        bi(
          "Перед каждым ходом проверь шахи и взятия соперника. В дебюте занимай центр, выводи лёгкие фигуры, готовь рокировку. Пройди короткую последовательность развития.",
          "Before each move, check your opponent’s checks and captures. Occupy the centre, develop minor pieces and prepare to castle. Play this short development sequence.",
        ),
        ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "O-O"],
      ),
    ],
  },
  {
    id: "mate",
    group: "endgames",
    title: bi("Мат и пат", "Checkmate and stalemate"),
    description: bi("Не упустить победу", "Do not let a win slip away"),
    chapters: [
      chapter(
        bi("Мат в один", "Mate in one"),
        bi(
          "Мат — это шах, от которого нельзя защититься. Поставь ферзя g7. Он защищён королём f6.",
          "Checkmate is a check with no legal escape. Move your queen to g7. It is protected by your king on f6.",
        ),
        ["Qg7#"],
        "7k/8/5KQ1/8/8/8/8/8 w - - 0 1",
      ),
      chapter(
        bi("Вместо пата — шах", "Give check, avoid stalemate"),
        bi(
          "Из твоей партии с Cliff. Немедленное Qxd3 даст пат. Сначала Be3+! После вынужденного Kc4 забери пешку с матом.",
          "From your Cliff game. Immediate Qxd3 is stalemate. First Be3+! After the forced Kc4, capture the pawn with mate.",
        ),
        ["Be3+", "Kc4", "Qxd3#"],
        "8/3QR3/2p3p1/2k3B1/8/P2p4/2P4P/1R4K1 w - - 0 34",
      ),
    ],
  },
  {
    id: "rook-mate",
    group: "endgames",
    title: bi("Мат ладьёй", "Rook checkmate"),
    description: bi(
      "Отрезать короля и помочь своим",
      "Cut off the king and bring yours",
    ),
    chapters: [
      chapter(
        bi("Король помогает ладье", "The king supports the rook"),
        bi(
          "Белый король отнимает поля на седьмой горизонтали. Поставь ладью на a8 — чёрному королю некуда уйти. В полном окончании постепенно сужай прямоугольник короля соперника.",
          "Your king controls the seventh rank. Play Ra8: Black has no escape. In a full rook ending, gradually shrink the opposing king’s rectangle.",
        ),
        ["Ra8#"],
        "4k3/8/4K3/8/8/8/R7/8 w - - 0 1",
      ),
    ],
  },
  {
    id: "king-endgame",
    group: "endgames",
    title: bi("Активный король", "An active king"),
    description: bi(
      "Не торопись менять последнюю фигуру",
      "Think before trading the last piece",
    ),
    chapters: [
      chapter(
        bi("Выйти к центру", "Head toward the centre"),
        bi(
          "Из партии с Nina. Размен Ne1? Nxe1 оставляет чёрному королю путь к твоим пешкам. Вместо этого активируй короля ходом Ke2.",
          "From the Nina game. Ne1? Nxe1 lets Black’s king reach your pawns. Activate your king with Ke2 instead.",
        ),
        ["Ke2"],
        "8/8/2k3p1/p7/8/1P1N1n2/1P6/3K4 w - - 0 38",
      ),
    ],
  },
  {
    id: "evans",
    group: "openings",
    title: bi("Гамбит Эванса", "Evans Gambit"),
    description: bi("Темпы и центр за пешку", "Time and the centre for a pawn"),
    chapters: [
      chapter(
        bi("Принятие гамбита", "Accepting the gambit"),
        bi(
          "После итальянского развития b4 отвлекает слона. За пешку ты получаешь c3 и d4 с темпом. Развивайся и рокируйся: компенсация требует активности, она не гарантирует выигрыш.",
          "After Italian development, b4 deflects the bishop. In return for a pawn, c3 and d4 gain time in the centre. Develop and castle: compensation needs activity, it does not guarantee a win.",
        ),
        [
          "e4",
          "e5",
          "Nf3",
          "Nc6",
          "Bc4",
          "Bc5",
          "b4",
          "Bxb4",
          "c3",
          "Ba5",
          "d4",
        ],
      ),
      chapter(
        bi("Если пешку не взяли", "If Black declines"),
        bi(
          "После ...Bb6 не пытайся любой ценой отдать пешку. Сохрани пространство, сыграй d3 и закончи развитие.",
          "After ...Bb6, do not force a sacrifice. Keep the space, play d3 and finish development.",
        ),
        ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "b4", "Bb6", "d3"],
      ),
    ],
  },
  {
    id: "scotch",
    group: "openings",
    title: bi("Шотландский гамбит", "Scotch Gambit"),
    description: bi(
      "Быстрое развитие в открытом центре",
      "Fast development in an open centre",
    ),
    chapters: [
      chapter(
        bi(
          "Развитие вместо возврата пешки",
          "Develop before recovering the pawn",
        ),
        bi(
          "После ...exd4 ход Bc4 направляет слона к f7. Готовь рокировку, считай ответ ...Nf6. Жертва пешки не даёт права игнорировать угрозы.",
          "After ...exd4, Bc4 points at f7. Prepare to castle and account for ...Nf6. A pawn sacrifice does not excuse ignoring threats.",
        ),
        ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Bc4", "Bc5", "c3"],
      ),
      chapter(
        bi("Защита ...Nf6", "The ...Nf6 defence"),
        bi(
          "При ...Nf6 соперник тоже атакует центр. Сыграй e5 с темпом, затем развивай коня. Каждый выпад проверяй на ответ.",
          "With ...Nf6, Black attacks the centre too. Play e5 with tempo, then develop the knight. Check the reply to every attacking move.",
        ),
        [
          "e4",
          "e5",
          "Nf3",
          "Nc6",
          "d4",
          "exd4",
          "Bc4",
          "Nf6",
          "e5",
          "d5",
          "Bb5",
        ],
      ),
    ],
  },
  {
    id: "danish",
    group: "openings",
    title: bi("Датский гамбит", "Danish Gambit"),
    description: bi(
      "Открытые диагонали за материал",
      "Open diagonals for material",
    ),
    chapters: [
      chapter(
        bi("Две пешки за развитие", "Two pawns for development"),
        bi(
          "После c3 и Bc4 белые предлагают пешки за активных слонов. Не считай атаку автоматической: чёрные могут вернуть материал и завершить развитие.",
          "After c3 and Bc4, White offers pawns for active bishops. The attack is not automatic: Black can return material and finish developing.",
        ),
        ["e4", "e5", "d4", "exd4", "c3", "dxc3", "Bc4", "cxb2", "Bxb2"],
      ),
      chapter(
        bi("Контрудар в центре", "A central counterstrike"),
        bi(
          "На ...d5 гамбита в прежнем виде уже нет: сначала реши напряжение в центре. Не заучивай жертву независимо от ходов соперника.",
          "After ...d5, the original gambit pattern changes. Resolve the central tension. Do not memorize a sacrifice regardless of your opponent’s moves.",
        ),
        ["e4", "e5", "d4", "exd4", "c3", "d5", "exd5"],
      ),
    ],
  },
  {
    id: "kings-gambit",
    group: "openings",
    title: bi("Королевский гамбит", "King’s Gambit"),
    description: bi(
      "Инициатива с риском для короля",
      "Initiative with king-side risk",
    ),
    chapters: [
      chapter(
        bi("Принятый гамбит", "Gambit accepted"),
        bi(
          "f4 предлагает пешку и открывает линии, но ослабляет короля. После ...exf4 развивай Nf3. На ...g5 готовь развитие слона, не начинай новую жертву без расчёта.",
          "f4 offers a pawn and opens lines, but weakens your king. After ...exf4 develop Nf3. Against ...g5, develop the bishop; do not add another sacrifice without calculation.",
        ),
        ["e4", "e5", "f4", "exf4", "Nf3", "g5", "Bc4"],
      ),
      chapter(
        bi("Отказ ...Bc5", "Declining with ...Bc5"),
        bi(
          "Не хватай e5 автоматически: диагональ к твоему королю открывается. Поддержи центр ходом Nf3 и затем c3/d4, если позиция позволяет.",
          "Do not grab e5 automatically: a diagonal toward your king opens. Support the centre with Nf3, then consider c3/d4 if the position permits.",
        ),
        ["e4", "e5", "f4", "Bc5", "Nf3"],
      ),
    ],
  },
  {
    id: "black-e5",
    group: "openings",
    title: bi("Чёрными против 1.e4", "Black against 1.e4"),
    description: bi(
      "Развитие и своевременный ...d5",
      "Development and a timely ...d5",
    ),
    chapters: [
      chapter(
        bi("Ответ в центре", "Meet the centre"),
        bi(
          "Инициативу проще перехватить развитыми фигурами. Ответь ...e5, выведи коня, слона и рокируйся. Затем готовь ...d5, учитывая защиту пешки e5.",
          "It is easier to seize the initiative with developed pieces. Play ...e5, develop knight and bishop, then castle. Prepare ...d5 while keeping e5 defended.",
        ),
        ["e5", "Nf3", "Nc6", "Bc4", "Nf6"],
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      ),
      chapter(
        bi("Центр против раннего ферзя", "The centre against an early queen"),
        bi(
          "На раннего ферзя не отвечай пешечными ходами наугад. После e4 e5 Qh5 защити e5 конём Nc6. Прежде чем играть ...Nf6, проверь мат на f7.",
          "Do not answer an early queen with random pawn moves. After e4 e5 Qh5, defend e5 with Nc6. Before ...Nf6, check the mating threat on f7.",
        ),
        ["Nc6"],
        "rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2",
      ),
    ],
  },
  {
    id: "black-d5",
    group: "openings",
    title: bi("Чёрными против 1.d4", "Black against 1.d4"),
    description: bi(
      "Надёжный центр и контригра",
      "A sound centre and counterplay",
    ),
    chapters: [
      chapter(
        bi("Подрыв ...c5", "The ...c5 break"),
        bi(
          "Ответь ...d5, поддержи центр ...e6, развивай коня. Подрыв ...c5 атакует белую пешку d4. Это активная игра без обязательной жертвы.",
          "Answer ...d5, support the centre with ...e6 and develop your knight. The ...c5 break attacks d4. Active play does not require a sacrifice.",
        ),
        ["d5", "c4", "e6", "Nc3", "Nf6", "Nf3", "c5"],
        "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1",
      ),
    ],
  },
];
