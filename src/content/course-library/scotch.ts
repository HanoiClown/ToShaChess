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
d4|Белые сразу оспаривают e5 и открывают центр, пока обе стороны развили по коню.|White immediately challenges e5 and opens the centre while each side has developed one knight.
exd4|Чёрные принимают размен и оставляют пешку на d4 как объект будущего возврата.|Black accepts the exchange, leaving a pawn on d4 for White to recover later.
Bc4|Белые откладывают Nxd4 ради давления на f7; в этом отличие гамбита от обычной шотландской партии.|White postpones Nxd4 to pressure f7; this distinguishes the gambit from the normal Scotch Game.
`),
];
const main = [
  ...start,
  ...steps(`
Nf6|Конь атакует e4, вынуждая белых решать центральную задачу одновременно с развитием.|The knight attacks e4, forcing White to solve a central problem while developing.
O-O|Белые допускают центральное напряжение, но включают ладью f1 и убирают короля с e1.|White keeps the central tension but activates Rf1 and removes the king from e1.
Bc5|Слон защищает d4 и нацеливается на f2; чёрные не снимают напряжения взятием e4.|The bishop protects d4 and eyes f2; Black preserves the tension instead of taking e4.
e5|Пешка атакует коня f6 и открывает линию e для ладьи. Нужно заранее увидеть ответ …d5.|The pawn attacks Nf6 and opens the e-file for a rook. White must anticipate ...d5.
d5|Контрудар нападает на слона c4: обе атакованные фигуры не обязаны немедленно отступать.|The counterstrike attacks Bc4; neither attacked piece is forced to retreat immediately.
exf6|Белые берут коня и получают опасную пешку f6, но слон c4 также будет взят.|White takes the knight and gains a dangerous f6 pawn, but Bc4 can also be captured.
dxc4|Чёрные возвращают фигуру пешкой d и открывают ферзю линию d.|Black restores material with the d-pawn and opens the d-file for the queen.
Re1+|Ладья входит на открытую линию с шахом, связывая продолжение с королём e8.|The rook enters the open file with check, tying the continuation to the e8 king.
Be6|Слон перекрывает шах, но оказывается связанным по линии e.|The bishop blocks the check but becomes pinned on the e-file.
Ng5|Конь усиливает давление на e6; пешка f6 мешает защите чёрного короля.|The knight increases pressure on e6 while f6 obstructs the black king's defence.
Qd5|Ферзь защищает e6 и сам создаёт угрозы; у белых нет права считать атаку односторонней.|The queen defends e6 and creates threats of its own; White cannot treat the attack as one-sided.
Nc3|Белые развивают коня с нападением на ферзя, включая резерв в атаку.|White develops the knight while attacking the queen, bringing reserves into the attack.
Qf5|Ферзь сохраняет защиту e6 и уходит из-под темпа коня c3.|The queen keeps defending e6 while escaping Nc3's attack.
Nce4|Конь c3 входит на e4 и усиливает давление на c5 и f6. Дальнейшая игра требует расчёта, а не обещает мат.|The c3 knight reaches e4, adding pressure on c5 and f6. The continuation requires calculation, not a promise of mate.
`),
];
const bc5 = [
  ...start,
  ...steps(`
Bc5|Чёрные сразу защищают d4 слоном, поэтому белые готовят подрыв c3.|Black immediately protects d4 with the bishop, inviting White's c3 break.
c3|Белые предлагают ещё пешку ради освобождения d4 и быстрого развития коня b1.|White offers another pawn to clear d4 and accelerate Nb1's development.
Nf6|Чёрные выбирают давление на e4 вместо жадного взятия c3.|Black chooses pressure on e4 instead of greedily taking c3.
cxd4|Белые возвращают пешку и получают центр d4–e4.|White recovers the pawn and obtains a d4–e4 centre.
Bb4+|Слон выходит с шахом, заставляя белых учитывать связки перед развитием коня.|The bishop checks, making White consider pins before developing the knight.
Bd2|Белые предлагают размен шахующего слона и сохраняют пешечную структуру.|White offers to exchange the checking bishop while preserving the pawn structure.
Bxd2+|Чёрные меняют активного слона, чтобы сохранить темп шаха.|Black exchanges the active bishop while maintaining the check.
Nbxd2|Конь развивается с возвратом фигуры и поддерживает e4.|The knight develops by recapturing and supports e4.
d5|Чёрные своевременно атакуют центр и слона c4, пока белые не укрепились.|Black challenges the centre and Bc4 before White consolidates.
exd5|Белые снимают напряжение, но уступают чёрному коню поле d5.|White releases the tension but gives Black's knight access to d5.
Nxd5|Конь возвращает пешку и блокирует линию d; позиция уже не похожа на охоту за f7.|The knight recaptures and blocks the d-file; this is no longer a simple attack on f7.
O-O|Белые заканчивают развитие короля перед борьбой за открытые линии.|White secures the king before contesting the open files.
O-O|Чёрные также рокируют: исход дебюта определяется активностью, а не материальным перевесом.|Black also castles; the opening is decided by activity rather than material imbalance.
`),
];
const early = [
  ...start,
  ...steps(`
Nf6|Чёрные атакуют e4 и вызывают пешечное решение белых.|Black attacks e4 and asks White to choose a pawn plan.
e5|Белые гонят коня до рокировки; безопасность e1 теперь особенно важна.|White attacks the knight before castling, making e1's safety especially important.
d5|Чёрные нападают на слона c4 вместо пассивного отхода коня.|Black attacks Bc4 rather than retreating the knight passively.
Bb5|Слон связывает коня c6 с королём и сохраняет фигуру, оставляя напряжение на f6.|The bishop pins Nc6 to the king and preserves itself while the tension on f6 remains.
Ne4|Конь выходит на центральный форпост, откуда давит на c3 и f2.|The knight moves to a central outpost, pressuring c3 and f2.
Nxd4|Белые возвращают гамбитную пешку и размещают коня в центре.|White recovers the gambit pawn and centralises the knight.
Bd7|Чёрные снимают связку c6 и готовят безопасность короля.|Black unpins Nc6 and prepares king safety.
Bxc6|Белые меняют слона, чтобы испортить пешечную структуру и убрать защитника центра.|White trades the bishop to damage the pawn structure and remove a central defender.
bxc6|Чёрные получают сдвоенные пешки, но открывают линию b и поддерживают d5.|Black accepts doubled pawns but opens the b-file and supports d5.
O-O|Белые убирают короля с центральных линий до дальнейших разменов.|White removes the king from the central files before further exchanges.
Bc5|Слон давит на коня d4 и на f2, показывая активную компенсацию за структуру.|The bishop pressures Nd4 and f2, showing activity in return for the pawn structure.
`),
];
const quiet = [
  ...start,
  ...steps(`
Be7|Чёрные выбирают скромное развитие и быструю рокировку; белые могут вернуть пешку без форсированной атаки.|Black chooses modest development and quick castling; White can recover the pawn without a forced attack.
Nxd4|Конь возвращает пешку и открывает дорогу ферзевому коню к c3.|The knight recovers the pawn and leaves c3 available to the queenside knight.
Nf6|Чёрные атакуют e4, не позволяя белым бесплатно усилить центр.|Black attacks e4, preventing White from strengthening the centre for free.
Nc3|Конь защищает e4 и поддерживает d5, пока король готовится к рокировке.|The knight protects e4 and supports d5 while White prepares castling.
O-O|Чёрный король в безопасности; белым также пора завершить развитие, а не искать несуществующую жертву.|Black's king is safe; White should finish development rather than seek an unsupported sacrifice.
`),
];
export const scotch: CourseSeed = {
  id: "scotch",
  title: text("Шотландский гамбит", "Scotch Gambit"),
  overview: text(
    "Белые откладывают возврат d4 ради Bc4. Смотри не только f7, но и встречный удар …d5.",
    "White delays recovering d4 in favour of Bc4. Watch ...d5 as well as f7.",
  ),
  main: {
    intro: text(
      "Атака Макса Ланге: два нападения, промежуточные шахи и точный порядок взятий.",
      "The Max Lange Attack: two attacks, intermediate checks and an exact capture order.",
    ),
    steps: main,
  },
  replies: [
    {
      intro: text("Защита пешки слоном …Bc5", "Defending the pawn with ...Bc5"),
      steps: bc5,
    },
    {
      intro: text("Раннее e5 и ответ …d5", "Early e5 and the ...d5 reply"),
      steps: early,
    },
    {
      intro: text(
        "Спокойное …Be7: верни пешку",
        "Quiet ...Be7: recover the pawn",
      ),
      steps: quiet,
    },
  ],
  planStart: 14,
  plan: text(
    "Пешка f6 стесняет короля, но чёрные могут защищаться развитием и встречными угрозами. Включай ладью и оба коня.",
    "The f6 pawn cramps the king, but Black can defend through development and counterthreats. Bring the rook and both knights into play.",
  ),
  episodes: episodeLibrary.scotch,
  sources: sourceFor("Scotch Gambit"),
};
