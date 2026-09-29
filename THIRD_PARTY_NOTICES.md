# Third-party notices

## Offline screenshot recognition

@scoriiu/fenshot 0.1.4 — SORTINO LABS S.R.L. (coachess.app), MIT. Source and training pipeline: https://github.com/scoriiu/fenshot . The npm package supplies the chess-tiles-v2.onnx classifier, bundled into the built app (SHA-256: 883f6a8e639e6d6b6399b3fda0508ad772e3c6f9cefa2e678a13f27b9fa6248d). Its board detector credits Elucidation/tensorflow_chessbot (MIT). Upstream training uses synthetic boards across several piece sets; training images are not included here. Full license: licenses/fenshot-MIT.txt. The source export supplies a pinned npm dependency; building includes the model locally without a runtime download.

ONNX Runtime Web 1.26.0 — Microsoft Corporation and contributors, MIT. Source: https://github.com/microsoft/onnxruntime/tree/v1.26.0 . Local WASM CPU runtime, single thread, no CDN. Full license and upstream third-party notices: licenses/onnxruntime-MIT.txt and licenses/onnxruntime-ThirdPartyNotices.txt.

Uploaded images are processed in memory and are not saved in profiles, studies, backups or telemetry. Only a user-confirmed chess position and its chosen variations can be saved.

## Chess engines, libraries and data

The optional extended offline pack uses the Lichess puzzle database and standard rated game archive, both CC0: https://database.lichess.org/ . Its generated manifest records source URLs, sizes, counts, checksums and validation scope. These public archives are downloaded separately, without copying the user's private games or saved profiles into the distribution.

Stockfish 19 — the Stockfish developers, GPL-3.0. Supplied executable, complete accompanying source, AUTHORS and Copying.txt are included under resources/stockfish. https://stockfishchess.org/

Cburnett chess pieces — Colin M. L. Burnett. Source: https://github.com/lichess-org/lila/tree/master/public/piece/cburnett . Listed as GPL-2.0-or-later in Lichess COPYING.md; original Wikimedia pieces also carry CC BY-SA 3.0. Unmodified SVGs included with attribution under the GPL option.

chess.js — Jeff Hlywa and contributors, BSD-2-Clause.
React — Meta and contributors, MIT. Electron — OpenJS and contributors, MIT.
Lucide icons — ISC. Nunito Sans — SIL Open Font License 1.1 (fontsource package).
Zod — MIT. Full direct dependency licenses are included under resources/licenses. Electron/Chromium notices are included beside the executable. The application's GPL-3.0 text is included as LICENSE. Chess-piece GPL-2.0-or-later works may be combined under GPL-3.0.

Lichess puzzle database — CC0, https://database.lichess.org/ . This app includes a filtered 30,000-position subset. Lichess chess-openings — CC0, https://github.com/lichess-org/chess-openings . Includes 3,815 named opening lines. Import provenance and hashes are recorded in src/content/library-manifest.json in the source distribution.

This open-source application is independently implemented. It is not affiliated with Chess.com or Lichess. Chess.com is the user's chosen visual reference. Introductory lessons are authored for this project; users may import their own games locally.

## Optional engines and portable runtime

Maia-3 — CSSLab / University of Toronto Computational Social Science Lab. Source version 0.1.0, commit 1e13597c42d4858b7cfd7cfdae01e297263364b2: https://github.com/CSSLab/maia3 . The upstream source license is GNU AGPL v3; its full text is licenses/maia3-AGPL-3.0.txt. Pinned official 5M, 23M and 79M model cards are retained as licenses/maia3-*-model-card.md. They identify CC BY 4.0 for the paper and refer to the repository for code/weights terms. The paper license must not be substituted for model terms. Authors and paper citation are retained in the cards. Download revisions and checksums are in electron/packs/manifest.ts.

Python 3.13.15 Windows embedded runtime — Python Software Foundation and contributors, PSF license and additional notices; verbatim LICENSE.txt is licenses/python-3.13.15.txt. Source and release: https://www.python.org/ftp/python/3.13.15/ . Python dependencies retain their upstream notices under licenses/python-runtime/ (copied from the checksum-pinned installed distribution metadata). This includes PyTorch 2.14.0+cpu, NumPy 2.5.3 and python-chess 1.999 / chess 1.11.2. python-chess is GPL-3.0-or-later. Individual dependency terms remain authoritative; they are not all covered by Python's PSF license. Exact sources, versions and hashes are in scripts/maia-lock.json.

Lc0 0.32.1 — Leela Chess Zero contributors, engine GPL-3.0-or-later: https://github.com/LeelaChessZero/lc0/tree/v0.32.1 . The optional installer points to the official Windows CPU DNNL release. That ZIP contains 791556.pb.gz; its distinct network license has not been established by this project. The application's public source distribution includes the loader, not the runtime archive or network weights. A user's explicit network selection does not imply that its license is the engine's GPL. Redistributors must retain the applicable upstream source/notices for any separately redistributed engine and establish rights for its chosen weights.

Syzygy table files — Ronald de Man; upstream expressly permits free redistribution of generated tablebase files: https://github.com/syzygy1/tb#terms-of-use . Exact upstream terms are copied in licenses/syzygy-terms.txt. The generator source's GPL-2.0-only terms are distinct from the table-file permission; this app does not bundle that generator. The 3–5-piece file manifest uses https://github.com/niklasf/syzygy-tables.info at commit 9d79edb273faa1217760b53ed0df642ee8596896. Local probing uses python-chess and its GPL-3.0-or-later license.

## Authored teaching material

The bilingual course explanations, critical notes and teaching selections are original ToShaChess material under the application's GPL-3.0-or-later license. Embedded illustrative game scores come from the public Lichess CC0 archive and retain direct game source URLs. CC0 game/opening data does not grant permission to copy other users' study comments, paid lessons or third-party annotations. Such text is not included in this editorial corpus.
