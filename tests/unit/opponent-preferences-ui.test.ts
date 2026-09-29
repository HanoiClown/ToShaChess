import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Play } from "../../src/screens/Play";
import { AppContext } from "../../src/ui/context";
import { profileDatabase } from "../helpers/profile-fixtures";
import { newGame } from "../../src/chess/game";
import type { Database } from "../../src/shared/contracts";

function render(database: Database, id: string) {
  return renderToStaticMarkup(
    createElement(
      AppContext.Provider,
      {
        value: {
          profile: database.profiles.find((p) => p.id === id)!,
          locale: "en",
          snapshot: {
            database,
            activeProfile: id,
            hasKey: false,
            keyIssue: false,
            dataPath: "test",
            analysisJobs: [],
            notice: null,
          },
          nav: () => {},
          refresh: async () => {},
          fail: () => {},
          reviewId: null,
          playFrom: () => {},
        },
      },
      createElement(Play),
    ),
  );
}

it("initializes the new-game form for the selected profile and preserves a resumed game's opponent", () => {
  const database = profileDatabase();
  database.profiles[0].opponent = {
    provider: "maia",
    botId: "spark",
    color: "b",
    maia: {
      pack: "maia-23m",
      selfElo: 1500,
      opponentElo: 900,
      temperature: 1.3,
    },
  };
  const ownForm = render(database, "hanoi");
  expect(ownForm).toMatch(/<option[^>]*value="maia"[^>]*selected/);
  expect(ownForm).toContain('value="1500"');
  expect(ownForm).toContain('value="900"');
  expect(ownForm).toContain('<button class="active">Black</button>');
  const otherForm = render(database, "sister");
  expect(otherForm).toMatch(/<option[^>]*value="stockfish"[^>]*selected/);
  expect(otherForm).toContain(
    'aria-pressed="true"><img src="./bots/pixel.svg"',
  );
  const game = newGame("hanoi", "Player", "w", "training", 0, 0, 1);
  game.botId = "pixel";
  game.moves = ["e2e4", "e7e5"];
  database.games.push(game);
  const resumed = render(database, "hanoi");
  expect(resumed).toContain("Resume game");
  expect(resumed).toContain("<strong>Pixel</strong>");
  expect(resumed).not.toContain("Maia-3</strong>");
});
