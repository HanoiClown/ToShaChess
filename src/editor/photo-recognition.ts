import {
  recognizeGray,
  extractTiles,
  rgbaToGray,
  probsToPlacement,
  resolveOrientation,
  type BoardCorners,
} from "@scoriiu/fenshot";
import * as ort from "onnxruntime-web/wasm";
import modelUrl from "@scoriiu/fenshot/model/chess-tiles-v2.onnx?url";
import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import mjsUrl from "onnxruntime-web/ort-wasm-simd-threaded.mjs?url";

// Bundled assets only: no CDN, API key, image uploads or model downloads.
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths = { wasm: wasmUrl, mjs: mjsUrl };
let session: Promise<ort.InferenceSession> | undefined;
let pending: Promise<unknown> = Promise.resolve();
export async function recognizeBoard(data: ImageData, crop?: BoardCorners) {
  // A cancelled UI request can still be finishing in WASM. Serialize native
  // session access so a replacement image never starts an overlapping run.
  const job = pending.then(() => recognize(data, crop));
  pending = job.catch(() => undefined);
  return job;
}
async function recognize(data: ImageData, crop?: BoardCorners) {
  session ??= ort.InferenceSession.create(modelUrl, {
    executionProviders: ["wasm"],
  }).catch((e) => {
    session = undefined;
    throw e;
  });
  const net = await session;
  const gray = rgbaToGray(data.data, data.width, data.height);
  const classify = async (corners: BoardCorners) => {
    const input = new ort.Tensor(
      "float32",
      extractTiles(gray, corners),
      [64, 1024],
    );
    const out = await net.run({ tiles: input });
    try {
      return probsToPlacement(out.probs.data as Float32Array);
    } finally {
      input.dispose();
      Object.values(out).forEach((t) => t.dispose());
    }
  };
  const result = crop
    ? { ...(await classify(crop)), corners: crop }
    : await recognizeGray(gray, classify);
  if (!result) return null;
  return {
    ...result,
    reliable: result.minConfidence >= 0.7,
    orientation: resolveOrientation(result.placement).orientation,
  };
}
