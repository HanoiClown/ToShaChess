import { build } from "esbuild";
await build({ entryPoints:["electron/library-worker.ts"], bundle:true,platform:"node",target:"node24",format:"cjs",outfile:"dist-electron/library-worker.cjs" });
await build({
  entryPoints: ["electron/main.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: "dist-electron/main.cjs",
  external: ["electron"],
});
await build({
  entryPoints: ["electron/preload.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: "dist-electron/preload.cjs",
  external: ["electron"],
});
