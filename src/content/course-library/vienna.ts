import {
  steps,
  text,
  openGames,
  sourceFor,
  type CourseSeed,
} from "./authoring";
import { episodeLibrary } from "./tactical-episodes";
const base = [
  ...openGames.slice(0, 2),
  ...steps(`
Nc3|Конь поддерживает e4 и d5, оставляя пешке f свободный путь. В отличие от Nf3 он пока не контролирует h4.|The knight supports e4 and d5 while leaving the f-pawn free. Unlike Nf3, it does not yet control h4.
Nf6|Чёрные атакуют e4 и допускают f4 с центральным напряжением.|Black attacks e4 and allows f4 with central tension.
f4|Белые предлагают пешку, но ещё не закрыли королю диагональ h4–e1. Ответ …d5 нужно знать заранее.|White offers a pawn without yet blocking the h4–e1 diagonal. The ...d5 response must be anticipated.
`),
];
const central = [
  ...base,
  ...steps(`
d5|Чёрные отвечают в центре, а не принимают f4. Теперь e4 и e5 одновременно под давлением.|Black answers in the centre instead of accepting f4. Both e4 and e5 are now under pressure.
fxe5|Белые берут e5, нападая на коня f6, но разрешают чёрным взять e4.|White captures e5 and attacks Nf6, but allows Black to take e4.
Nxe4|Конь уходит из-под удара со взятием и занимает центральный форпост.|The knight escapes with a capture and occupies a central outpost.
`),
];
const main = [
  ...central,
  ...steps(`
Nf3|Белые развивают коня к e5 и h4 вместо немедленной охоты за конём e4.|White develops towards e5 and h4 rather than immediately chasing Ne4.
Be7|Чёрные готовят рокировку, чтобы центральные размены не сопровождались опасными шахами.|Black prepares castling so central exchanges do not come with dangerous checks.
d4|Пешка поддерживает e5 и создаёт центр; слон c1 получает выход.|The pawn supports e5 and builds the centre while releasing Bc1.
O-O|Чёрный король уходит с e8; белым тоже нужно завершить развитие, а не только охранять e5.|Black removes the king from e8; White also needs development rather than merely guarding e5.
Bd3|Слон нападает на коня e4 и готовит рокировку, совмещая развитие с конкретной угрозой.|The bishop attacks Ne4 and prepares castling, combining development with a concrete threat.
Nxc3|Чёрные меняют центрального коня и повреждают структуру белых, избегая его дальнейшего преследования.|Black exchanges the central knight and damages White's structure rather than letting it be chased.
bxc3|Белые открывают линию b и поддерживают d4 новой пешкой c3.|White opens the b-file and reinforces d4 with the new c3 pawn.
c5|Чёрные атакуют основание центра d4: пространства белых недостаточно без защиты пешек.|Black attacks the base of the centre on d4; White's space requires pawn support.
O-O|Белые заканчивают безопасность короля, прежде чем отвечать на центральное напряжение.|White completes king safety before resolving the central tension.
Nc6|Конь усиливает давление на d4 и развивает последнюю коневую фигуру.|The knight develops while adding pressure on d4.
Qe1|Ферзь освобождает d1 и поддерживает перевод на королевский фланг; центр нельзя забывать.|The queen frees d1 and prepares a kingside transfer without removing the need to watch the centre.
cxd4|Чёрные меняют пешку c на центральную пешку d4, открывая линии для фигур.|Black exchanges the c-pawn for d4, opening lines for the pieces.
cxd4|Пешка c3 возвращается в центр. У белых пара d4–e5; план строится на её поддержке и активности слонов.|The c3 pawn returns to the centre. White's d4–e5 pair needs support and active bishops.
`),
];
const accepted = [
  ...base,
  ...steps(`
exf4|Чёрные принимают пешку и покидают e5. Белые могут использовать это поле для нападения на коня.|Black accepts the pawn and vacates e5, allowing White to use that square to attack the knight.
e5|Пешка гонит коня f6 и закрывает центр; чёрным нельзя автоматически прыгать на e4, забыв коня c3.|The pawn drives Nf6 away and closes the centre; Black must not automatically jump to e4 and forget Nc3.
Ng8|Конь возвращается, сохраняя фигуру. Чёрные уступают темпы, но не обязаны попадаться в ловушку.|The knight retreats safely. Black loses time but need not fall for a trap.
Nf3|Белые развивают коня и контролируют h4, прежде чем продолжать пешечную атаку.|White develops and controls h4 before continuing the pawn attack.
d6|Чёрные подрывают e5, пытаясь вернуть центральные поля своим фигурам.|Black challenges e5 to regain central squares for the pieces.
d4|Белые поддерживают e5 и открывают слона c1 к пешке f4.|White supports e5 and opens Bc1 towards f4.
dxe5|Чёрные меняют блокирующую пешку, освобождая своим фигурам пространство.|Black exchanges the cramping pawn and frees space for the pieces.
Nxe5|Конь централизуется со взятием, сохраняя белым преимущество развития.|The knight centralises by recapturing, preserving White's development lead.
Nf6|Чёрные повторно выводят коня, теперь не опасаясь продвижения пешки e5.|Black redevelops the knight, now without fearing an e5 pawn advance.
Bxf4|Слон наконец возвращает гамбитную пешку и развивается; материальная цель достигнута через активность.|The bishop finally recovers the gambit pawn while developing; activity has achieved the material goal.
`),
];
const d3 = [
  ...central,
  ...steps(`
d3|Белые сразу атакуют коня e4, выбирая более сдержанный центр вместо d4.|White immediately attacks Ne4, choosing a more restrained centre than d4.
Nxc3|Конь меняется на c3, повреждая пешки вместо пассивного отступления.|The knight exchanges on c3 and damages the pawns rather than retreating passively.
bxc3|Белые возвращают коня, открывая линию b; пешка c3 может поддержать будущий d4.|White recaptures and opens the b-file; c3 can support a later d4.
d4|Чёрные закрывают центр и стесняют белых, пользуясь более медленным d3.|Black closes the centre and cramps White, exploiting the slower d3 setup.
Nf3|Конь укрепляет e5 и готовит рокировку; борьба становится манёвренной.|The knight reinforces e5 and prepares castling as the struggle becomes positional.
Nc6|Чёрные давят на e5 и развивают коня до выбора королевского укрытия.|Black pressures e5 and develops before choosing the king's shelter.
Be2|Белые освобождают королю рокировку и не выставляют слона под темп пешки d4.|White prepares castling without placing the bishop where d4 can gain a tempo.
`),
];
const bc5 = [
  ...openGames.slice(0, 2),
  ...steps(`
Nc3|Конь поддерживает e4, оставляя возможность f4.|The knight supports e4 while preserving f4 as an option.
Bc5|Слон сразу направлен на g1; это другой порядок ходов, чем …Nf6.|The bishop immediately points at g1; this differs from the ...Nf6 move order.
f4|Белые предлагают пешку, но слон c5 делает королевский фланг особенно чувствительным.|White offers the pawn, but Bc5 makes kingside safety especially sensitive.
d6|Чёрные поддерживают e5 и сохраняют давление слона, не принимая жертву.|Black supports e5 and keeps the bishop's pressure without accepting the sacrifice.
Nf3|Конь закрывает доступ ферзю на h4 и готовит безопасное развитие слона f1.|The knight controls h4 and prepares safe development of Bf1.
Nc6|Чёрные добавляют защиту e5; немедленная атака белых не является форсированной.|Black adds another defender to e5; White has no forced immediate attack.
Bc4|Белые развивают слона к f7; план схож с отказанным королевским гамбитом, но конь уже на c3.|White develops towards f7; the plan resembles a declined King's Gambit with Nc3 already played.
`),
];
export const vienna: CourseSeed = {
  id: "vienna",
  title: text("Венский гамбит", "Vienna Gambit"),
  overview: text(
    "Nc3 поддерживает центр, f4 добавляет остроту. Против …d5 нельзя повторять план e5 из принятого варианта.",
    "Nc3 supports the centre and f4 adds tension. Against ...d5, do not repeat the e5 plan from the accepted line.",
  ),
  main: {
    intro: text(
      "Точный центральный ответ …d5 и борьба за d4–e5.",
      "The precise central ...d5 response and the struggle over d4–e5.",
    ),
    steps: main,
  },
  replies: [
    {
      intro: text(
        "Принятие …exf4 и отступление коня",
        "Acceptance with ...exf4 and the knight retreat",
      ),
      steps: accepted,
    },
    {
      intro: text("Сдержанное d3 против …d5", "Restrained d3 against ...d5"),
      steps: d3,
    },
    { intro: text("Порядок со слоном c5", "The Bc5 move order"), steps: bc5 },
  ],
  planStart: 14,
  plan: text(
    "После bxc3 белые используют открытую линию b, но сначала отвечают на давление …c5 против d4.",
    "After bxc3 White can use the b-file, but must first address ...c5 against d4.",
  ),
  episodes: episodeLibrary.vienna,
  sources: sourceFor("Vienna Gambit"),
};
