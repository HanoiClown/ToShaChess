# Authoring courses and studies

## Data contract

Read [the content README](../src/content/course-library/README.md) and src/library/courses.ts before editing. Sources live in src/content/course-library/; src/content/courses.ts assembles them. Keep established course/chapter IDs so existing progress remains meaningful. Current six chapter IDs are ideas, main, replies, traps, defence and plans. These must teach different tasks, not duplicate a line to meet a count.

An authored path has an introductory RU/EN text and explicit steps. The helper converts legal SAN into stored UCI moves; it must never invent explanations. A step row is SAN | Russian explanation | English explanation, with optional longer bilingual details. Explain what changed, why this move addresses the position, and the opponent's relevant resource. Shared opening prefixes may share text only for the same position.

Branches use an absolute atPly from the chapter's initial position. Their notes/details use absolute path plies too. Recursive branches follow the same convention. Episode notes use local plies from episode.initialFen. That FEN is BEFORE the mistake: line[0] is the error, line[1] is its punishment; defence starts with a better choice by the same side. Trap practice uses the opposite colour to the FEN turn; defence practice uses the FEN turn. Include title, conditions, risk, exact lines, full bilingual notes and source provenance.

Minimal authoring example (SAN helper, not a complete course):

```ts
steps(`
Nf3|Конь контролирует h4 и усиливает давление на e5.|The knight controls h4 and adds pressure to e5.
`);
```

## Editorial evidence

- Replay every mainline, branch, defence and example game with chess.js from its exact FEN. Legal moves alone do not prove a tactic.
- Test both sides of a claim: the alleged error and the best defence found. Record engine version, search settings, position, scores and continuation. Keep mate scores distinct from centipawn values.
- Explain geometric claims on the actual board. A pawn's departure may open a rank rather than a diagonal; a recapture may keep a file blocked. Verify every claimed pin, fork, hanging piece and material count.
- Use a sufficient forcing continuation for a claimed win. A moderate evaluation loss is a positional error, not a forced material win. A finite search cannot establish uniqueness of a defensive move.
- Translate the chess meaning in both languages. Every authored move needs its own causal note; generic development text or generated move-number templates are insufficient. Critical decisions need alternatives, risks and what changes after the reply.
- Preserve direct URLs, license terms and selection criteria. Lichess public game/opening data is CC0; user study prose is not automatically covered. Write original annotations; do not copy paid lessons or user comments without permission. Real practical games are not necessarily master models.

Run npm test -- tests/unit/course-editorial.test.ts tests/unit/courses.test.ts, npm run typecheck and npm run verify:content. For the current tactical corpus, node --import tsx src/content/course-library/deep-check.ts repeats the longer local Stockfish audit. Review every changed PV against its prose before replacing frozen evidence. check-episodes.ts writes candidate output separately for this reason.

The existing 48-episode corpus has 48 distinct starting positions, both error colours in each course and a second engine audit. Search scores support the stated practical advantage; they do not prove that every shorter demonstration contains the full conversion. See content-report.md in the local development evidence directory for the recorded run.

## Русский: правила для автора

Сохраняйте устойчивые идентификаторы курса и глав. Проверяйте все ходы из точной исходной позиции; легальность не доказывает выигрыш. Для ошибки проверяйте и наказание, и защиту соперника, записывая версию движка и параметры поиска. Не называйте небольшой позиционный перевес форсированным выигрышем.

Пояснение каждого хода должно быть написано для данной позиции на русском и английском. Проверяйте диагонали, линии, поля нападения пешек и баланс материала непосредственно на доске. У ключевого решения объясняйте альтернативу и риск. Укажите происхождение партий и лицензии; собственный текст проекта распространяется по лицензии репозитория, а лицензия базы не распространяется автоматически на чужие комментарии.
