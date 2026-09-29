type Text = { ru: string; en: string };
export type TablebaseLesson = {
  id: string;
  title: Text;
  initialFen: string;
  expectedWdl: -2 | -1 | 0 | 1 | 2;
  goal: Text;
  hint: Text;
  explanation: Text;
  sampleLine: string[];
  alternative?: {
    title: Text;
    initialFen: string;
    expectedWdl: -2 | -1 | 0 | 1 | 2;
    explanation: Text;
  };
};
/** Original teaching positions; outcomes verified against the pinned local Syzygy 3–5 pack. */
export const tablebaseLessons: TablebaseLesson[] = [
  {
    id: "queen-mate-or-stalemate",
    title: { ru: "Ферзь: мат или пат?", en: "Queen: mate or stalemate?" },
    initialFen: "7k/8/5KQ1/8/8/8/8/8 w - - 0 1",
    expectedWdl: 2,
    goal: {
      ru: "Поставьте мат одним ходом. Затем сравните его с ходом короля.",
      en: "Find mate in one. Then compare it with a king move.",
    },
    hint: {
      ru: "Ферзю нужно дать шах с защищённого поля. Белый король контролирует g7.",
      en: "The queen needs to give check from a protected square. The white king controls g7.",
    },
    explanation: {
      ru: "Qg7# ставит мат: король f6 защищает ферзя, а ферзь перекрывает g8 и h7. Если вместо этого отвести короля, например Ke5, у чёрных не останется легальных ходов, но шаха нет — это пат. Проверьте обе идеи на доске: сохранение большого перевеса ещё не означает победу.",
      en: "Qg7# is mate: the king on f6 protects the queen, which covers g8 and h7. Moving the king away, for example Ke5, leaves Black without a legal move but not in check: stalemate. Try both ideas on the board. A large material advantage alone does not secure a win.",
    },
    sampleLine: ["g6g7"],
  },
  {
    id: "rook-king-cooperation",
    title: {
      ru: "Ладья и король вместе",
      en: "Rook and king working together",
    },
    initialFen: "7k/8/5K2/8/8/8/6R1/8 w - - 0 1",
    expectedWdl: 2,
    goal: {
      ru: "Закончите партию матом в два хода. Начните с улучшения короля.",
      en: "Finish with mate in two. Start by improving the king.",
    },
    hint: {
      ru: "Ладья уже отрезает линию g. Найдите поле, с которого король контролирует g8 и g7.",
      en: "The rook already cuts off the g-file. Find a square from which the king controls g8 and g7.",
    },
    explanation: {
      ru: "После Kf7 у чёрных остаётся Kh7, затем Rh2# завершает партию. Король закрывает соседние поля, ладья даёт шах вдоль линии h. Немедленное Rg7? даёт пат, а Rg8+? позволяет Kxg8: шах сам по себе не делает ход хорошим. Таблица показывает результат каждой альтернативы.",
      en: "After Kf7, Black has only Kh7, and Rh2# finishes the game. The king covers the nearby squares while the rook checks along the h-file. Immediate Rg7? stalemates; Rg8+? allows Kxg8. A check alone does not make a move good. The tablebase shows the outcome of each alternative.",
    },
    sampleLine: ["f6f7", "h8h7", "g2h2"],
  },
  {
    id: "pawn-opposition",
    title: {
      ru: "Оппозиция и очередь хода",
      en: "Opposition and whose turn it is",
    },
    initialFen: "8/3k4/8/3K4/3P4/8/8/8 w - - 0 1",
    expectedWdl: 0,
    goal: {
      ru: "Исследуйте ничейную позицию. Затем поменяйте очередь хода в варианте.",
      en: "Explore the drawn position. Then switch the side to move in the alternative.",
    },
    hint: {
      ru: "Между королями одно поле. Тому, чья очередь хода, придётся уступить оппозицию.",
      en: "One square separates the kings. The side to move must yield the opposition.",
    },
    explanation: {
      ru: "При ходе белых чёрные удерживают ничью точной защитой: король не пропускает соперника на ключевые поля c6, d6 и e6. Если в той же расстановке ход чёрных, им приходится отойти, и белый король проходит вперёд. Изменение очереди хода меняет результат. Значение −2 в варианте дано за чёрных, которым предстоит ход: это победа белых.",
      en: "With White to move, Black draws with accurate defence: the king denies entry to the key squares c6, d6, and e6. With Black to move in the identical arrangement, Black must step aside and the white king advances. Changing the turn changes the outcome. The alternative’s −2 is from Black’s side-to-move perspective: White wins.",
    },
    sampleLine: [],
    alternative: {
      title: {
        ru: "Та же позиция: ход чёрных",
        en: "Same position: Black to move",
      },
      initialFen: "8/3k4/8/3K4/3P4/8/8/8 b - - 0 1",
      expectedWdl: -2,
      explanation: {
        ru: "Выберите любой ответ чёрных и найдите продвижение белого короля. Проверяйте результат после каждого хода.",
        en: "Choose any Black reply and find the white king’s advance. Check the outcome after each move.",
      },
    },
  },
];
