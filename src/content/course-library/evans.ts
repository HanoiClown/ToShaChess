import {
  steps,
  text,
  openGames,
  sourceFor,
  type CourseSeed,
} from "./authoring";
import { episodeLibrary } from "./tactical-episodes";
const italian = [
  ...openGames,
  ...steps(`
Bc4|Слон направлен на f7; пока пешка e5 стоит в центре, белым нужен способ ускорить d4.|The bishop eyes f7; with e5 holding the centre, White needs a way to accelerate d4.
Bc5|Чёрные также занимают активную диагональ. Именно положение этого слона делает b4 ходом с темпом.|Black takes an active diagonal too. This bishop placement is what makes b4 a move with tempo.
b4|Пешка предлагает себя слону: белые хотят выиграть время для c3 и d4, а не просто открыть линию b.|The pawn offers itself to the bishop; White wants time for c3 and d4, not merely an open b-file.
`),
];
const accepted = [
  ...italian,
  ...steps(`
Bxb4|Слон принимает пешку и отходит от f7. Белые должны использовать потерянное чёрными время.|The bishop accepts the pawn and leaves the f7 diagonal. White must use the time Black has spent.
c3|Пешка нападает на слона и поддерживает d4. Без последующего центра жертва b4 теряет смысл.|The pawn attacks the bishop and supports d4. Without the central follow-up, b4 loses its point.
Ba5|Слон сохраняет диагональ к e1, поэтому будущий ход d4 нужно связывать с безопасностью короля.|The bishop keeps the diagonal towards e1, so d4 must be linked to king safety.
d4|Белые занимают центр с нападением на e5 и открывают слона c1.|White occupies the centre, attacks e5 and opens the c1 bishop.
`),
];
const main = [
  ...accepted,
  ...steps(`
exd4|Чёрные разменивают опору центра и оставляют белым выбор между возвратом пешки и рокировкой.|Black removes a central pawn and leaves White a choice between recapturing and castling.
O-O|Белые сначала прячут короля, чтобы связка по диагонали a5–e1 не мешала дальнейшей игре.|White shelters the king first so the a5–e1 diagonal cannot pin the central play.
d6|Чёрные открывают слона c8 и укрепляют центр; это подготовка развития, а не удержание всех лишних пешек.|Black opens the c8 bishop and supports the centre rather than trying to keep every extra pawn.
cxd4|Пешка c возвращает d4 и создаёт пару d4–e4. Компенсация за b4 — пространство и активность.|The c-pawn recaptures on d4, creating a d4–e4 pair. Space and activity compensate for b4.
Bb6|Слон уходит с края и снова направлен на d4 и f2, ограничивая свободу центра.|The bishop returns from the rim and eyes d4 and f2, restraining the centre.
h3|Белые заранее исключают …Bg4 со связкой коня f3, чтобы сохранить его защиту d4.|White prevents ...Bg4 pinning Nf3, preserving the knight's support of d4.
Na5|Конь нападает на активного слона c4; чёрные стараются уменьшить давление на f7.|The knight attacks the active c4 bishop, seeking to reduce pressure on f7.
Bd3|Слон сохраняется и поддерживает e4. Белые не обязаны менять его на крайнего коня.|The bishop retreats while supporting e4; White need not exchange it for the rim knight.
Ne7|Конь развивается, не закрывая слона b6, и освобождает королю рокировку.|The knight develops without blocking Bb6 and prepares castling.
Nc3|Конь усиливает d5 и e4; белые вводят последнюю лёгкую фигуру ферзевого фланга, кроме слона c1.|The knight reinforces d5 and e4, leaving only the c1 bishop undeveloped among White's minor pieces.
O-O|Оба короля укрыты. Белым нужно развить слона c1 и подготовить продвижение центра; атаки по одной памяти уже нет.|Both kings are sheltered. White should develop Bc1 and prepare the central advance; an attack cannot run on memory alone.
`),
];
const declined = [
  ...italian,
  ...steps(`
Bb6|Чёрные отказываются от пешки и сохраняют давление на f2. Белые пока ничего не пожертвовали.|Black declines the pawn and keeps pressure on f2. White has sacrificed nothing yet.
a4|Белые пользуются пространством и готовят a5, чтобы стеснить слона b6.|White uses the extra space and prepares a5 to restrict Bb6.
a6|Чёрные дают слону путь на a7; теперь a5 не ловит его автоматически.|Black creates a retreat to a7, so a5 does not automatically trap the bishop.
Nc3|Конь укрепляет e4 и d5. После отказа от гамбита развитие важнее немедленного c3.|The knight reinforces e4 and d5. After the gambit is declined, development matters more than an automatic c3.
Nf6|Чёрные атакуют e4 и готовят рокировку, используя время пешечных ходов белых.|Black attacks e4 and prepares castling, making use of White's pawn tempi.
d3|Белые защищают e4 и открывают слона c1; центр будет вскрываться после подготовки.|White protects e4 and opens Bc1; opening the centre can wait for preparation.
d6|Чёрные поддерживают e5 и готовят развитие ферзевого слона.|Black supports e5 and prepares the queenside bishop.
O-O|Король белых готов к будущему вскрытию центра, ладья f1 может поддержать игру по f.|White secures the king before the centre opens, with Rf1 ready for kingside play.
O-O|Чёрные завершают безопасность короля; позиция требует манёвров, а не возврата несуществующей жертвы.|Black completes king safety; the position needs manoeuvring rather than recovering a pawn never sacrificed.
`),
];
const be7 = [
  ...italian,
  ...steps(`
Bxb4|Приняв пешку, чёрные допускают c3 с темпом.|Accepting the pawn allows c3 with tempo.
c3|Белые вытесняют слона и готовят пару пешек в центре.|White drives the bishop away and prepares the central pawn pair.
Be7|Слон возвращается ближе к королю и не создаёт связку с a5; белые могут сразу занимать d4.|The bishop returns towards the king without an a5 pin, allowing White to occupy d4 immediately.
d4|Белые используют полученный темп для полного центра d4–e4.|White uses the gained tempo for the full d4–e4 centre.
Na5|Чёрные атакуют слона c4, чтобы обменять одну из атакующих фигур.|Black attacks Bc4, aiming to exchange an attacking piece.
Be2|Белые сохраняют слона и оставляют d4 под защитой ферзя и коня f3.|White keeps the bishop and leaves d4 supported by the queen and f3 knight.
exd4|Чёрные снимают напряжение в центре; пешка c3 готова вернуть d4.|Black releases the central tension; c3 is ready to recapture on d4.
cxd4|Белые восстанавливают центральную пару и открывают коню b1 поле c3.|White restores the central pair and makes c3 available to Nb1.
`),
];
const d6 = [
  ...accepted,
  ...steps(`
d6|Чёрные удерживают e5, развивая слона c8. Белым нужно усилить давление, а не автоматически брать e5.|Black holds e5 and opens Bc8. White should increase pressure rather than automatically capture e5.
Qb3|Ферзь вместе со слоном c4 направлен на f7 и заставляет чёрных учитывать двойное давление.|The queen joins Bc4 against f7, forcing Black to consider the combined pressure.
Qd7|Ферзь поддерживает f7 и освобождает возможность длинной рокировки; развитие коня g8 ещё не закончено.|The queen supports f7 and makes queenside castling possible, though Ng8 remains undeveloped.
dxe5|Белые вскрывают центр, пока чёрный король ещё не выбрал укрытие.|White opens the centre before the black king has found shelter.
Bb6|Слон покидает a5 и сохраняет диагональ к f2; чёрные готовы вернуть часть материала.|The bishop leaves a5 and retains the diagonal to f2; Black is ready to return some material.
exd6|Белые продвигают пешку с разменом d6, разбивая центральную пешечную защиту.|White exchanges the d6 pawn, disrupting Black's central pawn cover.
cxd6|Чёрные возвращают пешку и сохраняют связь центра, но линия c открывается.|Black recaptures and keeps a central pawn structure, while the c-file opens.
O-O|Белые заканчивают безопасность короля прежде, чем переводить ферзя на новые цели.|White secures the king before moving the queen towards fresh targets.
`),
];
export const evans: CourseSeed = {
  id: "evans",
  title: text("Гамбит Эванса", "Evans Gambit"),
  overview: text(
    "Жертва b4 отвлекает слона и даёт c3 с темпом. Компенсация требует центра и развития, а не надежды на ловушку.",
    "The b4 sacrifice diverts the bishop and gains c3 with tempo. Compensation requires a centre and development, not hope for a trap.",
  ),
  main: {
    intro: text(
      "Принятие с …Ba5: центр при безопасном короле.",
      "Acceptance with ...Ba5: central play with a safe king.",
    ),
    steps: main,
  },
  replies: [
    {
      intro: text(
        "Отказ …Bb6: игра без жертвы",
        "Declining with ...Bb6: no pawn sacrifice",
      ),
      steps: declined,
    },
    {
      intro: text("Возврат слона на e7", "Returning the bishop to e7"),
      steps: be7,
    },
    {
      intro: text(
        "Удержание центра ходом …d6",
        "Holding the centre with ...d6",
      ),
      steps: d6,
    },
  ],
  planStart: 16,
  plan: text(
    "Пешки d4–e4 дают пространство, но требуют поддержки. h3 ограничивает …Bg4; затем важны Nc3 и развитие слона c1.",
    "The d4–e4 pawns give space but need support. h3 restrains ...Bg4; Nc3 and development of Bc1 follow.",
  ),
  episodes: episodeLibrary.evans,
  sources: sourceFor("Evans Gambit"),
};
