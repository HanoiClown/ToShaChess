import { steps, text, sourceFor, type CourseSeed } from "./authoring";
import { episodeLibrary } from "./tactical-episodes";
const start = steps(`
e4|Белые занимают центр и освобождают слона f1.|White occupies the centre and releases Bf1.
c6|Чёрные готовят …d5 с поддержкой пешки c; слон c8 пока не заперт.|Black prepares ...d5 with c-pawn support while keeping Bc8 free.
d4|Белые строят полный центр и предлагают чёрным сразу определить напряжение.|White builds a full centre and asks Black to define the tension.
d5|Чёрные атакуют e4 опираясь на c6; это основа Каро–Канн, а не жертва пешки.|Black attacks e4 with c6 support; this is the foundation of the Caro–Kann, not a pawn sacrifice.
`);
const main = [
  ...start,
  ...steps(`
Nc3|Конь защищает e4 и допускает размен центральной пешки без потери времени на ферзя.|The knight protects e4 and allows a central exchange without bringing the queen out.
dxe4|Чёрные снимают напряжение и освобождают d5 для контроля фигурами.|Black releases the tension and leaves d5 for piece control.
Nxe4|Конь занимает центр и освобождает c3; чёрным нужно развиваться с воздействием на него.|The knight centralises and frees c3; Black should develop while influencing it.
Bf5|Слон выходит за пешечную цепь до …e6 и нападает на коня e4.|The bishop leaves the pawn chain before ...e6 and attacks Ne4.
Ng3|Конь отходит с нападением на слона; белые пытаются выиграть темпы его преследованием.|The knight retreats while attacking the bishop; White tries to gain tempi by chasing it.
Bg6|Слон сохраняет активную диагональ и не меняется на коня без необходимости.|The bishop keeps its active diagonal rather than exchanging for a knight unnecessarily.
h4|Белые угрожают h5 с новым нападением на слона. Чёрным нужен путь отхода.|White threatens h5, attacking the bishop again. Black needs a retreat square.
h6|Пешка освобождает h7 для слона; это конкретная профилактика, а не случайный фланговый ход.|The pawn frees h7 for the bishop: concrete prevention rather than a random flank move.
Nf3|Белые развиваются, поддерживая d4 и e5, прежде чем продолжать погоню за слоном.|White develops to support d4 and e5 before continuing the bishop chase.
Nd7|Конь готовит …Ngf6 и возврат на f6 после размена, сохраняя пешечную структуру.|The knight prepares ...Ngf6 and a recapture on f6, preserving the pawn structure.
h5|Белые вытесняют слона, но продвигают пешку далеко от короля.|White drives the bishop back but advances the pawn far from the king.
Bh7|Слон использует заранее подготовленное поле и остаётся вне цепи e6–d5.|The bishop uses the prepared retreat and stays outside the future pawn chain.
Bd3|Белые предлагают размен активного слона h7, уменьшая защиту чёрных полей.|White offers to exchange Bh7, reducing Black's dark-square control.
Bxd3|Чёрные принимают размен, избавляясь от необходимости дальше защищать слона.|Black accepts the exchange and removes the need to keep defending that bishop.
Qxd3|Ферзь возвращает фигуру и поддерживает длинную рокировку белых.|The queen recaptures and prepares White's queenside castling.
e6|Теперь пешка укрепляет центр, не запирая слона c8: он уже разменян.|The pawn now strengthens the centre without trapping Bc8, which has already been exchanged.
Bd2|Белые освобождают c1 для рокировки и связывают ладьи будущим развитием.|White clears c1 for castling and prepares to connect the rooks.
Ngf6|Чёрные развивают королевского коня, сохраняя поддержку второго коня d7.|Black develops the kingside knight with Nd7 available to support it.
O-O-O|Белые выбирают длинную рокировку; будущая пешечная атака должна учитывать центральный ответ …c5.|White castles long; a future pawn attack must account for the central ...c5 reply.
Be7|Чёрные завершают подготовку короткой рокировки. Дальнейший план — безопасность короля и удар по d4.|Black completes preparation for kingside castling. The next plan is king safety and pressure on d4.
`),
];
const advance = [
  ...start,
  ...steps(`
e5|Белые закрывают центр и ограничивают коня g8; чёрные должны подрывать основание d4.|White closes the centre and restricts Ng8; Black should undermine the base on d4.
Bf5|Слон выходит до …e6, сохраняя активность за будущей пешечной цепью.|The bishop develops before ...e6, retaining activity outside the future chain.
Nf3|Конь поддерживает d4 и e5, укрепляя пространство белых.|The knight supports d4 and e5, reinforcing White's space.
e6|Чёрные укрепляют d5 и открывают слона f8, уже решив проблему c8.|Black supports d5 and opens Bf8, having already solved Bc8's problem.
Be2|Белые готовят рокировку и не тратят время на охоту за слоном f5.|White prepares castling rather than spending time chasing Bf5.
c5|Чёрные атакуют d4: закрытый центр требует пешечного подрыва, а не пассивного ожидания.|Black attacks d4; a closed centre requires a pawn break rather than passive waiting.
O-O|Белые уводят короля до вскрытия центра.|White shelters the king before the centre opens.
Nc6|Конь добавляет давление на d4 и развивается за пешкой c5.|The knight adds pressure to d4 and develops behind the c5 pawn.
Be3|Слон укрепляет d4, отвечая на двойное давление фигур и пешки c5.|The bishop reinforces d4 against the combined pressure of the knight and c5 pawn.
cxd4|Чёрные вскрывают центр, чтобы разменять одну из опор пространства белых.|Black opens the centre to exchange one of White's space-gaining pawns.
`),
];
const exchange = [
  ...start,
  ...steps(`
exd5|Белые снимают напряжение; пешка e исчезает, и планы будут строиться вокруг линии e и пешки d4.|White releases the tension; the e-pawn disappears, shifting plans towards the e-file and d4.
cxd5|Чёрные возвращают пешку c, получая симметричный материальный баланс и полуоткрытую линию c.|Black recaptures with the c-pawn, restoring material balance and gaining the half-open c-file.
Bd3|Слон занимает активную диагональ и ограничивает будущий выход слона c8 на f5.|The bishop takes an active diagonal and discourages Bc8 from developing to f5.
Nc6|Чёрные атакуют d4 и развивают коня, пользуясь свободным полем c6.|Black attacks d4 and develops the knight to the newly available c6 square.
c3|Белые укрепляют d4, но закрывают c3 своему коню b1.|White reinforces d4 but blocks c3 for Nb1.
Nf6|Конь контролирует e4 и готовит рокировку; чёрные не торопятся закрывать слона ходом …e6.|The knight controls e4 and prepares castling; Black does not rush to shut in Bc8 with ...e6.
Bf4|Белые выводят второго слона за пешечную цепь и контролируют e5.|White develops the other bishop outside the pawn chain and controls e5.
Bg4|Чёрные выводят своего слона с давлением на ферзя через коня f3, когда тот появится.|Black develops the bishop to create pressure along the diagonal to the queen once Nf3 is played.
`),
];
const panov = [
  ...start,
  ...steps(`
exd5|Белые меняют пешку e ради открытого центра.|White exchanges the e-pawn to open the centre.
cxd5|Чёрные получают пешку d5 и освобождают линию c.|Black obtains a d5 pawn and opens the c-file.
c4|Атака Панова немедленно подрывает d5; белые готовы принять изолированную пешку d ради активности.|The Panov Attack immediately challenges d5; White is willing to accept an isolated d-pawn for activity.
Nf6|Конь защищает d5 и развивает королевский фланг одновременно.|The knight protects d5 while developing the kingside.
Nc3|Белые увеличивают давление на d5, не снимая пешечного напряжения.|White adds pressure to d5 without resolving the pawn tension.
e6|Чёрные укрепляют d5 ценой закрытия слона c8; здесь прочность центра оправдывает этот выбор.|Black supports d5 at the cost of closing Bc8; here central solidity justifies the choice.
Nf3|Белые развиваются и готовят рокировку перед решением cxd5.|White develops and prepares castling before deciding on cxd5.
Bb4|Слон связывает коня c3 и уменьшает его давление на d5.|The bishop pins Nc3 and reduces its pressure on d5.
`),
];
export const caro: CourseSeed = {
  id: "caro",
  title: text("Защита Каро–Канн", "Caro–Kann Defence"),
  overview: text(
    "Курс за чёрных: c6 поддерживает d5. Развивай слона c8 до закрытия цепи там, где позиция позволяет; это защита, не гамбит.",
    "A course for Black: c6 supports d5. Develop Bc8 before closing the chain where the position permits; this is a defence, not a gambit.",
  ),
  main: {
    intro: text(
      "Классическая система: активный слон и подготовленные отступления.",
      "The Classical System: an active bishop and prepared retreats.",
    ),
    steps: main,
  },
  replies: [
    {
      intro: text(
        "Продвижение e5: подрыв d4",
        "The e5 Advance: undermining d4",
      ),
      steps: advance,
    },
    {
      intro: text(
        "Размен: другая пешечная структура",
        "The Exchange: a different pawn structure",
      ),
      steps: exchange,
    },
    {
      intro: text(
        "Атака Панова и изолированная пешка",
        "The Panov Attack and the isolated pawn",
      ),
      steps: panov,
    },
  ],
  planStart: 18,
  plan: text(
    "Слон c8 уже разменян, поэтому …e6 не запирает его. Заверши развитие и только затем выбирай центральный подрыв.",
    "Bc8 has already been exchanged, so ...e6 cannot trap it. Complete development before choosing a central break.",
  ),
  episodes: episodeLibrary.caro,
  sources: sourceFor("Caro–Kann Defence"),
};
