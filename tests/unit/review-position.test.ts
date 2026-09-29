import {it,expect} from "vitest";
import {parseGames} from "../../src/chess/game";
import {reviewPosition} from "../../src/analysis/review-position";
it("exploration uses the displayed best variation while preserving the game",()=>{
  const [game]=parseGames("1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? 4.Qxf7# 1-0","owner");
  const line={score:{cp:0,mate:null},pv:["g7g6","h5f3"],depth:16};
  game.analysis=[{ply:6,before:line,after:line,best:"g7g6",quality:"blunder",loss:400,provisional:false}];
  expect(reviewPosition(game,6,null).moves.at(-1)).toBe("g8f6");
  expect(reviewPosition(game,6,1).moves.at(-1)).toBe("g7g6");
  expect(reviewPosition(game,6,2).moves.slice(-2)).toEqual(["g7g6","h5f3"]);
  expect(game.moves[5]).toBe("g8f6");
});
