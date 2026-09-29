import { steps, text, sourceFor, type CourseSeed } from "./authoring";
import { episodeLibrary } from "./tactical-episodes";
const start = steps(`
e4|Белые занимают центр и открывают слона f1, готовясь к быстрому развитию.|White takes central space and opens Bf1, preparing rapid development.
c5|Сицилианская защита оспаривает d4 с фланга, сохраняя собственную пешку e для будущей структуры.|The Sicilian challenges d4 from the flank, keeping the e-pawn for a later central structure.
d4|Белые сразу предлагают размен центральной пешки, чтобы вскрыть линии.|White immediately offers a central pawn exchange to open lines.
cxd4|Пешка c убирает d4 и оставляет белым выбор между возвратом ферзём и гамбитом.|The c-pawn removes d4, leaving White a choice between a queen recapture and a gambit.
c3|Белые предлагают пешку c, чтобы развить коня b1 со взятием и открыть линии c и d.|White offers the c-pawn to develop Nb1 with a capture and open the c- and d-files.
`);
const accepted = [
  ...start,
  ...steps(`
dxc3|Чёрные принимают пешку и дают коню b1 темп развития.|Black accepts the pawn and grants Nb1 a developing tempo.
Nxc3|Конь выходит в центр; белые получают развитие за пешку, но должны поддерживать инициативу.|The knight develops centrally; White gains development for a pawn but must sustain the initiative.
Nc6|Чёрные контролируют d4 и готовят естественное развитие без лишних пешечных ходов.|Black controls d4 and prepares natural development without extra pawn moves.
Nf3|Конь поддерживает e5 и d4, помогая дальнейшему нажиму на d6.|The knight supports e5 and d4, helping future pressure on d6.
d6|Чёрные закрывают диагональ слона c8, но удерживают e5 и создают устойчивый центр.|Black restricts Bc8 but controls e5 and builds a solid centre.
Bc4|Слон направлен на f7; в сочетании с Rd1 он будет усиливать давление на d6.|The bishop eyes f7 and can combine with Rd1 to increase pressure on d6.
e6|Чёрные ограничивают диагональ слона и дают своему слону f8 выход.|Black restricts Bc4's diagonal and releases Bf8.
`),
];
const main = [
  ...accepted,
  ...steps(`
O-O|Белые подключают ладью и убирают короля с открывающегося центра.|White activates the rook and removes the king from the opening centre.
Nf6|Чёрные атакуют e4 и готовят рокировку, заставляя белых учитывать собственные слабости.|Black attacks e4 and prepares castling, making White account for its own weaknesses.
Qe2|Ферзь защищает e4 и освобождает d1 для ладьи — ключевая связка фигур Морры.|The queen protects e4 and clears d1 for the rook, a key Morra coordination pattern.
Be7|Чёрные заканчивают подготовку рокировки; давление белых нужно наращивать без промедления.|Black completes castling preparation; White should build pressure without delay.
Rd1|Ладья встаёт напротив d6 и ферзя d8. Связки по линии d могут оправдать тактический удар.|The rook faces d6 and Qd8; pins along the d-file may justify a tactical strike.
O-O|Король чёрных уходит из центра. Одна линия d ещё не даёт белым форсированного выигрыша.|Black's king leaves the centre. The d-file alone does not give White a forced win.
Bf4|Слон добавляет нападение на d6, согласуя действие с ладьёй d1.|The bishop adds pressure on d6, coordinating with Rd1.
e5|Чёрные нападают на слона и закрывают диагональ к d6 ценой ослабления d5.|Black attacks the bishop and blocks its diagonal to d6, at the cost of weakening d5.
Be3|Слон отступает на активную диагональ. Белые сохраняют фигуру, а не жертвуют её только ради красивой атаки.|The bishop retreats to an active diagonal. White preserves it rather than sacrificing merely for appearance.
Be6|Чёрные оспаривают слона c4 и завершают развитие. Белым нужно выбирать давление на d6 или игру на d5.|Black challenges Bc4 and completes development. White must choose between pressure on d6 and play on d5.
`),
];
const nf6 = [
  ...start,
  ...steps(`
Nf6|Чёрные отказываются брать c3 и атакуют e4, переводя игру к структурам Алапина.|Black declines c3 and attacks e4, steering towards Alapin structures.
e5|Белые выигрывают пространство с нападением на коня, но пешка e5 становится объектом подрыва.|White gains space while attacking the knight, but e5 becomes a target for a pawn break.
Nd5|Конь отступает на центральное поле, сохраняя контроль c3 и e3; позднее …d6 поможет оспорить центр белых.|The knight retreats centrally while controlling c3 and e3; a later ...d6 helps challenge White’s centre.
Nf3|Белые укрепляют центр и готовят возврат пешки d4.|White reinforces the centre and prepares to recover d4.
Nc6|Чёрные давят на e5 и развивают ферзевого коня до выбора пешечной структуры.|Black pressures e5 and develops the queenside knight before choosing the pawn structure.
cxd4|Белые восстанавливают материальное равенство и строят центр d4–e5.|White restores material equality and builds a d4–e5 centre.
d6|Чёрные атакуют передовую пешку e5: пространство белых требует поддержки.|Black challenges the advanced e5 pawn; White's space needs support.
Bc4|Слон нападает на коня d5 и готовит рокировку, не защищая центр пассивно.|The bishop attacks Nd5 and prepares castling rather than defending the centre passively.
Nb6|Конь нападает на слона c4; чёрные выигрывают темп, чтобы вскрыть e5.|The knight attacks Bc4, gaining time to open e5.
Bb5|Слон связывает коня c6 и сохраняет активность вместо простого отхода домой.|The bishop pins Nc6 and keeps its activity rather than simply retreating home.
`),
];
const d3 = [
  ...start,
  ...steps(`
d3|Чёрные возвращают пешку, лишая коня b1 привычного развивающего взятия на c3.|Black returns the pawn, denying Nb1 its usual developing capture on c3.
Bxd3|Слон возвращает материал; теперь у белых обычное развитие, а не гамбитная гонка за темпами.|The bishop restores material; White now has normal development rather than a gambit race for tempi.
Nc6|Конь контролирует d4 и поддерживает возможное …e5.|The knight controls d4 and supports a possible ...e5.
Nf3|Белые усиливают e5 и готовят рокировку, сохраняя выбор пешечной структуры.|White reinforces e5 and prepares castling while retaining a choice of pawn structure.
d6|Чёрные держат e5 и открывают слона c8.|Black controls e5 and opens Bc8.
O-O|Белый король в безопасности до дальнейшего расширения в центре.|White secures the king before further central expansion.
Nf6|Конь атакует e4; белые должны совместить пространство с защитой центра.|The knight attacks e4; White must combine space with central defence.
c4|Белые захватывают d5 пешкой c, выбирая зажим вместо открытой линии c.|White controls d5 with the c-pawn, choosing a bind rather than an open c-file.
`),
];
const earlye5 = [
  ...start,
  ...steps(`
dxc3|Чёрные принимают жертву и позволяют Nxc3.|Black accepts the sacrifice and allows Nxc3.
Nxc3|Конь развивается к d5, которое станет важным после …e5.|The knight develops towards d5, which becomes important after ...e5.
e5|Чёрные занимают центр, но оставляют поле d5 без пешечной защиты.|Black takes central space but leaves d5 without pawn protection.
Nf3|Белые нападают на e5 и готовят использовать слабость d5 фигурами.|White attacks e5 and prepares to use d5 with pieces.
Nc6|Конь защищает e5; белые не могут просто взять центральную пешку.|The knight protects e5; White cannot simply take the central pawn.
Bc4|Слон нацелен на f7; давление на d5 можно усиливать после рокировки.|The bishop targets f7; White can increase pressure on d5 after castling.
Nf6|Чёрные контратакуют e4, не позволяя белым беспрепятственно наращивать инициативу.|Black counterattacks e4, preventing White from building the initiative unopposed.
`),
];
export const morra: CourseSeed = {
  id: "morra",
  title: text("Гамбит Смита — Морры", "Smith–Morra Gambit"),
  overview: text(
    "Пешка покупает открытые линии c и d. Связка Qe2–Rd1 создаёт давление на d6, но отказ от жертвы меняет весь план.",
    "A pawn buys the open c- and d-files. Qe2–Rd1 pressures d6, but declining the sacrifice changes the plan.",
  ),
  main: {
    intro: text(
      "Принятая Морра: давление на d6 и точная защита.",
      "The accepted Morra: pressure on d6 and accurate defence.",
    ),
    steps: main,
  },
  replies: [
    {
      intro: text(
        "Отказ …Nf6: центр Алапина",
        "Declining with ...Nf6: an Alapin centre",
      ),
      steps: nf6,
    },
    {
      intro: text("Возврат пешки …d3", "Returning the pawn with ...d3"),
      steps: d3,
    },
    {
      intro: text(
        "Раннее …e5 и слабость d5",
        "Early ...e5 and the d5 weakness",
      ),
      steps: earlye5,
    },
  ],
  planStart: 16,
  plan: text(
    "Ладья d1 и слон f4 давят на d6. На …e5 слон отходит, а поле d5 становится новой целью.",
    "Rd1 and Bf4 pressure d6. Against ...e5 the bishop retreats and d5 becomes a new target.",
  ),
  episodes: episodeLibrary.morra,
  sources: sourceFor("Smith–Morra Gambit"),
};
