import type { GameRecord, Position } from "../shared/contracts";
import { boardAt, playUci } from "../chess/game";
/** One position for the board, material count, studies and every analysis provider. */
export function reviewPosition(game: GameRecord, ply: number, variant: number|null): Position {
  const position={initialFen:game.initialFen,moves:game.moves.slice(0,variant===null?ply:Math.max(0,ply-1))};
  if(variant!==null){
    const board=boardAt(position),analysis=game.analysis.find(a=>a.ply===ply);
    for(const move of analysis?.before.pv.slice(0,variant)??[]){try{playUci(board,move);position.moves.push(move);}catch{break;}}
  }
  return position;
}
