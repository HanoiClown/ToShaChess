/** Authored position-specific text. C=context, M=mistake, P=punishment,
 * D=defence, R=reply to defence, K=risk; E/F extend a forcing demonstration. */
export const episodeText = `
@kings/king-diagonal|Вторая брешь перед королём|A second gap in front of the king
C|После …exf4 король e1 открыт по диагонали h4–e1; конь g1 ещё не вышел.|After ...exf4, Ke1 is exposed on h4–e1 and Ng1 is still undeveloped.
M|g4 тратит темп и лишает белых возможности перекрыть шах …Qh4+ ходом g3; пешка g4 не атакует f4.|g4 spends a tempo and removes the option of blocking ...Qh4+ with g3; the g4 pawn does not attack f4.
P|…Qh4+ вынуждает защищать короля вместо развития; после ухода на e2 центральное …d5 вскрывает новые линии.|...Qh4+ forces king defence instead of development; after Ke2, ...d5 opens more lines.
D|Bc4 развивает фигуру и сохраняет пешку g2, оставляя королю ответ на шах.|Bc4 develops a piece and preserves g2, keeping a response to the check.
R|…Qh4+ всё ещё возможно, но без g4 белые могут ответить Kf1; потеря рокировки не равна потере фигуры.|...Qh4+ remains possible, but without g4 White can answer Kf1; losing castling is not losing a piece.
K|Это наказание конкретного g4, а не опровержение всего королевского гамбита; шах сам по себе ещё не мат.|This punishes the specific g4 move, not the entire King's Gambit; the check itself is not mate.
@kings/h4-queen|Шах на защищённое поле|Checking on a defended square
C|Конь уже стоит на f3 и контролирует h4; диагональ ферзя открыта, но поле назначения защищено.|Nf3 already controls h4; the queen's diagonal is open but the destination is defended.
M|…Qh4+ механически повторяет идею шаха из варианта без Nf3 и оставляет ферзя под ударом.|...Qh4+ mechanically repeats the check from a line without Nf3 and leaves the queen attacked.
P|Nxh4 забирает ферзя конём. Знак шаха не запрещает ответить взятием шахующей фигуры.|Nxh4 takes the queen. Being in check does not prevent capturing the checking piece.
D|…g5 поддерживает f4 и создаёт реальную угрозу …g4 против коня, вместо необоснованного шаха.|...g5 supports f4 and creates a real ...g4 threat against the knight instead of an unsound check.
R|d4 строит центр и открывает слона c1; белые отвечают развитием, а не получают ферзя бесплатно.|d4 builds the centre and opens Bc1; White responds through development rather than winning a free queen.
K|При наличии коня f3 этот шах теряет ферзя; после ухода коня нужно оценивать позицию заново.|With Nf3 present the check loses the queen; after the knight moves the position must be reassessed.
@kings/ignore-g4|Сначала спаси атакованного коня|Save the attacked knight first
C|Пешка g4 нападает на коня f3; белые ещё не рокировали и не получили достаточной атаки.|The g4 pawn attacks Nf3; White has not castled and has not established enough attacking play.
M|Bc4 развивает слона, но оставляет коня под взятием: красивое давление на f7 не заменяет расчёта.|Bc4 develops the bishop but leaves the knight en prise; attractive f7 pressure is not a substitute for calculation.
P|…gxf3 выигрывает коня. Qxf3 вернёт только пешку, а не утраченную фигуру.|...gxf3 wins the knight. Qxf3 recovers only a pawn, not the lost piece.
D|Ne5 уходит из-под нападения с контролем g4 и f7, сохраняя все фигуры.|Ne5 escapes while controlling g4 and f7, keeping all the pieces.
R|…Nf6 развивает защитника и оспаривает e4; после точной защиты атака не выигрывает сама собой.|...Nf6 develops a defender and challenges e4; accurate defence stops the attack from winning by itself.
K|Существуют отдельные рассчитанные жертвы коня в этом дебюте; данная позиция и порядок ходов не дают права жертвовать автоматически.|Calculated knight sacrifices exist in this opening; this position and move order do not justify an automatic sacrifice.
@kings/declined-greed|Пешка e5 и двойной удар ферзя|The e5 pawn and the queen's double attack
C|Слон c5 направлен на f2; диагональ h4–e1 уже открыта, но пешка f4 ещё закрывает ферзю h4 путь к e4.|Bc5 points towards f2; h4–e1 is already open, but the f4 pawn still blocks a queen on h4 from reaching e4.
M|fxe5 выигрывает пешку, но освобождает четвёртую горизонталь: после …Qh4+ ферзь сможет забрать e4 с шахом.|fxe5 wins a pawn but clears the fourth rank: after ...Qh4+ the queen can capture e4 with check.
P|…Qh4+ выигрывает темп шахом и нападает на e4. После g3 Qxe4+ появится угроза ладье h1 по диагонали e4–h1.|...Qh4+ gains a checking tempo and attacks e4. After g3 Qxe4+, the queen threatens Rh1 along e4–h1.
E|g3 перекрывает шах пешкой, но не прекращает нападение ферзя на e4.|g3 blocks the check but does not stop the queen attacking e4.
F|…Qxe4+ берёт центральную пешку с новым шахом; белые не успевают спокойно защитить ладью h1.|...Qxe4+ takes the central pawn with another check; White has no quiet tempo to secure Rh1.
D|Nf3 развивает защитника h4 и сохраняет напряжение на e5.|Nf3 develops a defender of h4 and preserves the tension on e5.
R|…d6 поддерживает e5, переходя к нормальному развитию вместо форсированного выигрыша.|...d6 supports e5, leading to normal development rather than a forced gain.
K|Удар требует отсутствия коня f3. Если h4 контролируется конём, тот же шах может потерять ферзя.|The tactic requires the absence of Nf3. With h4 controlled by the knight, the same check may lose the queen.
@kings/ignore-c6|Развитие не отменяет угрозу слону|Development does not cancel a bishop threat
C|После Bb5+ c6 слон b5 атакован пешкой c6; белые ещё могут взять на c6 пешкой d5.|After Bb5+ c6, Bb5 is attacked by c6; White can still capture c6 with the d5 pawn.
M|d3 выглядит как спокойное развитие слона c1, но оставляет собственного слона b5 под боем.|d3 looks like quiet development for Bc1 but leaves Bb5 en prise.
P|…cxb5 забирает слона пешкой: центральная угроза была важнее развивающего хода.|...cxb5 takes the bishop with a pawn; the immediate threat mattered more than a developing move.
D|dxc6 убирает нападающую пешку с темпом и сохраняет слона.|dxc6 removes the attacking pawn with tempo and preserves the bishop.
R|…Nxc6 возвращает пешку и развивает коня; материал восстанавливается без бесплатной фигуры.|...Nxc6 recovers the pawn and develops the knight without winning a free piece.
K|Чёрные получают фигуру только если белые игнорируют нападение; против dxc6 идёт обычная борьба за активность.|Black wins a piece only if White ignores the attack; dxc6 leads to an ordinary struggle for activity.
@kings/ignore-nc4|Ладья h1 видит ферзя|The h1 rook sees the queen
C|Пешка h уже ушла на h4, поэтому вертикаль h1–h4 свободна для ладьи.|The h-pawn has advanced to h4, leaving h1–h4 clear for the rook.
M|…Qxh4+ берёт пешку с шахом, но ставит ферзя на открытую линию ладьи h1.|...Qxh4+ captures with check but places the queen on Rh1's open file.
P|Rxh4 забирает ферзя; собственная пешка h больше не мешает ладье.|Rxh4 takes the queen; the h-pawn no longer blocks the rook.
D|…O-O уводит короля и подключает ладью, сохраняя ферзя вне тактической опасности.|...O-O secures the king and activates the rook, keeping the queen out of tactical danger.
R|Ne2 перестраивает белого коня для борьбы за центр; белые должны продолжать игру без выигрыша ферзя.|Ne2 reroutes White's knight for the centre; White must keep playing without a queen win.
K|Шах был бы другим при пешке h2. Здесь решает конкретно открытая вертикаль, а не общее правило о раннем ферзе.|The check would differ with a pawn on h2. The open file decides this case, not a general rule against early queen moves.
@evans/bishop-tempo|Не оставляй слона после c3|Do not leave the bishop after c3
C|После …Bxb4 пешка c3 атакует слона b4; король чёрных ещё в центре.|After ...Bxb4, c3 attacks Bb4 while Black's king is still central.
M|…Nf6 развивает коня, но игнорирует прямое нападение пешки на слона.|...Nf6 develops a knight but ignores the pawn's direct attack on the bishop.
P|cxb4 возвращает пешкой целого слона; взятие e4 не компенсирует фигуру.|cxb4 captures a whole bishop; taking e4 does not compensate for the piece.
D|…Ba5 сохраняет слона и связывает c3 по диагонали к e1; это может затруднить будущее cxd4 после …exd4.|...Ba5 preserves the bishop and pins c3 towards e1; this can complicate a later cxd4 after ...exd4.
R|Qb3 усиливает давление на f7; белые получают инициативу, а не бесплатного слона.|Qb3 increases pressure on f7; White gains initiative rather than a free bishop.
K|Принятие гамбита не ошибочно само по себе. Ошибка — потратить темп развития, когда слон уже атакован.|Accepting the gambit is not itself the error; spending a developing tempo while the bishop is attacked is.
@evans/queen-fork|Два темпа на коня f6|Two tempi against Nf6
C|Белые уже построили d4–e4, а слон a5 удерживает диагональ к e1.|White has built d4–e4 while Ba5 keeps the diagonal to e1.
M|…Nf6 выводит коня под центральный удар dxe5; чёрные не закончили безопасность короля.|...Nf6 develops into the central dxe5 advance while Black has not secured the king.
P|dxe5 забирает пешку и нападает на f6; белые используют центр для выигранного темпа.|dxe5 captures a pawn and attacks f6, using the centre to gain a tempo.
D|…d6 подкрепляет e5 и открывает слона c8 прежде, чем выводить коня под удар.|...d6 reinforces e5 and opens Bc8 before developing the knight into an attack.
R|Qb3 сохраняет давление на f7, но теперь чёрные могут организовать защиту центра.|Qb3 maintains pressure on f7, but Black can now organise central defence.
K|Это ухудшение позиции и темпов, а не форсированный мат; не объявляй победу после одного dxe5.|This loses positional ground and time, not by forced mate; do not declare victory after dxe5 alone.
@evans/central-greed|Ферзь возвращает пешку слишком рано|The queen recaptures too early
C|После …exd4 конь c6 контролирует d4. Пешка c3 связана слоном a5 с королём e1.|After ...exd4, Nc6 controls d4. The c3 pawn is pinned to Ke1 by Ba5.
M|Qxd4 пытается вернуть пешку в обход связки, но ставит ферзя под коня c6.|Qxd4 tries to recover the pawn around the pin but puts the queen under Nc6's attack.
P|…Nxd4 выигрывает ферзя за коня; последующее Nxd4 уже не восстанавливает равенство.|...Nxd4 wins the queen for a knight; a later Nxd4 does not restore equality.
D|Qb3 создаёт давление на f7 и сохраняет ферзя в безопасности; рокировку нужно готовить дальше.|Qb3 pressures f7 and keeps the queen safe; castling still needs preparation.
R|…Qf6 добавляет защиту и встречное давление; белые должны развиваться, а не форсировать возврат пешки.|...Qf6 adds defence and counterpressure; White should develop rather than force a pawn recovery.
K|Немедленное cxd4 здесь вообще нелегально из-за шаха по диагонали. Проверяй и легальность, и защиту поля d4.|Immediate cxd4 is illegal here because it exposes diagonal check. Check both legality and d4's defenders.
@evans/lost-bishop|Центральный ход оставляет слона|A central move leaves the bishop
C|Конь a5 уже нападает на слона c4; короли пока находятся на разных стадиях развития.|Na5 already attacks Bc4; the kings are at different stages of development.
M|e5 расширяет центр, но отдаёт чёрным возможность разменять коня на активного слона без выбора белых.|e5 expands the centre but lets Black exchange the knight for White's active bishop on Black's terms.
P|…Nxc4 убирает слона, который давил на f7; дальнейшее Qa4+ не возвращает прежнюю инициативу автоматически.|...Nxc4 removes the bishop pressuring f7; Qa4+ does not automatically restore the earlier initiative.
D|Bd3 сохраняет слона и укрепляет e4, не позволяя коню a5 решить его судьбу.|Bd3 preserves the bishop and reinforces e4, denying Na5 control over its fate.
R|…Ne7 развивает коня к рокировке; борьба продолжается вокруг центральной пары.|...Ne7 develops towards castling; the struggle continues around the central pawn pair.
K|Размен слона на коня не всегда плох. Здесь речь о потере важного атакующего инструмента, а не о чистом проигрыше фигуры.|Trading bishop for knight is not always bad. Here the issue is losing an important attacking tool, not a clean piece loss.
@evans/recapture-choice|Не спеши разменивать ферзей|Do not rush the queen exchange
C|После e5 dxe5 открылась линия d, а слон c1 ещё не развит. У белых есть ход Ba3 с активностью.|After e5 dxe5 the d-file is open and Bc1 is undeveloped. White has the active Ba3 resource.
M|dxe5 кажется естественным возвратом пешки, но допускает размен ферзей и удобную защиту чёрных.|dxe5 looks like a natural recapture but permits a queen trade and comfortable Black defence.
P|…Qxd1 вынуждает Rxd1; затем …Ng4 давит на f2 и e5, а гамбитная инициатива исчезает.|...Qxd1 forces Rxd1; ...Ng4 then pressures f2 and e5 as the gambit initiative fades.
D|Ba3 вводит последнюю лёгкую фигуру с давлением по диагонали и сохраняет тактическое напряжение.|Ba3 brings the last minor piece into play with diagonal pressure and preserves tactical tension.
R|…Nxd4 принимает центральную пешку, но после Nxe5 белые сохраняют активную игру; считать нужно обе стороны.|...Nxd4 takes the central pawn, but Nxe5 preserves White's activity; calculate both sides.
K|Размен ферзей не запрещён в гамбите. Именно здесь он меняет активную компенсацию на неприятную защиту.|Queen trades are not forbidden in gambits. In this position the trade exchanges active compensation for difficult defence.
@evans/declined-trap|Поддержка центра забывает слона|Supporting the centre forgets the bishop
C|Слон вернулся на c5 после c3, а белые сыграли d4 с нападением на него.|The bishop returned to c5 after c3 and White has played d4, attacking it.
M|…d6 защищает e5, но не решает нападение пешки d4 на слона c5.|...d6 protects e5 but does not address d4's attack on Bc5.
P|dxc5 выигрывает слона пешкой. Нельзя защищать одну центральную пешку ценой целой фигуры.|dxc5 wins the bishop with a pawn. Defending one central pawn is not worth a whole piece.
D|…Bb6 сохраняет слона на диагонали к f2 и только затем позволяет укреплять центр.|...Bb6 preserves the bishop on the diagonal towards f2, allowing central support afterwards.
R|Nxe5 атакует центр; чёрные могут ответить Nxe5, поэтому белые не получают фигуру бесплатно.|Nxe5 challenges the centre; Black can answer Nxe5, so White does not win a free piece.
K|Идея d4 действует с темпом только пока слон стоит на c5. После его ухода нужно заново считать центральные взятия.|d4 gains tempo only while the bishop stands on c5. After it retreats, recalculate central captures.
@scotch/f7-sacrifice|Шах на f7 без подкрепления|A check on f7 without support
C|Слон c4 видит f7, но белый ферзь и ладьи ещё не участвуют в атаке.|Bc4 sees f7, but White's queen and rooks are not yet involved in the attack.
M|Bxf7+ меняет активного слона на пешку ради потери рокировки чёрных, не доказав компенсацию.|Bxf7+ trades an active bishop for a pawn to remove Black's castling rights without proving compensation.
P|…Kxf7 принимает фигуру. Пешечное e5 может дать темп, но не возвращает слона.|...Kxf7 accepts the piece. e5 may gain a tempo but does not recover the bishop.
D|e5 сначала атакует коня f6, заставляя чёрных отвечать в центре без добровольной потери фигуры.|e5 first attacks Nf6, forcing a central response without voluntarily losing a piece.
R|…d5 нападает на слона c4: обе стороны создают угрозы, поэтому порядок взятий нужно считать.|...d5 attacks Bc4; both sides create threats, so the capture order needs calculation.
K|Bxf7+ бывает хорошим только с конкретным продолжением. Отмена рокировки сама по себе не стоит слона.|Bxf7+ is good only with a concrete continuation. Removing castling rights alone is not worth a bishop.
@scotch/ignore-e5|Рокировка под нападением на коня|Castling while the knight is attacked
C|После e5 конь f6 атакован пешкой; чёрные могут ответить центральным …d5.|After e5, Nf6 is attacked by a pawn; Black can answer with central ...d5.
M|…O-O прячет короля, но оставляет коня f6 под взятием без встречной угрозы слону.|...O-O shelters the king but leaves Nf6 en prise without a counterthreat to the bishop.
P|exf6 выигрывает коня за пешку. Qxf6 вернёт пешку, но фигура уже потеряна.|exf6 wins a knight for a pawn. Qxf6 recovers the pawn but the piece is lost.
D|…d5 нападает на слона c4, создавая возможность восстановить материал после exf6.|...d5 attacks Bc4, creating a way to restore material after exf6.
R|exf6 берёт коня, но чёрные отвечают …dxc4: при точной защите это размен фигур.|exf6 takes the knight, but ...dxc4 follows: accurate defence turns it into a piece exchange.
K|Совет «рокируй быстрее» не отменяет проверку висящих фигур. Здесь решает наличие ответного нападения.|The advice to castle quickly does not replace checking for hanging pieces. A counterattack is the key here.
@scotch/ignore-d5|Тихий ход в двойном нападении|A quiet move between two attacks
C|Конь f6 атакован пешкой e5, а слон c4 — пешкой d5. Белым нужно решить обе угрозы.|Nf6 is attacked by e5 and Bc4 by d5. White must resolve both threats.
M|h3 тратит темп на профилактику, когда центр требует немедленного решения.|h3 spends a preventive tempo when the centre demands an immediate decision.
P|…dxc4 забирает слона первым. После exf6 чёрные могут взять пешку ферзём, а не потерять коня бесплатно.|...dxc4 takes the bishop first. After exf6, Black can recapture the pawn with the queen rather than lose a knight for nothing.
D|exf6 сразу определяет размен и оставляет белым опасную пешку у короля.|exf6 immediately defines the exchange and leaves White a dangerous pawn near the king.
R|…dxc4 возвращает фигуру, после чего важны линия e и промежуточные шахи.|...dxc4 restores material; the e-file and intermediate checks then matter.
K|В этой позиции темп меняет итог разменов. h3 не плох вообще, но здесь он запаздывает с решением угроз.|Here one tempo changes the exchange outcome. h3 is not always bad, but it postpones an urgent decision here.
@scotch/loose-queen|Конь развивается на ферзя|A developing knight attacks the queen
C|Конь c3 только что вышел с нападением на ферзя d5; белая ладья давит по линии e.|Nc3 has just developed with an attack on Qd5 while White's rook pressures the e-file.
M|…O-O отвечает на проблему короля, забывая прямую угрозу ферзю.|...O-O addresses king safety but forgets the direct threat to the queen.
P|Nxd5 выигрывает ферзя. Bxd5 возвратит коня, но оставит чёрных без ферзя за лёгкую фигуру.|Nxd5 wins the queen. Bxd5 recovers the knight but leaves Black down a queen for a minor piece.
D|…Qf5 убирает ферзя из-под удара и сохраняет защиту слона e6.|...Qf5 moves the queen to safety while retaining protection of Be6.
R|Nce4 усиливает давление, но чёрные сохраняют ферзя и могут продолжать защиту.|Nce4 increases pressure, but Black keeps the queen and can continue defending.
K|Комбинация зависит от ферзя на d5. После правильного отхода белым нужно искать новое продолжение, а не тот же удар.|The tactic depends on Qd5. After a correct retreat, White must find a new continuation.
@scotch/pawn-overreach|Вторая пешка разрешает шах|The second pawn allows a check
C|После c3 чёрные могут брать ещё пешку, но слон c4 и ферзь d1 получают форсирующую игру.|After c3, Black can take another pawn, but Bc4 and Qd1 gain forcing play.
M|…dxc3 увеличивает материальный перевес ценой темпа развития и допускает удар по f7.|...dxc3 increases the material lead at the cost of development and allows a strike on f7.
P|Bxf7+ отвлекает короля от обычного укрытия и подготавливает шах ферзём с d5.|Bxf7+ diverts the king from normal shelter and prepares a queen check from d5.
E|…Kxf7 принимает слона; считать нужно следующий шах, а не останавливаться на лишней фигуре.|...Kxf7 accepts the bishop; calculate the next check rather than stopping at the extra piece.
F|Qd5+ совмещает шах с нападением на слона c5, возвращая материал и сохраняя темп.|Qd5+ combines check with an attack on Bc5, recovering material while keeping the tempo.
D|…Nf6 развивает коня и атакует e4 вместо погони за c3.|...Nf6 develops and attacks e4 instead of chasing c3.
R|e5 гонит коня, но у чёрных остаётся центральный ответ …d5.|e5 attacks the knight, but Black retains the central ...d5 reply.
K|Это пример цены лишней пешки, не обещание форсированной победы белых: после правильных ответов борьба продолжается.|This illustrates the cost of an extra pawn, not a forced White win; accurate replies keep the game going.
@scotch/bishop-check|Забытая диагональ пешки d5|Forgetting the d5 pawn's diagonal
C|После серии разменов …d5 атакует слона c4. Шахи закончились, но угрозы — нет.|After the exchanges, ...d5 attacks Bc4. The checks have ended but the threats have not.
M|O-O кажется естественным завершением развития, но оставляет слона c4 под пешкой.|O-O looks like a natural end to development but leaves Bc4 attacked by a pawn.
P|…dxc4 выигрывает слона. Nxc4 вернёт пешку, но не компенсирует фигуру.|...dxc4 wins the bishop. Nxc4 recovers a pawn but not the piece.
D|exd5 снимает нападение, убирая пешку d5, и только затем готовит рокировку.|exd5 removes the attacking d5 pawn before castling.
R|…Nxd5 централизует коня и возвращает пешку, сохраняя материальное равновесие.|...Nxd5 centralises the knight and recovers the pawn, preserving material balance.
K|После форсированных шахов легко пропустить новую тихую угрозу. Проверяй атакованные фигуры после каждого размена.|After forcing checks it is easy to miss a new quiet threat. Recheck attacked pieces after every exchange.
@goring/greedy-e4|Конь c6 не может просто съесть e5|Nc6 cannot simply take e5
C|Пешка e5 гонит коня f6; другой чёрный конь c6 тоже смотрит на e5, но поле защищено Nf3.|The e5 pawn attacks Nf6; Nc6 also eyes e5, but Nf3 protects that square.
M|…Nxe5 пытается убрать нападающую пешку вторым конём, не учитывая защиту f3.|...Nxe5 tries to remove the attacking pawn with the other knight, ignoring Nf3's protection.
P|Nxe5 возвращает пешку и выигрывает коня за неё; белый конь остаётся активным в центре.|Nxe5 recaptures and wins a knight for the pawn, leaving White's knight active centrally.
D|…Ng4 уводит атакованного коня и создаёт давление на e5 и f2.|...Ng4 saves the attacked knight and creates pressure on e5 and f2.
R|Qe2 защищает e5 и готовит координацию; фигура не выигрывается автоматически.|Qe2 protects e5 and prepares coordination; White does not win a piece automatically.
K|Считай не только число нападающих на e5, но и порядок взятий: пешка не висит бесплатно.|Count the capture order as well as attackers on e5; the pawn is not free.
@goring/pinned-knight|Ферзь попадает под Nc6|The queen walks into Nc6
C|Слон b4 связывает коня c3, но конь чёрных c6 свободен и контролирует d4.|Bb4 pins Nc3, but Black's Nc6 is free and controls d4.
M|Qd4 централизует ферзя слишком рано, ставя его на поле, доступное чёрному коню.|Qd4 centralises the queen too early, placing it on a square available to Black's knight.
P|…Nxd4 берёт ферзя; последующий Nxd4 белых возвращает только коня.|...Nxd4 takes the queen; White's later Nxd4 recovers only the knight.
D|Bc4 развивает слона к f7 и готовит рокировку, чтобы снять связку c3.|Bc4 develops towards f7 and prepares castling to unpin Nc3.
R|…d6 укрепляет e5 и открывает слона c8; белым нужно продолжать развитие.|...d6 supports e5 and opens Bc8; White must continue developing.
K|Связка одного коня не делает другого коня связанным. Проверяй конкретные линии к обоим королям.|Pinning one knight does not pin the other. Check the exact lines to both kings.
@goring/queen-tempo|Пешка d4 прикрыта конём|The d4 pawn is protected by a knight
C|Конь c3 атакует ферзя d5, а конь f3 контролирует d4; оба коня важны для выбора отхода ферзя.|Nc3 attacks Qd5 while Nf3 controls d4; both knights matter to the queen's retreat.
M|…Qxd4 жадно берёт пешку, но ферзь попадает под коня f3.|...Qxd4 greedily takes a pawn but moves the queen into Nf3's attack.
P|Nxd4 забирает ферзя. Размен слона на e2 не возвращает чёрным равноценный материал.|Nxd4 takes the queen; exchanging on e2 does not restore equivalent material for Black.
D|…Qd7 уводит ферзя с нападения и сохраняет поддержку развития.|...Qd7 removes the queen from attack and supports development.
R|d5 выигрывает пространство и нападает на c6, но требует дальнейшего расчёта вместо простого выигрыша ферзя.|d5 gains space and attacks Nc6, requiring further calculation rather than winning a free queen.
K|Ферзь не может спасаться с темпом любым взятием: поле возврата пешки тоже должно быть безопасным.|The queen cannot escape with just any capture; the recapture square must also be safe.
@goring/bishop-left|Оставленный слон берёт ладью|The ignored bishop takes a rook
C|Чёрный слон только что взял коня на c3 и смотрит через d2 на e1.|Black's bishop has just captured on c3 and sees e1 through d2.
M|Re1 ставит ладью на диагональ слона вместо немедленного возврата фигуры.|Re1 places a rook on the bishop's diagonal instead of immediately recapturing the piece.
P|…Bxe1 берёт ладью; Qxe1 вернёт слона, но не возместит потерянную ладью и коня c3.|...Bxe1 takes the rook; Qxe1 recovers the bishop, but cannot compensate for the lost rook and c3-knight.
D|bxc3 сразу возвращает слона и открывает линию b, сохраняя материальную структуру жертвы.|bxc3 immediately recaptures and opens the b-file, preserving the intended material balance.
R|…Nf6 атакует e4, поэтому белые снова должны совмещать развитие и защиту центра.|...Nf6 attacks e4, requiring White to combine development with central defence.
K|После взятия на c3 не всякий промежуточный развивающий ход полезен: проверяй диагональ оставшегося слона.|Not every intermediate developing move after Bxc3 is useful; check the remaining bishop's diagonal.
@goring/queen-vs-bishop|Фланговый темп против центра|A flank tempo against the centre
C|Белые уже сыграли Re1 и Ba3; пешка e4 готова продвинуться, воздействуя на коня f6.|White has played Re1 and Ba3; e4 is ready to advance against Nf6.
M|…a6 не влияет ни на e5, ни на активную диагональ a3–f8, давая белым время.|...a6 affects neither e5 nor the a3–f8 diagonal, giving White time.
P|e5 атакует коня f6 и усиливает центральное давление; чёрным приходится уступать пространство.|e5 attacks Nf6 and increases central pressure, forcing Black to concede space.
D|…Bg4 связывает коня f3 с ферзём, создавая встречное давление на центр.|...Bg4 pins Nf3 to the queen and creates counterpressure against the centre.
R|h3 задаёт вопрос слону, но чёрные могут менять на f3 и не обязаны пассивно ждать e5.|h3 questions the bishop, but Black can exchange on f3 rather than passively await e5.
K|Здесь нет мгновенного мата. Ошибка — отдать темп инициативе, когда соперник готов вскрыть центр.|There is no instant mate here. The error is giving away a tempo when the opponent is ready to open the centre.
@goring/double-pawn-delay|Две лишние пешки требуют развития|Two extra pawns require development
C|Слоны белых уже на c4 и b2, а чёрные ещё не развили королевский фланг.|White's bishops are already on c4 and b2 while Black's kingside is undeveloped.
M|…a6 удерживает материал, но не готовит рокировку и не мешает белым подключить ладью.|...a6 keeps the material but neither prepares castling nor stops White activating a rook.
P|O-O убирает короля белых и подключает ладью; после …d6 возможно Qb3 с давлением на f7.|O-O secures White's king and activates the rook; after ...d6, Qb3 can increase pressure on f7.
D|…Bb4+ развивает фигуру с шахом, используя центральное положение белого короля.|...Bb4+ develops with check, exploiting White's central king.
R|Nc3 перекрывает шах и развивает коня; чёрные получили темп для следующего развивающего хода.|Nc3 blocks the check and develops a knight; Black has gained time for the next developing move.
K|Это пример опасной потери темпа при двух лишних пешках, а не доказательство вынужденного проигрыша после …a6.|This is a dangerous loss of time with two extra pawns, not proof of a forced loss after ...a6.
@danish/f7-queen|Слон b2 видит g7 и h8|Bb2 sees g7 and h8
C|После двух взятий пешками слон белых стоит на b2, и большая диагональ до g7 открыта.|After the pawn captures, White's bishop stands on b2 with the long diagonal to g7 open.
M|…Bc5 развивает слона, но оставляет g7 без защиты и ладью h8 за ним.|...Bc5 develops a bishop but leaves g7 unprotected with Rh8 behind it.
P|Bxg7 забирает пешку с нападением на h8; белые используют открытую диагональ, а не абстрактное преимущество развития.|Bxg7 takes the pawn and attacks Rh8; White uses a specific open diagonal, not an abstract development lead.
D|…Nf6 развивает коня и закрывает диагональ b2–g7, пока король готовится к рокировке.|...Nf6 develops a knight and blocks b2–g7 while Black prepares castling.
R|Nc3 добавляет фигуру в центр; чёрные могут отвечать …d5, возвращая материал ради развития.|Nc3 brings another piece into the centre; Black can answer ...d5, returning material for development.
K|Удар Bxg7 зависит от свободной диагонали. После …Nf6 слон b2 уже не видит g7 напрямую.|Bxg7 depends on the open diagonal. After ...Nf6, Bb2 no longer sees g7 directly.
@danish/queen-grab|Фланговая пешка и промежуточный размен|A flank pawn and an intermediate exchange
C|После …Nf6 линия d открыта между ферзями d1 и d8; чёрный король ещё на e8.|After ...Nf6, the d-file is open between Qd1 and Qd8; Black's king remains on e8.
M|Bxb7 берёт фланговую пешку, забывая открытое нападение на ферзя d1.|Bxb7 takes a flank pawn while forgetting the open attack on Qd1.
P|…Qxd1+ забирает ферзя с шахом; Kxd1 вернёт ферзя, но в продолжении белые потеряют слона b7 и право рокировки.|...Qxd1+ forces a queen exchange with check; Kxd1 is followed by ...Bxb7, leaving White down the bishop.
E|Kxd1 возвращает ферзя, но король теряет рокировку, а слон b7 остаётся под ударом c8.|Kxd1 recaptures the queen but loses castling while Bb7 remains attacked by Bc8.
F|…Bxb7 возвращает фланговый материал с взятием слона; жадность разрушила активную компенсацию.|...Bxb7 captures the bishop, ending White's active compensation for the gambit.
D|Bxf7+ использует промежуточный шах, чтобы изменить расположение короля прежде размена ферзей.|Bxf7+ uses an intermediate check to change the king's position before exchanging queens.
R|…Kxf7 принимает слона; затем Qxd8 Bb4+ нужно рассчитать до конца, а не считать выигрышным в один ход.|...Kxf7 accepts; Qxd8 Bb4+ must then be calculated to the end rather than called a one-move win.
K|Даже правильный Bxf7+ ведёт к сложным разменам, а не гарантированному выигрышу ферзя.|Even the correct Bxf7+ leads to complex exchanges rather than a guaranteed queen win.
@danish/forget-check|Не упусти промежуточный шах|Do not miss the intermediate check
C|Белый ферзь взял d8, чёрный король ушёл на f7; белый король e1 ещё открыт.|White's queen has taken d8, Black's king is on f7 and Ke1 is still exposed.
M|…Nc6 развивает фигуру, но упускает единственный смысл комбинации — шах слоном b4 с возвратом ферзя.|...Nc6 develops a piece but misses the point of the combination: Bb4+ to recover the queen.
P|Qxc7+ сохраняет белого ферзя и берёт пешку с шахом; чёрные больше не возвращают ферзя форсированно.|Qxc7+ preserves White's queen and captures with check; Black no longer recovers the queen by force.
D|…Bb4+ заставляет белых реагировать на шах, а не спасать ферзя свободным ходом.|...Bb4+ forces White to answer the check instead of freely saving the queen.
R|Qd2 перекрывает шах; теперь …Bxd2+ возвращает ферзя, завершая комбинацию.|Qd2 blocks the check; ...Bxd2+ then recovers the queen and completes the combination.
K|Компенсация существует только при точном порядке шахов. Развивающий ход вместо форсирующего меняет весь материальный итог.|Compensation depends on the exact checking sequence. A developing move instead of a forcing one changes the entire material outcome.
@danish/early-queen|Королева без развивающего темпа|A queen move without a developing tempo
C|После c3 белые предлагают пешку, но чёрные могут подрывать центр вместо раннего выхода ферзя.|After c3 White offers a pawn, but Black can challenge the centre rather than bring the queen out early.
M|…Qh4 рассчитывает на давление по диагонали, но это не шах: пешка f2 пока закрывает путь к e1.|...Qh4 hopes for diagonal pressure, but it is not check: f2 still blocks the route to e1.
P|Bd3 развивает слона и поддерживает e4; ферзь чёрных не заставил белых потерять темп на защиту короля.|Bd3 develops and supports e4; Black's queen has not forced White to waste a king-defence tempo.
D|…Qe7 держит давление по линии e и допускает центральное взятие с темпом.|...Qe7 keeps e-file pressure and allows a central capture with tempo.
R|cxd4 возвращает пешку; чёрные могут продолжить …Qxe4+, поэтому белые тоже должны считать шахи.|cxd4 recovers a pawn; ...Qxe4+ remains available, so White must also calculate checks.
K|Это позиционная потеря времени, а не немедленная потеря ферзя. Не называй любой ранний выход ферзя зевком.|This is a positional loss of time, not an immediate queen loss. Not every early queen move is a blunder.
@danish/undefended-rook|Ферзя гонят развитием|Developing with an attack on the queen
C|Слон белых на d5, а королевский конь ещё на g1 и может выйти на f3 с темпом.|White's bishop stands on d5 and Ng1 can develop to f3 with tempo.
M|…Qg5 ставит ферзя на поле, которое атакует естественный Nf3, задерживая развитие чёрных.|...Qg5 places the queen on a square attacked by natural Nf3, delaying Black's development.
P|Nf3 развивает коня и нападает на ферзя g5; белые получают сразу защитника короля и темп.|Nf3 develops while attacking Qg5, gaining both a king defender and a tempo.
D|…Nf6 развивает собственную фигуру с нападением на слона d5.|...Nf6 develops a piece while attacking Bd5.
R|Bxf7+ использует шах, но у чёрных есть известная защитная серия после Kxf7.|Bxf7+ uses a check, but Black has the known defensive sequence after Kxf7.
K|Белые выигрывают темп, не ферзя. После его отхода нужно продолжить развитие и не выдумывать форсированный мат.|White gains time, not a queen. After the retreat, continue developing rather than inventing a forced mate.
@danish/knight-grab|Жертва без второго активного слона|A sacrifice without the second active bishop
C|В сдержанном варианте Nxc3 слон c1 ещё дома; это не позиция с двумя слонами на b2 и c4.|In the restrained Nxc3 line, Bc1 is still at home; this is not the two-bishop position with Bb2 and Bc4.
M|Bxf7+ копирует жертву из другой линии, хотя открытой диагонали b2 и комбинации на d8 здесь нет.|Bxf7+ copies a sacrifice from another line although the b2 diagonal and d8 combination are absent.
P|…Kxf7 принимает слона; Qb3+ даёт шах, но не возвращает фигуру форсированно.|...Kxf7 accepts the bishop; Qb3+ gives check but does not force recovery of the piece.
D|Qb3 создаёт давление на f7, сохраняя слона и развивая ферзя с конкретной целью.|Qb3 pressures f7 while keeping the bishop and developing the queen with a concrete purpose.
R|…Qd7 защищает f7 и помогает развитию, не позволяя белым выиграть одной угрозой.|...Qd7 defends f7 and assists development, preventing a one-threat win.
K|Похожее название дебюта не делает жертву правильной. Отсутствие слона b2 меняет всю тактическую геометрию.|A similar opening name does not justify the sacrifice. The absence of Bb2 changes the tactical geometry.
@vienna/knight-fork|Поле e4 занято под контролем Nc3|The e4 square is controlled by Nc3
C|После …exf4 e5 чёрный конь f6 атакован; поле e4 уже контролирует конь c3.|After ...exf4 e5, Nf6 is attacked and Nc3 already controls e4.
M|…Ne4 копирует центральный прыжок из варианта …d5, но здесь на e4 нет пешки для взятия и есть защитник.|...Ne4 copies the central jump from the ...d5 line, but here e4 has no pawn to capture and is defended.
P|Nxe4 выигрывает коня. Разница одного пешечного хода делает знакомый прыжок ошибкой.|Nxe4 wins the knight. A single pawn-move difference makes the familiar jump an error.
D|…Ng8 сохраняет коня, принимая потерю темпа вместо потери фигуры.|...Ng8 preserves the knight, accepting a lost tempo rather than a lost piece.
R|Nf3 развивает защитника короля и поддерживает центр; белые получили развитие, но не фигуру.|Nf3 develops a king defender and supports the centre; White gains development, not a piece.
K|Отступление домой выглядит неприятно, но лучше подаренного коня. Не переносить …Nxe4 из другой позиции без проверки.|Retreating home looks unpleasant but beats giving away a knight. Do not transfer ...Nxe4 from another position without checking.
@vienna/queen-sacrifice|Nf3 отменяет старый шах|Nf3 changes the old check
C|Белый конь уже на f3. Чёрный конь e4 давит на центр, но не защищает h4 от взятия.|White's knight is on f3. Ne4 pressures the centre but does not make h4 safe from capture.
M|…Qh4+ выходит на поле, контролируемое конём f3; центральный конь не спасает ферзя.|...Qh4+ moves to a square controlled by Nf3; the central knight does not save the queen.
P|Nxh4 берёт шахующего ферзя и выигрывает решающий материал.|Nxh4 captures the checking queen and wins decisive material.
D|…Bc5 развивает слона с давлением на f2, создавая угрозу без потери ферзя.|...Bc5 develops with pressure on f2, creating a threat without losing the queen.
R|d4 атакует слона и поддерживает e5, поэтому чёрным нужно выбрать точный отход.|d4 attacks the bishop and supports e5, requiring Black to choose an accurate retreat.
K|После ухода коня f3 шах может снова стать возможным. Эта ошибка определяется текущей расстановкой.|After Nf3 moves the check may become possible again. The current piece placement determines this error.
@vienna/ignore-knight|Нельзя развиваться вместо спасения коня|Development cannot replace saving the knight
C|Пешка f только что взяла e5 и напала на коня f6; у чёрных есть взятие e4.|The f-pawn has just captured e5 and attacked Nf6; Black can capture e4.
M|…Bc5 развивает слона, оставляя коня f6 под пешкой e5.|...Bc5 develops a bishop while leaving Nf6 attacked by e5.
P|exf6 выигрывает коня за пешку; Qxf6 возвращает лишь пешку и выводит ферзя рано.|exf6 wins a knight for a pawn; Qxf6 recovers only the pawn and exposes the queen early.
D|…Nxe4 спасает атакованного коня со взятием центральной пешки.|...Nxe4 saves the attacked knight while taking the central pawn.
R|Nf3 развивает белого коня, и обе стороны продолжают борьбу за центр без лишней фигуры.|Nf3 develops White's knight and both sides continue the central struggle without a free piece.
K|В отличие от принятого …exf4, здесь на e4 ещё стоит белая пешка. Именно она делает …Nxe4 содержательным.|Unlike the accepted ...exf4 line, e4 still contains a white pawn. That pawn gives ...Nxe4 its point.
@vienna/bishop-fork|Центрального коня атакуют дважды|Two pieces attack the central knight
C|После Bd3 конь e4 атакован слоном d3 и конём c3; пешка d5 защищает его только для одного размена.|After Bd3, Ne4 is attacked by Bd3 and Nc3; d5 supports only one exchange.
M|…a6 тратит темп на фланге, оставляя перегруженную защиту коня e4.|...a6 spends a flank tempo while leaving Ne4's overloaded defence unresolved.
P|Nxe4 забирает коня; после …dxe4 слон d3 возвращает пешку, выигрывая материал.|Nxe4 captures the knight; after ...dxe4, Bd3 recaptures the pawn and wins material.
E|…dxe4 возвращает коня, но переводит защищающую пешку на поле под слоном d3.|...dxe4 recaptures but moves the defending pawn onto Bd3's diagonal.
F|Bxe4 завершает размен и сохраняет белым лишнюю центральную пешку при активном слоне.|Bxe4 completes the exchange, leaving White an extra central pawn and an active bishop.
D|…Nxc3 меняет атакованного коня, прежде чем белые проведут выгодную серию взятий.|...Nxc3 exchanges the attacked knight before White can execute the favourable capture sequence.
R|bxc3 восстанавливает материал, меняя пешечную структуру; затем чёрные могут подрывать d4 ходом …c5.|bxc3 restores material and changes the pawn structure; Black can then challenge d4 with ...c5.
K|Это не выигрыш целой фигуры после всех взятий. Важно досчитать dxe4 и Bxe4 и назвать точный материальный итог.|This is not a whole-piece win after all captures. Calculate dxe4 and Bxe4 and name the exact material outcome.
@vienna/greed-f4|Шах ферзём под пешечный темп|A queen check met by a pawn tempo
C|Слон c5 активен, но пешка f4 остаётся на четвёртой горизонтали и пешка g2 может закрыть диагональ.|Bc5 is active, but f4 remains on the fourth rank and g2 can block the diagonal.
M|…Qh4+ выводит ферзя до развития коней и допускает g3 с нападением.|...Qh4+ brings the queen out before the knights develop and allows g3 with tempo.
P|g3 перекрывает шах и нападает на ферзя h4; чёрным приходится терять время на отход.|g3 blocks the check and attacks Qh4, forcing Black to spend time retreating.
D|…d6 укрепляет e5 и открывает слона c8, не давая белым развиваться с нападением на ферзя.|...d6 strengthens e5 and opens Bc8 without letting White gain tempi against the queen.
R|fxe5 вскрывает центр, но чёрные могут развивать Nc6, сохраняя ферзя дома.|fxe5 opens the centre, but Black can develop Nc6 while keeping the queen at home.
K|Белые выигрывают время и ослабляют собственное g3; это практическая цена раннего шаха, а не универсальная ловушка на ферзя.|White gains time but also weakens g3; this is the practical cost of an early check, not a universal queen trap.
@vienna/centre-overreach|Снятие напряжения помогает слону|Releasing tension helps the bishop
C|Белые ещё не рокировали; …c5 атакует d4, а чёрный слон e7 готов ожить после размена.|White has not castled; ...c5 attacks d4 and Be7 can become active after the exchange.
M|dxc5 отдаёт центральную опору d4 и помогает чёрному слону выйти на активную диагональ.|dxc5 gives up the d4 central anchor and helps Black's bishop reach an active diagonal.
P|…Bxc5 возвращает пешку и направляет слона на королевский фланг, заставляя белых заниматься безопасностью.|...Bxc5 recaptures and points the bishop towards the kingside, making White attend to king safety.
D|O-O сначала убирает короля, сохраняя центральное напряжение и выбор момента взятия.|O-O first shelters the king, keeping the central tension and the choice of when to capture.
R|…Nc6 усиливает давление на d4, но белый король уже готов к вскрытию линий.|...Nc6 increases pressure on d4, but White's king is now ready for the files to open.
K|dxc5 не запрещён навсегда: после подготовки рокировкой его смысл меняется. Ошибка в моменте, а не в самом взятии.|dxc5 is not permanently forbidden; castling preparation changes its meaning. The timing, not the capture itself, is the issue.
@morra/siberian|Сибирская ловушка: ферзь на e2|The Siberian trap: the queen on e2
C|Чёрные кони стоят на c6 и g4, ферзь на c7; белый ферзь e2 доступен вилке с d4.|Black's knights stand on c6 and g4, with Qc7; White's Qe2 is vulnerable to a fork from d4.
M|h3 нападает на коня g4, но игнорирует промежуточный удар второго коня.|h3 attacks Ng4 but ignores an intermediate strike by the other knight.
P|…Nd4 атакует ферзя e2 и создаёт угрозу Nxe2+; нападение пешки h3 перестаёт быть главным.|...Nd4 attacks Qe2 and threatens Nxe2+; h3's attack is no longer the main issue.
E|hxg4 забирает коня, но оставляет ферзя на e2 под ударом.|hxg4 takes a knight but leaves Qe2 attacked.
F|…Nxe2+ выигрывает ферзя с шахом. Два нападения нужно сравнивать по цене целей и темпу.|...Nxe2+ wins the queen with check. Compare simultaneous threats by target value and tempo.
D|Rd1 включает ладью в контроль d4 и давление по линии d, не тратя темп на коня g4.|Rd1 brings the rook into d4 control and d-file pressure without spending a tempo on Ng4.
R|…Bc5 развивает слона и сохраняет угрозы; белым всё ещё нужно считать Nd4, но положение ладьи уже изменилось.|...Bc5 develops and keeps threats; White must still calculate Nd4, but the rook's placement has changed.
K|Показанная потеря ферзя требует ещё и hxg4 после …Nd4. h3 само по себе ухудшает позицию, но не заставляет играть именно hxg4.|The shown queen loss also requires hxg4 after ...Nd4. h3 worsens the position but does not force hxg4.
@morra/bishop-taken|Пешка e5 атакует слона f4|The e5 pawn attacks Bf4
C|Слон f4 давит на d6, но чёрные только что сыграли …e5 и напали на него.|Bf4 pressures d6, but Black has just played ...e5, attacking it.
M|h3 делает полезную форточку не в тот момент: слон остаётся под пешкой e5.|h3 creates luft at the wrong moment: the bishop remains attacked by e5.
P|…exf4 выигрывает слона за пешку; центральное e5 белых уже не компенсирует потерю фигуры.|...exf4 wins a bishop for a pawn; White's subsequent e5 does not compensate for losing a piece.
D|Nxe5 использует тактику на центральной пешке и снимает её нападение на слона.|Nxe5 uses tactics against the central pawn and removes its attack on the bishop.
R|…Nxe5 принимает коня, но Bxe5 восстанавливает фигуру и сохраняет активность белых.|...Nxe5 accepts the knight, but Bxe5 restores material and preserves White's activity.
K|В спокойной основной линии допустим Be3. Лучший найденный здесь Nxe5 нужно считать до Bxe5, а не выдавать за бесплатную пешку.|The quiet study line permits Be3. The best move found here, Nxe5, must be calculated through Bxe5 rather than called a free pawn.
@morra/ignore-e5|Конь f6 уже под ударом|Nf6 is already attacked
C|В отказанном гамбите …Nf6 вызвало e5; атакован именно королевский конь.|In the declined gambit, ...Nf6 has provoked e5; the kingside knight is attacked.
M|…Nc6 развивает второго коня, оставляя первого на f6 под пешкой.|...Nc6 develops the other knight while leaving Nf6 attacked by the pawn.
P|exf6 выигрывает коня. Ответное …dxc3 берёт только пешку и не возвращает фигуру.|exf6 wins a knight. ...dxc3 takes only a pawn and does not recover the piece.
D|…Nd5 сохраняет коня на центральном поле; позднейшее …d6 поможет чёрным оспорить центр белых.|...Nd5 preserves the knight on a central square; a later ...d6 can help Black challenge the white centre.
R|cxd4 возвращает пешку и строит центр, но чёрные сохраняют все фигуры.|cxd4 recovers a pawn and builds the centre, but Black retains all pieces.
K|Полезное развитие второго коня не заменяет решение угрозы первому; выбор порядка ходов здесь материален.|Useful development of the other knight cannot replace saving the first; the move order costs material here.
@morra/ignore-nb6|Рокировка оставляет слона c4|Castling leaves Bc4 behind
C|После …Nb6 чёрный конь атакует слона c4; белые ещё выбирают его отступление.|After ...Nb6, Black's knight attacks Bc4 and White must choose its retreat.
M|O-O улучшает безопасность короля, но оставляет слона под конём.|O-O improves king safety but leaves the bishop attacked by the knight.
P|…Nxc4 выигрывает слона; продвижение exd6 не равноценно потерянной фигуре.|...Nxc4 wins the bishop; exd6 does not equal the lost piece.
D|Bb5 сохраняет слона и связывает коня c6, отвечая активностью на нападение.|Bb5 saves the bishop and pins Nc6, responding actively to the threat.
R|…dxe5 вскрывает центр; белые могут отвечать Nxe5, сохраняя фигуры.|...dxe5 opens the centre; White can answer Nxe5 while keeping the pieces.
K|Безопасность короля важна, но рокировка не обязана быть следующим ходом, если атакована фигура.|King safety matters, but castling need not be the next move when a piece is attacked.
@morra/queen-pin|Преждевременный прорыв d5|The premature d5 break
C|Ладья белых на d1 стоит напротив ферзя d8; размены на d5 могут дать белым активные фигуры с темпом.|White's Rd1 faces Qd8; exchanges on d5 can activate White's pieces with tempo.
M|…d5 пытается освободить позицию до рокировки, но позволяет белым разменять центральных защитников и усилить давление.|...d5 tries to free the position before castling but lets White exchange central defenders and intensify the pressure.
P|exd5 начинает размены: после …Nxd5 Nxd5 exd5 Bxd5 активный слон будет защищён ладьёй d1.|exd5 starts the exchanges: after ...Nxd5 Nxd5 exd5 Bxd5 the active bishop will be protected by Rd1.
E|…Nxd5 возвращает пешку конём. Это ещё не потеря ферзя: после следующего размена пешка e6 вправе брать на d5.|...Nxd5 recaptures with the knight. There is no queen loss yet: after the next exchange e6 can legally capture on d5.
F|Nxd5 меняет центрального защитника. На …exd5 следует Bxd5: слон под защитой Rd1 занимает сильный пост, а чёрным ещё надо решать вопросы развития и безопасности короля.|Nxd5 exchanges a central defender. After ...exd5 Bxd5, the bishop takes a strong post protected by Rd1 while Black still has development and king-safety problems.
D|…e5 закрывает центр и ограничивает белые поля, не вскрывая линию d к собственному ферзю.|...e5 closes the centre and restricts White's central squares without opening the d-file.
R|Bb5 сохраняет активность слона и давление на c6; чёрные успевают подготовить рокировку.|Bb5 maintains bishop activity and pressure on c6 while Black gains time to prepare castling.
K|Сам прорыв …d5 часто полезен в сицилианской защите. Здесь проигрывает время для развития; …exd5 остаётся легальным, и объяснять преимущество простой потерей ферзя неверно.|The ...d5 break is often useful in the Sicilian. Here its timing concedes activity; ...exd5 remains legal, so a simple queen-loss explanation would be wrong.
@morra/greedy-queen|Пешка e4 защищена ферзём|The e4 pawn is protected by the queen
C|Белые поставили ферзя на e2 именно для защиты e4 и освобождения d1.|White placed the queen on e2 precisely to protect e4 and clear d1.
M|…Nxe4 принимает центральную пешку за бесплатную, забывая прямую защиту ферзя.|...Nxe4 treats the central pawn as free, forgetting the queen's direct protection.
P|Qxe4 выигрывает коня за пешку и сохраняет давление на чёрного короля.|Qxe4 wins a knight for a pawn and maintains pressure on Black's king.
D|…Bd7 развивает слона и готовит соединение фигур, не жертвуя коня на защищённом поле.|...Bd7 develops and prepares coordination without sacrificing a knight on a defended square.
R|Rd1 занимает открытую линию; чёрные должны дальше защищать d6, но материального зевка нет.|Rd1 occupies the open file; Black still needs to defend d6 but has not blundered material.
K|После ухода ферзя с линии e защита e4 изменится. Следи за функциями фигуры, а не только её последним ходом.|After the queen leaves the e-file, e4's defence changes. Track a piece's functions, not just its last move.
@caro/bishop-trap|Отступление слона на поле ферзя|Retreating the bishop into the queen's reach
C|Конь g3 напал на слона f5; диагональ d1–e2–f3–g4 свободна.|Ng3 attacks Bf5; the d1–e2–f3–g4 diagonal is clear.
M|…Bg4 уводит слона от коня, но ставит его под ферзя d1.|...Bg4 escapes the knight but puts the bishop under Qd1's attack.
P|Qxg4 выигрывает слона: поле отхода было не менее опасным, чем исходное.|Qxg4 wins the bishop; the retreat square was no safer than the original square.
D|…Bg6 сохраняет слона на защищённой диагонали и готовит отход через h7.|...Bg6 preserves the bishop and prepares a retreat through h7.
R|h4 пытается продолжить погоню; чёрным нужно подготовить …h6, а не забыть о слоне.|h4 tries to continue the chase; Black should prepare ...h6 rather than forget the bishop.
K|Если на f3 стояла бы фигура, диагональ ферзя была бы другой. Здесь важно именно отсутствие препятствия.|With a piece on f3 the queen's diagonal would differ. The absence of a blocker is decisive here.
@caro/forgot-h7|Отступление нужно подготовить заранее|Prepare the retreat in advance
C|Слон g6 стеснён своими пешками f7 и h7; белая пешка h4 готова идти на h5.|Bg6 is restricted by f7 and h7 while White's h4 pawn is ready to advance.
M|…Nf6 развивает коня, но не создаёт слону поле h7 и допускает h5 с темпом.|...Nf6 develops a knight but fails to create h7 for the bishop, allowing h5 with tempo.
P|h5 снова нападает на слона; после …Be4 возможно Rh4, усиливая преследование.|h5 attacks the bishop again; after ...Be4, Rh4 can intensify the chase.
D|…h6 освобождает h7, чтобы слон мог отступить после h5 без потери материала.|...h6 clears h7 so the bishop can retreat after h5 without losing material.
R|Nf3 развивает белого коня; чёрные успели решить проблему слона и могут играть …Nd7.|Nf3 develops White's knight; Black has solved the bishop problem and can play ...Nd7.
K|Это опасная потеря темпа и координации, не доказательство немедленной ловли слона во всех вариантах.|This is a dangerous loss of time and coordination, not proof that the bishop is immediately trapped in every line.
@caro/smothered|Мат на d6 при связанной пешке|Mate on d6 with a pinned pawn
C|Ферзь белых стоит на e2 напротив короля e8. Пешка e7 связана по линии e и не может взять коня на d6.|White's Qe2 faces Ke8. The e7 pawn is pinned on the e-file and cannot capture a knight on d6.
M|…Ngf6 развивает не того коня и оставляет все поля вокруг короля занятыми своими фигурами.|...Ngf6 develops the wrong knight and leaves the king surrounded by its own pieces.
P|Nd6# ставит мат: e7 не может взять из-за связки, а королю некуда уйти.|Nd6# is mate: e7 cannot capture because of the pin and the king has no escape.
D|…Ndf6 освобождает d7 и перестраивает защиту так, чтобы d6 больше не давало этот мат.|...Ndf6 clears d7 and reorganises the defence so d6 no longer delivers this mate.
R|Nf3 развивает белую фигуру; чёрные могут бороться за e4, а не получают мат в один ход.|Nf3 develops a white piece; Black can fight for e4 rather than be mated in one.
K|Мат зависит от ферзя e2, пешки e7 и занятых полей отхода. Без любого из этих условий ход нужно проверить заново.|The mate depends on Qe2, e7 and occupied escape squares. Change any condition and recalculate.
@caro/ignore-knight|Конь e4 уже атакован слоном|Ne4 is already attacked by the bishop
C|…Bf5 развивает слона с нападением на коня e4; белые должны решить эту угрозу.|...Bf5 develops with an attack on Ne4; White must address that threat.
M|Nf3 развивает второго коня, оставляя первого на e4 без достаточной защиты.|Nf3 develops the other knight while leaving Ne4 without enough protection.
P|…Bxe4 выигрывает коня. Продолжение Bc4 создаёт давление, но не возвращает фигуру.|...Bxe4 wins the knight. Bc4 creates pressure but does not recover the piece.
D|Ng3 спасает атакованного коня с нападением на слона f5.|Ng3 saves the attacked knight while attacking Bf5.
R|…Bg6 сохраняет слона и приводит к обычной борьбе за его отступления.|...Bg6 preserves the bishop and leads to the normal struggle over its retreats.
K|Нельзя оценивать развивающий ход вне угроз соперника. Здесь Nf3 запаздывает именно с ответом на …Bf5.|A developing move cannot be judged apart from opposing threats. Here Nf3 fails to answer ...Bf5.
@caro/advance-chain|Пешка c2 не бесплатна|The c2 pawn is not free
C|В варианте продвижения слон f5 смотрит на c2, но ферзь белых d1 тоже защищает это поле.|In the Advance, Bf5 sees c2 but Qd1 also protects that square.
M|…Bxc2 берёт фланговую пешку, забывая возможность Qxc2.|...Bxc2 takes a flank pawn while overlooking Qxc2.
P|Qxc2 выигрывает слона за пешку и сохраняет белым центральное пространство.|Qxc2 wins the bishop for a pawn while keeping White's central space.
D|…cxd4 подрывает основание пешечной цепи, решая центральную задачу вместо охоты за c2.|...cxd4 undermines the pawn chain's base instead of chasing c2.
R|Nxd4 возвращает пешку конём; чёрные могут продолжить размены на d4, сохраняя материал.|Nxd4 recaptures with a knight; Black can continue exchanges on d4 while keeping material.
K|Слон активен на f5, но дальняя диагональ не делает любую пешку на ней беззащитной.|Bf5 is active, but a long diagonal does not make every pawn on it undefended.
@caro/panov-pin|После размена слон всё ещё на d3|After the exchange the bishop is still on d3
C|Чёрные только что сыграли …Bxd3; слон на d3 может взять e2 по диагонали.|Black has just played ...Bxd3; the bishop on d3 can capture e2 diagonally.
M|Qe2 готовит развитие ферзя, но встаёт прямо под оставленного слона d3.|Qe2 prepares queen development but moves directly into Bd3's attack.
P|…Bxe2 забирает ферзя; Kxe2 вернёт только слона и лишит короля рокировки.|...Bxe2 takes the queen; Kxe2 recovers only a bishop and removes castling rights.
D|Qxd3 немедленно возвращает слона и готовит длинную рокировку без потери ферзя.|Qxd3 immediately recaptures and prepares queenside castling without losing the queen.
R|…e6 укрепляет центр, а белый ферзь остаётся активным на d3; чёрные должны продолжать нормальную игру.|...e6 reinforces the centre while White's queen remains active on d3; Black must continue normal play.
K|Ошибка возможна только пока слон d3 не снят с доски. После любого взятия обновляй мысленную расстановку.|The error exists only while Bd3 remains on the board. Update the position mentally after every capture.
`;
