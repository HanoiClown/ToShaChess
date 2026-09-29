import {
  steps,
  text,
  openGames,
  sourceFor,
  type CourseSeed,
} from "./authoring";
import { episodeLibrary } from "./tactical-episodes";
const start = [
  ...openGames,
  ...steps(`
d4|Белые вскрывают центр, чтобы развитый конь f3 участвовал в борьбе за e5.|White opens the centre so the developed f3 knight can join the fight for e5.
exd4|Чёрные принимают размен и получают пешку на d4, которую можно атаковать ходом c3.|Black exchanges centrally and gains a d4 pawn that can be challenged with c3.
c3|Белые предлагают пешку ради темпа развития Nb1 и открытых линий; немедленное Nxd4 было более спокойным выбором.|White offers a pawn for Nb1's development and open files; immediate Nxd4 was the quieter choice.
`),
];
const accepted = [
  ...start,
  ...steps(`
dxc3|Чёрные принимают пешку; белые должны вернуть её фигурой и использовать открывшиеся диагонали.|Black accepts the pawn; White should recapture with a piece and use the opened diagonals.
Nxc3|Конь выходит с возвратом пешки и давит на d5; белые остались без пешки d, но опережают развитие.|The knight develops by recapturing and controls d5; White has lost the d-pawn but leads in development.
`),
];
const main = [
  ...accepted,
  ...steps(`
Bb4|Слон связывает коня c3 с королём, уменьшая его поддержку e4.|The bishop pins Nc3 to the king, reducing its support of e4.
Bc4|Белые создают давление на f7 и готовят рокировку вместо немедленного снятия связки.|White pressures f7 and prepares castling instead of immediately breaking the pin.
d6|Чёрные открывают слона c8 и укрепляют e5; белая атака не является форсированной.|Black opens Bc8 and supports e5; White's attack is not forced.
O-O|Рокировка снимает абсолютную связку c3: теперь конь может участвовать в центральных ударах.|Castling removes the absolute pin on c3, allowing the knight to join central tactics.
Bxc3|Чёрные меняют слона на коня и заставляют белых выбрать пешечную структуру.|Black exchanges the bishop for the knight and forces a pawn-structure decision.
bxc3|Пешка b открывает линию b, поддерживает d4 и сохраняет ферзя на d1.|The b-pawn opens the b-file, supports d4 and leaves the queen on d1.
Nf6|Конь атакует e4 и готовит рокировку; чёрные нагоняют развитие.|The knight attacks e4 and prepares castling as Black catches up in development.
Re1|Ладья поддерживает e4 и возможное e5, используя отсутствие собственной пешки на линии d лишь косвенно.|The rook supports e4 and a possible e5, concentrating on the central pawn rather than chasing material.
O-O|Чёрные прячут короля, поэтому дальнейший прорыв e5 уже не выигрывает темп шахом.|Black shelters the king, so a later e5 break no longer gains a checking tempo.
Ba3|Слон занимает диагональ a3–f8 и ограничивает ладью f8, создавая конкретную цель атаки.|The bishop takes the a3–f8 diagonal and restricts Rf8, creating a concrete target.
Re8|Ладья уходит с диагонали слона и противостоит e4. Белые должны готовить e5, а не толкать пешку автоматически.|The rook leaves the bishop's diagonal and faces e4. White should prepare e5 rather than push automatically.
`),
];
const declined = [
  ...start,
  ...steps(`
d5|Чёрные отказываются от дополнительной пешки ради удара по e4 и освобождения фигур.|Black declines the extra pawn to challenge e4 and release the pieces.
exd5|Белые убирают центральную пешку, открывая ферзю чёрных поле d5.|White removes the central pawn, giving Black's queen access to d5.
Qxd5|Ферзь возвращает пешку; белые могут развиваться с будущим нападением Nc3.|The queen recaptures; White can develop while preparing Nc3 with tempo.
cxd4|Белые восстанавливают материал и получают пешку d4 как опору центра.|White restores material and gains a d4 pawn as a central anchor.
Bg4|Слон связывает f3 с ферзём: чёрные используют время до Nc3.|The bishop pins Nf3 to the queen, using the time before Nc3.
Be2|Белые снимают неприятное давление на коня и готовят рокировку.|White reduces the pressure on the knight and prepares castling.
O-O-O|Чёрные уводят короля и сразу ставят ладью напротив d4.|Black shelters the king and immediately places a rook opposite d4.
Nc3|Конь развивается с нападением на ферзя d5; темп оправдывает выбор развития вместо пешечных ходов.|The knight develops while attacking Qd5; the tempo rewards development rather than pawn moves.
Bb4|Чёрные связывают коня c3 с королём и временно сохраняют ферзя на d5.|Black pins Nc3 to the king and temporarily keeps Qd5 in place.
O-O|Белые снимают абсолютную связку рокировкой; ферзю d5 теперь снова нужно учитывать коня c3.|White removes the absolute pin by castling; Qd5 must now respect Nc3 again.
`),
];
const double = [
  ...start,
  ...steps(`
dxc3|Чёрные принимают первую пешку и допускают выбор между Nxc3 и ещё одной жертвой.|Black accepts the first pawn, allowing a choice between Nxc3 and another sacrifice.
Bc4|Белые откладывают возврат c3 ради f7; пешка b2 теперь тоже под ударом.|White postpones recapturing c3 to target f7; b2 is now also attacked.
cxb2|Чёрные берут вторую пешку, но помогают слону c1 выйти на большую диагональ.|Black takes a second pawn but helps Bc1 reach the long diagonal.
Bxb2|Слон развивается с взятием, нацеливаясь на g7. Две активные диагонали должны компенсировать две пешки.|The bishop develops by capturing and eyes g7. Two active diagonals must compensate for two pawns.
d6|Чёрные открывают слона c8, не пытаясь немедленно удержать все центральные поля.|Black opens Bc8 rather than trying to hold every central square immediately.
O-O|Белые ставят короля в безопасность, чтобы ладья могла участвовать в атаке.|White secures the king so the rook can join the attack.
Nf6|Чёрные атакуют e4 и готовят рокировку, возвращая развитие в центр внимания.|Black attacks e4 and prepares castling, making development the key issue.
Nc3|Конь укрепляет e4 и d5; без включения этой фигуры двух пешек было бы слишком много.|The knight strengthens e4 and d5; without this piece's activity the two-pawn cost would be too high.
Be7|Слон освобождает королю рокировку, не позволяя белым атаковать неподвижного короля бесплатно.|The bishop prepares castling, denying White a free attack on an immobile king.
`),
];
const push = [
  ...start,
  ...steps(`
d3|Чёрные возвращают пешку вперёд, чтобы не дать коню b1 развиться со взятием на c3.|Black returns the pawn by advancing it, denying Nb1 a developing capture on c3.
Bxd3|Слон забирает пешку и занимает активную диагональ, но конь b1 ещё не развит.|The bishop recaptures on an active diagonal, but Nb1 remains undeveloped.
Nf6|Конь атакует e4; белые должны учитывать центральную угрозу перед рокировкой.|The knight attacks e4; White must account for that threat before castling.
O-O|Белые допускают напряжение на e4, рассчитывая на активность ладьи по линии e.|White keeps the tension on e4, counting on rook activity along the e-file.
d6|Чёрные укрепляют e5 и открывают слона c8: партия переходит к позиционной борьбе.|Black supports e5 and opens Bc8; the game turns towards positional play.
`),
];
export const goring: CourseSeed = {
  id: "goring",
  title: text("Гамбит Геринга", "Göring Gambit"),
  overview: text(
    "Конь f3 уже развит, поэтому c3 предлагает темп второму коню. Выбери заранее: одна пешка за Nxc3 или две за Bc4 и Bxb2.",
    "Nf3 is already developed, so c3 offers a tempo to the other knight. Choose between one pawn for Nxc3 and two for Bc4 and Bxb2.",
  ),
  main: {
    intro: text(
      "Одна пешка за активность: связка c3 и освобождение рокировкой.",
      "One pawn for activity: the c3 pin and release through castling.",
    ),
    steps: main,
  },
  replies: [
    {
      intro: text("Центральный отказ …d5", "Central refusal with ...d5"),
      steps: declined,
    },
    {
      intro: text("Принятие двух пешек", "Accepting two pawns"),
      steps: double,
    },
    {
      intro: text("Возврат пешки ходом …d3", "Returning the pawn with ...d3"),
      steps: push,
    },
  ],
  planStart: 14,
  plan: text(
    "После bxc3 структура изменилась: линия b открыта, а e4 остаётся целью. Согласуй Re1 и Ba3 с подготовкой e5.",
    "After bxc3 the b-file is open and e4 remains a target. Coordinate Re1 and Ba3 with preparation for e5.",
  ),
  episodes: episodeLibrary.goring,
  sources: sourceFor("Göring Gambit"),
};
