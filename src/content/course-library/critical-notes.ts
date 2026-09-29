import { text } from "./authoring";
export const criticalNotes: Record<
  string,
  Record<number, ReturnType<typeof text>>
> = {
  kings: {
    3: text(
      "Ослабляется не только пешечное прикрытие: уход f2 открывает диагональ к e1. Поэтому один и тот же шах …Qh4 имеет разный смысл до и после Nf3. Не выбирай гамбит ради обещанного мата: против точной защиты нужно долго поддерживать активность.",
      "The f-pawn move weakens more than pawn cover: it opens a diagonal to e1. Thus ...Qh4 has a different meaning before and after Nf3. Do not choose the gambit for a promised mate; accurate defence demands sustained activity.",
    ),
    6: text(
      "Чёрные не обязаны удерживать две центральные пешки. …d5 открывает слона c8 и заставляет белых решать задачи развития. Ответ exd5 ведёт к борьбе за d4 и f4, а не к простой атаке на застрявшего короля.",
      "Black need not retain both central pawns. ...d5 releases Bc8 and poses development problems. exd5 leads to a struggle over d4 and f4 rather than a simple attack on a stranded king.",
    ),
    14: text(
      "Слон d6 защищает f4 по диагонали d6–e5–f4. Когда конь придёт на c4, чёрные смогут сохранить эту функцию ходом …Bc7. Не путай нападение на защитника с гарантированным возвратом пешки.",
      "Bd6 protects f4 along d6–e5–f4. When Nc4 attacks it, ...Bc7 can preserve that function. Attacking a defender does not guarantee recovery of the pawn.",
    ),
  },
  evans: {
    7: text(
      "После принятия b4 чёрный слон тратит два хода на Bxb4 и отход после c3. Эти темпы белые обращают в d4 и рокировку. Если затем играть медленно или менять активные фигуры без причины, материальная цена жертвы останется, а компенсация исчезнет.",
      "After accepting b4, the bishop spends two moves on Bxb4 and retreating after c3. White converts those tempi into d4 and castling. Slow play or unjustified exchanges leave the material cost while removing the compensation.",
    ),
    13: text(
      "Пешка c3 прикрывает короля e1 от слона a5. Поэтому немедленное cxd4 в этой позиции вообще не является легальным ходом: оно открывает шах. Рокировка меняет геометрию позиции и только затем позволяет пешке c уйти с диагонали.",
      "The c3 pawn shields Ke1 from Ba5. Immediate cxd4 is actually illegal here because it exposes check. Castling changes the geometry and only then allows the c-pawn to leave the diagonal.",
    ),
    20: text(
      "После …Na5 и Bd3 чёрный конь стоит на краю, но уже заставил активного слона отступить. …Ne7 готовит рокировку и сохраняет возможность …Ng6. Оценивать развитие нужно по задачам фигур, а не только по правилу «конь на краю плох».",
      "After ...Na5 and Bd3 the knight is on the rim, but has already forced the active bishop back. ...Ne7 prepares castling and retains ...Ng6. Assess pieces by their jobs, not only by the slogan that rim knights are bad.",
    ),
  },
  scotch: {
    12: text(
      "После e5 атакован конь f6, после …d5 — слон c4. Ход exf6 не выигрывает фигуру просто так: …dxc4 восстанавливает материальный баланс. Главное следствие серии — пешка f6 и открытая линия e, а не число фигур после первого взятия.",
      "e5 attacks Nf6 and ...d5 attacks Bc4. exf6 does not win a piece outright because ...dxc4 restores material. The important result is the f6 pawn and open e-file, not the piece count after the first capture.",
    ),
    15: text(
      "Re1+ превращает открытую линию в темп. После …Be6 слон связан с королём, но чёрные могут добавить защиту ферзём и затем рокировать. Связка — повод считать конкретно, а не разрешение пожертвовать любую фигуру.",
      "Re1+ turns the open file into a tempo. ...Be6 pins the bishop to the king, but Black can add queen protection and later castle. A pin is a reason to calculate, not permission to sacrifice any piece.",
    ),
    19: text(
      "Nc3 нападает на ферзя d5. Чёрные обязаны решить эту угрозу: обычная рокировка оставит ферзя под взятием. Сочетание развития с нападением объясняет, почему белые не торопятся возвращать пешку c4.",
      "Nc3 attacks Qd5. Black must address this threat: routine castling would leave the queen en prise. Developing with tempo explains why White is not rushing to recover c4.",
    ),
  },
  goring: {
    7: text(
      "В отличие от датского гамбита, к моменту c3 конь f3 уже развит, а у чёрных есть Nc6. Похожие жертвы не делают позиции одинаковыми: меняются контроль e4, возможности связки …Bb4 и доступные центральные удары.",
      "Unlike the Danish Gambit, Nf3 and ...Nc6 have already been played when c3 arrives. Similar sacrifices do not make positions identical: e4 control, the ...Bb4 pin and central breaks differ.",
    ),
    13: text(
      "До рокировки конь c3 абсолютно связан слоном b4. После O-O король больше не стоит за ним, и это ограничение исчезает. Поэтому проверка легальности и силы одного и того же хода коня зависит от положения короля.",
      "Before castling, Nc3 is absolutely pinned by Bb4. After O-O the king is no longer behind it and that restriction disappears. The legality and strength of the same knight move depend on king placement.",
    ),
    19: text(
      "Ba3 не выигрывает ладью f8 автоматически: чёрные могут уйти по восьмой горизонтали. Ценность хода — давление по диагонали и координация с e5, когда пешка d6 сдвинется или будет связана. Сначала проверь центральный ответ.",
      "Ba3 does not automatically win Rf8: Black can move along the eighth rank. Its value is diagonal pressure and coordination with e5 when d6 moves or becomes pinned. Check the central reply first.",
    ),
  },
  danish: {
    10: text(
      "…d5 возвращает одну из лишних пешек ради развития и перекрытия слона. Это практический ответ на гамбит: важнее убрать опасность, чем сохранить максимальный материальный перевес. Белым нельзя предполагать, что соперник будет держать обе пешки любой ценой.",
      "...d5 returns an extra pawn for development and to block the bishop. This is a practical answer to a gambit: removing danger matters more than keeping the maximum material lead. White cannot assume Black will cling to both pawns.",
    ),
    15: text(
      "Qxd8 выглядит как выигрыш ферзя, но …Bb4+ меняет очередь угроз. После Qd2 Bxd2+ Nxd2 оба ферзя исчезают. Всегда считай промежуточные шахи до конца, прежде чем объявлять комбинацию выигрышной.",
      "Qxd8 looks like a queen win, but ...Bb4+ changes the order of threats. After Qd2 Bxd2+ Nxd2 both queens are gone. Calculate intermediate checks to the end before calling a combination winning.",
    ),
    20: text(
      "Отсутствие ферзей не делает короля e1 автоматически безопасным. Ладья e8 получает темп давления на e4; Ngf3 и рокировка решают конкретные проблемы. Не продолжай жертвовать материал только потому, что дебют начинался гамбитом.",
      "The absence of queens does not automatically make Ke1 safe. Re8 gains pressure on e4; Ngf3 and castling address concrete problems. Do not keep sacrificing merely because the opening began as a gambit.",
    ),
  },
  vienna: {
    6: text(
      "Ответ …d5 принципиально отличается от …exf4: чёрные оставляют пешку e5 под ударом, зато атакуют e4. После fxe5 конь f6 может взять e4. В принятом варианте такого центрального взятия часто нет, и коню приходится отступать.",
      "...d5 differs fundamentally from ...exf4: Black leaves e5 attacked but challenges e4. After fxe5, Nf6 can capture e4. In the accepted line that central capture is often unavailable and the knight must retreat.",
    ),
    14: text(
      "Размен на c3 портит белым пешки, но даёт открытую линию b и опору d4. Чтобы использовать недостаток структуры, чёрные атакуют центр ходом …c5. Само наличие сдвоенных пешек не заменяет конкретного плана.",
      "Exchanging on c3 damages White’s pawns but opens the b-file and supports d4. Black uses ...c5 to attack the centre and exploit the structure. Doubled pawns alone are not a concrete plan.",
    ),
    21: text(
      "После cxd4 на доске пешки d4 и e5, а не d4 и e4. Пешка с f4 взяла на e5, а исходную пешку e4 забрал конь чёрных. Она ограничивает чёрных, но может стать целью …f6; внимательно отслеживай происхождение пешек.",
      "After cxd4 the central pawns stand on d4 and e5, not d4 and e4. The e5 structure arose from the earlier central captures. It cramps Black but can become a target for ...f6; track the pawns carefully.",
    ),
  },
  morra: {
    15: text(
      "Qe2 выполняет две задачи: защищает e4 и освобождает d1 для ладьи. Без защиты e4 чёрные могут выиграть темп взятием конём; без Rd1 давление на d6 останется только диагональным. Это координация, а не обязательная расстановка при любом ответе.",
      "Qe2 protects e4 and clears d1 for a rook. Without e4 support Black may gain a tempo through a knight capture; without Rd1 pressure on d6 remains only diagonal. This is coordination, not a compulsory setup against every reply.",
    ),
    17: text(
      "Пока ферзь чёрных на d8, пешка d6 стоит на линии ладьи d1. Продвижение …d5 может вскрыть ферзя и требует точного расчёта разменов. После рокировки геометрия короля меняется, но ферзь по-прежнему важен для тактики по линии d.",
      "While Qd8 remains on the file, d6 stands in front of Rd1. ...d5 may expose the queen and requires exact exchange calculation. Castling changes the king’s geometry but the queen remains relevant to d-file tactics.",
    ),
    20: text(
      "…e5 одновременно нападает на Bf4 и закрывает ему диагональ к d6. Белые могут исследовать тактическое Nxe5 или сохранить слона ходом Be3; спокойный фланговый ход не решает нападение. В учебной основной линии выбран понятный отход без обещания максимального перевеса.",
      "...e5 attacks Bf4 and closes its diagonal to d6. White can examine tactical Nxe5 or preserve the bishop with Be3; a quiet flank move does not address the attack. The study line chooses the clear retreat without claiming maximum advantage.",
    ),
  },
  caro: {
    8: text(
      "Выход Bf5 решает характерную проблему слона c8 до …e6. Но белые могут выиграть темпы Ng3 и h4–h5, поэтому активный слон нуждается в маршруте отступления. Выводить его «по правилу» без проверки угроз недостаточно.",
      "Bf5 solves the characteristic c8-bishop problem before ...e6. But White can gain tempi with Ng3 and h4–h5, so the active bishop needs a retreat route. Developing it by rule without checking threats is insufficient.",
    ),
    12: text(
      "…h6 освобождает h7, чтобы на h5 ответить …Bh7. Если просто развить Nf6, давление на слона может стать тактическим. Пешечный ход здесь связан с конкретной геометрией g6–h7, а не с общей привычкой делать форточку.",
      "...h6 clears h7 so h5 can be met by ...Bh7. Routine ...Nf6 may turn the bishop pressure into a tactical problem. The pawn move addresses the exact g6–h7 geometry rather than a general habit of making luft.",
    ),
    20: text(
      "Обычный совет «выводи слона c8 до …e6» не абсолютен: в варианте Панова прочность d5 может быть важнее. В этой классической линии вопрос уже решён — слон ушёл на f5, отступил и разменялся. Поэтому …e6 не запирает собственную фигуру.",
      "The usual advice to develop Bc8 before ...e6 is not absolute: in the Panov, d5 solidity may matter more. Here the bishop has already developed, retreated and exchanged, so ...e6 cannot trap it.",
    ),
  },
};
