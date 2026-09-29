import {
  steps,
  text,
  openGames,
  sourceFor,
  type CourseSeed,
} from "./authoring";
import { episodeLibrary } from "./tactical-episodes";
const start = [
  ...openGames.slice(0, 2),
  ...steps(`
f4|Белые предлагают пешку f, чтобы отвлечь e5 и построить центр d4–e4. Диагональ к королю e1 при этом ослабевает.|White offers the f-pawn to divert e5 and build a d4–e4 centre. This also weakens the diagonal to the e1 king.
`),
];
const accepted = [
  ...start,
  ...steps(`
exf4|Чёрные принимают пешку, но покидают e5: белые получают пространство для d4, а чёрные — цель защиты на f4.|Black accepts the pawn but leaves e5: White gains room for d4 while Black must decide how to protect f4.
Nf3|Конь контролирует h4 и готовит рокировку. Это важнее немедленной охоты за пешкой f4.|The knight controls h4 and prepares castling. That matters more than immediately chasing the f4 pawn.
`),
];
const main = [
  ...accepted,
  ...steps(`
d5|Центральный контрудар мешает белым безнаказанно занять d4 и открывает слона c8.|The central counterstrike challenges White's intended d4 and releases the c8 bishop.
exd5|Белые убирают пешку d5, но отказываются от пешки e4: будущий центр придётся строить заново.|White removes d5 but gives up the e4 pawn's central role: the centre will need rebuilding.
Nf6|Вместо спешки с возвратом d5 чёрные развивают коня с нападением на эту пешку.|Rather than rush to regain d5, Black develops a knight while attacking that pawn.
Bb5+|Шах выводит слона с темпом, но ответ …c6 одновременно нападёт на него и пешку d5.|The check develops the bishop with tempo, but ...c6 will challenge both the bishop and the d5 pawn.
c6|Чёрные перекрывают шах пешкой и предлагают вскрыть линию c ради развития коня.|Black blocks the check with a pawn and offers to open the c-file to develop the knight.
dxc6|Белые принимают вторую пешку; оценивать нужно ответное развитие, а не только число взятий.|White accepts another pawn; the reply's development matters more than the number of captures.
Nxc6|Конь выходит с возвратом пешки, а слон b5 уже не выигрывает темп на короле.|The knight develops while recovering the pawn, and the b5 bishop no longer gains tempo against the king.
d4|Пешка поддерживает e5 и освобождает слона c1; изолированный центр нужно защищать фигурами.|The pawn supports e5 and frees the c1 bishop; this isolated centre needs piece support.
Bd6|Слон защищает f4 и нацеливается на королевский фланг. Это активная защита лишней пешки.|The bishop protects f4 and eyes the kingside. This is active defence of the extra pawn.
O-O|Король покидает открытую диагональ к e1, ладья получает полуоткрытую линию f.|The king leaves the exposed diagonal to e1 and the rook gains the half-open f-file.
O-O|Чёрные также уводят короля: теперь ответ в центре не обязан сопровождаться защитой от шахов по e.|Black also shelters the king, making central counterplay easier without checks on the e-file.
c3|Белые подкрепляют d4 и освобождают c2, но конь b1 больше не может выйти на c3.|White reinforces d4, at the cost of taking c3 away from the b1 knight.
Bg4|Слон связывает коня f3 с ферзём d1; давление на центр становится неприятнее.|The bishop pins f3 to the d1 queen, increasing pressure on the centre.
Nbd2|Конь поддерживает f3 и e4, обходя занятое пешкой поле c3.|The knight supports f3 and e4, using d2 because c3 is occupied by a pawn.
Re8|Ладья занимает открытую линию e: белым нельзя считать своё развитие законченным.|The rook takes the open e-file; White cannot assume development is complete.
Nc4|Конь с темпом нападает на слона d6 и ищет размен защитника f4.|The knight attacks the d6 bishop with tempo and seeks to exchange f4's defender.
Bc7|Слон сохраняет защиту f4 с новой диагонали. Пешка не вернулась автоматически: белым нужен конкретный план давления.|The bishop keeps protecting f4 from a new diagonal. The pawn has not returned automatically; White needs a concrete pressure plan.
`),
];
const declined = [
  ...start,
  ...steps(`
Bc5|Чёрные отказываются от пешки и развивают слона на диагональ g1. Рокировать теперь можно лишь после проверки этой диагонали.|Black declines the pawn and develops along the diagonal to g1. White must check that diagonal before castling.
Nf3|Конь прикрывает h4 и усиливает e5, не раскрывая короля новым пешечным ходом.|The knight covers h4 and adds pressure to e5 without another weakening pawn move.
d6|Чёрные поддерживают e5 и готовят развитие слона c8; немедленной открытой линии f здесь нет.|Black supports e5 and prepares the c8 bishop; there is no immediate open f-file here.
Nc3|Конь защищает e4, позволяя белым выбирать между d3 и более острым d4.|The knight protects e4, giving White a choice between d3 and the sharper d4.
Nf6|Чёрные атакуют e4 и приближают рокировку, не пытаясь выиграть f4 любой ценой.|Black attacks e4 and approaches castling instead of trying to win f4 at any cost.
Bc4|Белые нацеливают слона на f7, пока центр ещё закрыт пешками e4 и e5.|White aims at f7 while the e4 and e5 pawns still close the centre.
Nc6|Конь усиливает e5; чёрные готовят рокировку, сохраняя симметрию в центре.|The knight reinforces e5 while Black prepares castling and maintains the central tension.
d3|Пешка надёжно поддерживает e4, но делает план более спокойным, чем немедленное d4.|The pawn securely supports e4, choosing a quieter plan than an immediate d4.
O-O|Чёрные заканчивают подготовку короля и могут отвечать на фланговые ходы центральной игрой.|Black completes king safety and can answer flank moves with central play.
Na4|Конь атакует слона c5: белые добиваются пары слонов, тратя на это темпы.|The knight attacks c5; White spends tempi to obtain the bishop pair.
Bb6|Слон отступает по той же диагонали и оставляет белым решение о размене.|The bishop retreats on the same diagonal, leaving White to decide about the exchange.
Nxb6|Белые отдают активного коня за слона; это позиционный выбор, а не выигрыш фигуры.|White trades the active knight for a bishop; this is a positional choice, not a piece win.
axb6|Пешка a открывает ладье линию a. Сдвоенные пешки не означают, что чёрные беззащитны.|The a-pawn opens the a-file for the rook. Doubled pawns do not make Black defenceless.
O-O|Опасный слон c5 разменян, и белые завершают безопасность короля перед дальнейшим продвижением центра.|With the dangerous c5 bishop exchanged, White secures the king before advancing the centre.
`),
];
const falkbeer = [
  ...start,
  ...steps(`
d5|Контргамбит Фалькбеера: чёрные вскрывают центр, пока белый король стоит на ослабленной линии.|The Falkbeer Countergambit opens the centre while White's king sits behind a weakened pawn cover.
exd5|Белые принимают центральную пешку; пешка f4 пока остаётся на доске.|White accepts the central pawn; the f4 pawn remains on the board.
e4|Чёрные выигрывают пространство и отнимают f3 у коня: развитие белых меняет привычный маршрут.|Black gains space and denies f3 to the knight, changing White's usual development route.
d3|Белые немедленно подрывают e4, иначе чёрная пешка будет стеснять фигуры.|White immediately challenges e4 before it can cramp the pieces.
Nf6|Конь защищает e4, поэтому центральное взятие требует расчёта ответного взятия.|The knight defends e4, so a central capture must account for the recapture.
dxe4|Белые раскрывают центр и принимают размен пешек, не гонясь за сохранением каждой лишней пешки.|White opens the centre and accepts pawn exchanges rather than trying to keep every extra pawn.
Nxe4|Конь занимает центральный форпост с темпом развития; белым предстоит его оспорить.|The knight develops to a central outpost which White will need to challenge.
Nf3|Поле f3 освободилось от контроля пешки e4, и белые наконец выводят коня к рокировке.|The e4 pawn no longer controls f3, so White develops the knight towards castling.
Bc5|Слон усиливает давление на f2 и диагональ к g1. Белым нужно закончить развитие, а не считать пешки.|The bishop increases pressure on f2 and the diagonal to g1. White needs development rather than pawn counting.
`),
];
const g5 = [
  ...accepted,
  ...steps(`
g5|Чёрные удерживают f4 пешкой, но ослабляют королевский фланг. Нападение …g4 становится реальной угрозой коню.|Black holds f4 with a pawn but weakens the kingside; ...g4 becomes a real threat to the knight.
h4|Белые подрывают цепь g5–f4 у основания. Это требует готовности отступить конём после …g4.|White attacks the base of the g5–f4 chain, requiring a plan for the knight after ...g4.
g4|Чёрные выигрывают темп нападением на f3, зато поле f4 теряет пешечную защиту.|Black gains a tempo against f3, but f4 loses its pawn protection.
Ne5|Конь уходит с нападением на g4 и занимает центр; жертва коня на f3 здесь не обязательна.|The knight escapes while attacking g4 and occupying the centre; sacrificing it on f3 is not compulsory.
Nf6|Чёрные развивают защитника h5 и d5, вместо дальнейшего продвижения пешек перед королём.|Black develops a defender of h5 and d5 instead of pushing more pawns in front of the king.
Bc4|Слон создаёт давление на f7; вместе с конём e5 он заставляет чёрных учитывать конкретные угрозы.|The bishop pressures f7; together with Ne5 it makes Black consider concrete threats.
d5|Чёрные перекрывают диагональ слона ударом в центре, избегая пассивной защиты f7.|Black blocks the bishop's diagonal with a central counterstrike rather than passively defending f7.
exd5|Белые убирают блокирующую пешку, но больше не поддерживают коня e5 пешкой e4.|White removes the blocking pawn but no longer supports Ne5 with the e4 pawn.
Bd6|Слон атакует коня e5 и развивает королевский фланг: атака белых требует новых доказательств.|The bishop attacks Ne5 and develops the kingside; White's attack requires fresh calculation.
d4|Белые поддерживают коня e5 и открывают слона c1 для давления на f4.|White supports Ne5 and opens the c1 bishop towards f4.
Nh5|Конь защищает f4 и освобождает f6. Чёрные держат материал, но пока не завершили безопасность короля.|The knight protects f4 and vacates f6. Black holds material but has not yet secured the king.
Nc3|Второй конь усиливает центр; прежде чем искать жертву, белые включают ещё одну фигуру в игру.|The second knight strengthens the centre; White brings another piece into play before seeking a sacrifice.
`),
];
export const kings: CourseSeed = {
  id: "kings",
  title: text("Королевский гамбит", "King’s Gambit"),
  overview: text(
    "Пешка f покупает центр и темпы, но убирает защиту короля. Различай принятие, отказ и центральный контрудар.",
    "The f-pawn buys central play and time at the cost of king safety. Distinguish acceptance, refusal and central counterplay.",
  ),
  main: {
    intro: text(
      "В защите …d5 обе стороны развиваются с угрозами; пешку f4 не обязательно возвращать немедленно.",
      "Against ...d5 both sides develop with threats; recovering f4 immediately is not compulsory.",
    ),
    steps: main,
  },
  replies: [
    {
      intro: text(
        "Отказ …Bc5: сначала безопасность короля",
        "Declining with ...Bc5: king safety first",
      ),
      steps: declined,
    },
    {
      intro: text(
        "Контргамбит …d5: подрыв e4",
        "The ...d5 countergambit: challenging e4",
      ),
      steps: falkbeer,
    },
    {
      intro: text(
        "Принятие с …g5: удар по пешечной цепи",
        "Acceptance with ...g5: attacking the pawn chain",
      ),
      steps: g5,
    },
  ],
  planStart: 16,
  plan: text(
    "Пешка c3 поддерживает d4, но коню b1 приходится искать d2. Чёрные готовы давить по e; сравни планы, а не только материал.",
    "The c3 pawn supports d4 but sends the b1 knight towards d2. Black can use the e-file; compare plans as well as material.",
  ),
  episodes: episodeLibrary.kings,
  sources: sourceFor("King’s Gambit"),
};
