import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, open, rename, unlink } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, win32 } from "node:path";

export type Artifact = { url: string; sha256: string; size: number };
export function safePackPath(base: string, child: string) {
  if (!child || isAbsolute(child) || win32.isAbsolute(child))
    throw Error("invalid_pack_path");
  const result = resolve(base, child),
    rel = relative(resolve(base), result);
  if (
    !rel ||
    rel === ".." ||
    rel.startsWith("../") ||
    rel.startsWith("..\\") ||
    isAbsolute(rel)
  )
    throw Error("invalid_pack_path");
  return result;
}
export async function sha256(file: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
/** A partial is reusable only for the same immutable asset (caller uses hash-addressed cache). */
export async function verifiedDownload(
  asset: Artifact,
  file: string,
  signal: AbortSignal,
  progress: (bytes: number) => void,
  fetcher: typeof fetch = fetch,
) {
  if (!/^https:\/\//.test(asset.url) || !/^[a-f0-9]{64}$/.test(asset.sha256))
    throw Error("invalid_pack_asset");
  signal.throwIfAborted();
  await mkdir(dirname(file), { recursive: true });
  if (await stat(file).catch(() => null)) {
    if ((await sha256(file)) === asset.sha256) {
      progress((await stat(file)).size);
      return;
    }
    await unlink(file);
  }
  const partial = file + ".part",
    limit = asset.size || 1024 * 1024 * 1024;
  let received = (await stat(partial).catch(() => null))?.size ?? 0;
  if (
    received === asset.size &&
    asset.size > 0 &&
    (await sha256(partial)) === asset.sha256
  ) {
    await rename(partial, file);
    progress(received);
    return;
  }
  if (received >= limit) {
    await unlink(partial);
    received = 0;
  }
  const response = await fetcher(asset.url, {
    signal,
    headers: received ? { Range: `bytes=${received}-` } : {},
  });
  if (!response.ok || !response.body)
    throw Error(`download_http_${response.status}`);
  if (response.status === 206) {
    const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(
      response.headers.get("Content-Range") ?? "",
    );
    if (
      !range ||
      Number(range[1]) !== received ||
      (asset.size && Number(range[3]) !== asset.size)
    )
      throw Error("invalid_download_range");
  } else received = 0;
  const output = await open(partial, received ? "a" : "w");
  try {
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      signal.throwIfAborted();
      received += chunk.byteLength;
      if (received > limit) throw Error("download_too_large");
      await output.write(chunk);
      progress(received);
    }
    await output.sync();
  } finally {
    await output.close();
  }
  signal.throwIfAborted();
  if (
    (asset.size && received !== asset.size) ||
    (await sha256(partial)) !== asset.sha256
  ) {
    await unlink(partial);
    throw Error("download_checksum_mismatch");
  }
  await rename(partial, file);
}
