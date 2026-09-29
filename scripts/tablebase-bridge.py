"""Probe user-installed Syzygy tables; output WDL/DTZ, never distance to mate."""
import argparse
import json
import sys

import chess
import chess.syzygy


def adjusted(tablebase, board):
    if board.is_checkmate():
        return -2, 0
    if board.is_stalemate() or board.is_insufficient_material() or board.is_repetition(3) or board.halfmove_clock >= 100:
        return 0, 0
    wdl, dtz = tablebase.probe_wdl(board), tablebase.probe_dtz(board)
    # WDL is usually probed with a fresh halfmove clock. Preserve cursed-win /
    # blessed-loss categories when the current clock leaves too little time.
    if abs(wdl) == 2 and abs(dtz) + board.halfmove_clock > 100:
        wdl = 1 if wdl > 0 else -1
    return wdl, dtz


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--tables', required=True)
    args = parser.parse_args()
    raw = sys.stdin.readline(100000)
    data = json.loads(raw)
    board = chess.Board(data['initialFen'])
    if not board.is_valid() or len(data['moves']) > 4000:
        raise ValueError('invalid_position')
    for move in data['moves']:
        board.push_uci(move)
    if chess.popcount(board.occupied) > 5 or board.castling_rights:
        raise ValueError('unsupported_position')
    try:
        with chess.syzygy.open_tablebase(args.tables) as tablebase:
            wdl, dtz = adjusted(tablebase, board)
            moves = []
            for move in list(board.legal_moves):
                board.push(move)
                child_wdl, child_dtz = adjusted(tablebase, board)
                board.pop()
                moves.append({'uci': move.uci(), 'wdl': -child_wdl, 'dtz': -child_dtz})
            moves.sort(key=lambda move: (-move['wdl'], abs(move['dtz']), move['uci']))
            print(json.dumps({'status': 'available', 'wdl': wdl, 'dtz': dtz, 'moves': moves,
                              'canClaimFiftyMoves': board.can_claim_fifty_moves()}))
    except chess.syzygy.MissingTableError:
        print(json.dumps({'status': 'missing', 'reason': 'missing_table'}))


if __name__ == '__main__':
    main()
