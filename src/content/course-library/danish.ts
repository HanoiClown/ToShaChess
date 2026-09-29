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
d4|Белые сразу вскрывают центр, ещё не развив коня f3. Это ускоряет жертву, но оставляет короля в центре.|White opens the centre before developing Nf3, accelerating the sacrifice but leaving the king central.
exd4|Чёрные принимают центральную пешку и получают объект подрыва на d4.|Black accepts the central pawn, creating a target for c3.
c3|Белые предлагают вторую центральную пешку ради открытых диагоналей для слонов.|White offers another central pawn to open diagonals for the bishops.
`),
];
const accepted = [
  ...start,
  ...steps(`
dxc3|Чёрные принимают предложение; белые могут ограничить жертву ходом Nxc3.|Black accepts; White can limit the sacrifice by playing Nxc3.
Bc4|Белые выбирают давление на f7 вместо возврата c3, предлагая ещё и b2.|White chooses pressure on f7 instead of recapturing c3, also offering b2.
cxb2|Чёрные берут пешку b2, разрешая слону c1 развиться с темпом.|Black takes b2, allowing Bc1 to develop with tempo.
Bxb2|Оба слона направлены на королевский фланг; коням и королю ещё предстоит вступить в игру.|Both bishops point towards the kingside, but the knights and king still need attention.
`),
];
const main = [
  ...accepted,
  ...steps(`
d5|Чёрные возвращают пешку, чтобы перекрыть слона c4 и открыть свои фигуры. Удерживать материал любой ценой опаснее.|Black returns a pawn to block Bc4 and release the pieces; keeping material at any cost is more dangerous.
Bxd5|Белые берут пешку слоном и сохраняют давление на f7.|White captures with the bishop and maintains pressure on f7.
Nf6|Конь атакует слона d5 и развивает защиту короля, допуская сложный размен на f7.|The knight attacks Bd5 and develops the king's defence, allowing a complex exchange on f7.
Bxf7+|Шах отвлекает короля от ферзя d8, но это ещё не выигрыш ферзя: у чёрных есть промежуточный шах.|The check diverts the king from Qd8, but this does not yet win a queen: Black has an intermediate check.
Kxf7|Король принимает слона, открывая диагональ ферзю белых к d8.|The king accepts the bishop, leaving d8 exposed to White's queen.
Qxd8|Белые берут ферзя, но обязаны досчитать …Bb4+: материальный итог пока временный.|White takes the queen but must calculate ...Bb4+; the material count is only temporary.
Bb4+|Слон выходит с шахом, заставляя ферзя d8 вернуться на d2 для защиты короля.|The bishop checks, forcing Qd8 back to d2 to protect the king.
Qd2|Ферзь перекрывает шах; попытка просто сохранить лишнего ферзя не соответствует угрозе королю.|The queen blocks the check; trying merely to keep the extra queen ignores the king's danger.
Bxd2+|Чёрные возвращают ферзя с шахом: эффектная комбинация приводит к размену, а не победе белых.|Black recovers the queen with check; the striking combination leads to exchanges, not a White win.
Nxd2|Конь развивается со взятием слона; после форсированной серии нужно заново оценить материал и активность.|The knight develops by taking the bishop; after the forcing sequence, reassess material and activity.
Re8|Ладья занимает открытую линию и давит на e4, пользуясь центральным положением короля белых.|The rook occupies the open file and pressures e4 while White's king remains central.
Ngf3|Конь защищает e5 и готовит рокировку; королю белых пора покинуть линию e.|The knight controls e5 and prepares castling; White's king should leave the e-file.
Nc6|Чёрные завершают развитие коня с давлением на d4 и e5. Без ферзей план — координация фигур, а не автоматическая матовая атака.|Black develops the knight towards d4 and e5. Without queens, coordination matters more than an automatic mating attack.
`),
];
const single = [
  ...start,
  ...steps(`
dxc3|Чёрные принимают пешку; белые выбирают более умеренный размер жертвы.|Black accepts the pawn; White chooses a more modest sacrifice.
Nxc3|Конь выходит со взятием, сохраняя b2 и ограничивая материальный риск одной пешкой.|The knight develops by capturing, keeping b2 and limiting the material cost to one pawn.
Nc6|Чёрные защищают e5 и контролируют d4, не тратя время на охоту за второй пешкой.|Black protects e5 and controls d4 without spending time chasing another pawn.
Nf3|Белые давят на e5 и готовят безопасность короля.|White pressures e5 and prepares king safety.
d6|Чёрные подкрепляют e5 и выпускают слона c8.|Black reinforces e5 and releases Bc8.
Bc4|Слон направлен на f7; белые пользуются преимуществом развития, не обещая немедленной тактики.|The bishop eyes f7; White uses the development lead without assuming immediate tactics.
Nf6|Чёрные атакуют e4 и готовят рокировку, оспаривая компенсацию белых.|Black attacks e4 and prepares castling, challenging White's compensation.
O-O|Белый король в безопасности, ладья f1 готова поддержать центр.|White's king is safe and Rf1 is ready to support the centre.
Be7|Чёрные завершают подготовку рокировки; белым нужно использовать активность до её исчезновения.|Black completes castling preparation; White should use the activity before it disappears.
`),
];
const decline = [
  ...start,
  ...steps(`
d5|Чёрные не берут c3, а сразу оспаривают центр и открывают слона c8.|Black declines c3 and immediately challenges the centre while opening Bc8.
exd5|Белые разменивают e-пешку и приглашают ферзя чёрных в центр.|White exchanges the e-pawn and invites Black's queen into the centre.
Qxd5|Ферзь возвращает пешку, но может попасть под развивающий ход Nc3.|The queen recaptures but may face the developing Nc3.
cxd4|Белые возвращают вторую пешку и получают d4 как опору развития.|White recovers the other pawn and obtains d4 as a developmental anchor.
Nc6|Чёрные усиливают d4 и e5, развивая фигуру вместо защиты ферзя пешками.|Black increases control of d4 and e5 through development rather than pawn moves to protect the queen.
Nf3|Конь поддерживает d4 и готовит рокировку; гамбитная жертва уже отменена.|The knight supports d4 and prepares castling; the gambit sacrifice has been cancelled.
Bg4|Слон связывает f3 с ферзём d1, усиливая давление на d4.|The bishop pins Nf3 to Qd1 and adds pressure to d4.
Be2|Слон снимает неприятную связку и освобождает королю рокировку.|The bishop breaks the troublesome pin and prepares castling.
`),
];
const push = [
  ...start,
  ...steps(`
d3|Чёрные возвращают пешку вперёд и не дают слону c1 открыться со взятием b2.|Black returns the pawn by advancing it, denying Bc1 a developing capture on b2.
Bxd3|Слон выходит на центральную диагональ; белые не получили двух слонов на b2 и c4.|The bishop develops centrally; White has not obtained bishops on b2 and c4.
Nc6|Чёрные держат e5 и готовят развитие королевского фланга.|Black holds e5 and prepares kingside development.
Nf3|Белые нападают на e5 и приближают рокировку в более спокойной структуре.|White attacks e5 and approaches castling in a quieter structure.
Nf6|Чёрные отвечают нападением на e4, заставляя белых учитывать центр.|Black responds by attacking e4, making White attend to the centre.
`),
];
export const danish: CourseSeed = {
  id: "danish",
  title: text("Датский гамбит", "Danish Gambit"),
  overview: text(
    "Два слона получают открытые диагонали за пешки. Точная защита часто возвращает материал и переводит игру в равный эндшпиль.",
    "Two bishops gain open diagonals in return for pawns. Accurate defence often returns material and heads towards a balanced endgame.",
  ),
  main: {
    intro: text(
      "Защита …d5: досчитай промежуточный шах до конца.",
      "The ...d5 defence: calculate the intermediate check to the end.",
    ),
    steps: main,
  },
  replies: [
    { intro: text("Одна пешка: Nxc3", "One pawn: Nxc3"), steps: single },
    {
      intro: text("Отказ с центральным …d5", "Declining through central ...d5"),
      steps: decline,
    },
    {
      intro: text("Возврат пешки …d3", "Returning the pawn with ...d3"),
      steps: push,
    },
  ],
  planStart: 18,
  plan: text(
    "Ферзей уже нет, но король e1 стоит на линии ладьи e8. Развитие Ngf3 и рокировка важнее поисков новой жертвы.",
    "The queens are gone, but Ke1 faces Re8. Ngf3 and castling matter more than finding another sacrifice.",
  ),
  episodes: episodeLibrary.danish,
  sources: sourceFor("Danish Gambit"),
};
