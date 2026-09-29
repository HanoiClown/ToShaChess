"""Local JSON-lines interface to the pinned official Maia-3 model.

No network access is needed; weights are verified before loading with the
upstream tensor-only loader. Scores are deliberately not sent as engine CP.
"""
import argparse
import hashlib
import json
import os
import pathlib
import sys
import time

MODEL_HASHES = {
    "maia3-5m": "ba14208b2992d85502f5fb501934abf6aaaeb355e9f3fdf90e326911f562524f",
    "maia3-23m": "bce6cd1af5f0399ac7eed33fabb7a6a2ef6193662c2740f262bf93af7bfb3569",
    "maia3-79m": "3fc6181d5db789b45a15305732148757ae74efa3e0028e81ba335b462dac45c2",
}
VERSION = "1e13597c42d4858b7cfd7cfdae01e297263364b2"

def emit(value):
    print(json.dumps(value, ensure_ascii=True), flush=True)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--pack", required=True)
    p.add_argument("--model", default="maia3-5m", choices=list(MODEL_HASHES))
    p.add_argument("--device", default="cpu", choices=["cpu", "cuda"])
    args = p.parse_args()
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    started = time.monotonic()
    checkpoint = pathlib.Path(args.pack).resolve() / "models" / (args.model + ".pt")
    if not checkpoint.is_file():
        raise ValueError("maia_model_missing")
    with checkpoint.open("rb") as f:
        digest = hashlib.file_digest(f, "sha256").hexdigest()
    if digest != MODEL_HASHES[args.model]:
        raise ValueError("maia_model_corrupt")
    import torch
    import chess
    from maia3.uci import parse_args, Maia3UCIEngine
    torch.set_num_threads(2)
    cfg = parse_args(["--model", args.model, "--checkpoint-path", str(checkpoint),
                      "--device", args.device, "--no-use-amp", "--use-uci-history",
                      "--local-files-only"])
    engine = Maia3UCIEngine(cfg)
    engine.ensure_model_loaded()
    emit({"type": "ready", "modelId": args.model, "version": VERSION,
          "startupMs": round((time.monotonic()-started)*1000)})
    for raw in sys.stdin:
        request_id = None
        try:
            if len(raw) > 100000:
                raise ValueError("request_too_large")
            data = json.loads(raw)
            request_id = data.get("id")
            if not isinstance(request_id, str) or len(request_id) > 100 or data.get("op") != "predict":
                raise ValueError("invalid_request")
            position = data["position"]
            fen, moves = position["initialFen"], position["moves"]
            if not isinstance(fen, str) or len(fen) > 160 or not isinstance(moves, list) or len(moves) > 4000:
                raise ValueError("invalid_position")
            board = chess.Board(fen)
            if not board.is_valid():
                raise ValueError("invalid_position")
            for move in moves:
                if not isinstance(move, str):
                    raise ValueError("invalid_move")
                board.push_uci(move)
            for key in ("selfElo", "opponentElo"):
                if type(data[key]) is not int or not 600 <= data[key] <= 2600:
                    raise ValueError("maia_rating_range")
            engine.self_elo = data["selfElo"]
            engine.oppo_elo = data["opponentElo"]
            engine.cmd_position("position fen " + fen + (" moves " + " ".join(moves) if moves else ""))
            # score_moves returns raw policy probabilities; request all legal
            # candidates rather than normalising a truncated top-k list.
            engine.multipv = board.legal_moves.count()
            started = time.monotonic()
            _, candidates = engine.score_moves()
            emit({"id": request_id, "type": "prediction",
                  "candidates": [{"uci": item["move"].uci(), "probability": item["policy"]} for item in candidates],
                  "elapsedMs": round((time.monotonic()-started)*1000)})
        except Exception as error:
            emit({"id": request_id, "type": "error", "message": str(error)[:400]})

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit({"type": "error", "message": str(error)[:400]})
        raise SystemExit(1)
