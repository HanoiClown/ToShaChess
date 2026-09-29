import { expect, test } from "vitest";
import { gameAccuracy, moveAccuracy } from "../../src/analysis/accuracy";
import { newGame } from "../../src/chess/game";
test("accuracy measures expected-result loss from the moving side", () => {
  expect(moveAccuracy({ cp: 0, mate: null }, { cp: 0, mate: null }, "w")).toBe(
    100,
  );
  expect(
    moveAccuracy({ cp: 0, mate: null }, { cp: -30000, mate: -1 }, "w"),
  ).toBe(50);
  expect(moveAccuracy({ cp: 0, mate: null }, { cp: 30000, mate: 1 }, "b")).toBe(
    50,
  );
  expect(
    moveAccuracy({ cp: 30000, mate: 11 }, { cp: 30000, mate: 15 }, "w"),
  ).toBe(100);
});
test("empty and provisional games never report final accuracy", () => {
  const g = newGame("test", "Test", "w", "training", 0, 0, 1);
  expect(gameAccuracy(g)).toMatchObject({
    w: { value: null, total: 0 },
    b: { value: null, total: 0 },
    complete: false,
  });
  g.moves = ["e2e4"];
  g.result = "1-0";
  const line = { score: { cp: 0, mate: null }, depth: 16, pv: ["e2e4"] };
  g.analysis = [
    {
      ply: 1,
      before: line,
      after: line,
      best: "e2e4",
      quality: "best",
      loss: 0,
      provisional: true,
    },
  ];
  expect(gameAccuracy(g).complete).toBe(false);
  g.analysis[0].provisional = false;
  expect(gameAccuracy(g)).toMatchObject({
    w: { value: 100, analyzed: 1, total: 1 },
    complete: true,
  });
});
test("play-from accuracy excludes the preserved lesson history",()=>{
  const g=newGame("test","Test","w","training",0,0,1);
  g.moves=["e2e4","e7e5","g1f3"];g.startPly=2;g.result="1-0";
  const line={score:{cp:0,mate:null},depth:16,pv:["g1f3"]};
  g.analysis=[{ply:3,before:line,after:line,best:"g1f3",quality:"best",loss:0,provisional:false}];
  expect(gameAccuracy(g)).toMatchObject({w:{value:100,total:1,analyzed:1},b:{total:0,value:null},complete:true});
});
