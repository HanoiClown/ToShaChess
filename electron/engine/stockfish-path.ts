/** File name of the bundled Stockfish binary inside the `stockfish` folder. */
export function stockfishBinary(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
) {
  if (platform === "win32") return "stockfish-windows-x86-64-universal.exe";
  return `stockfish-linux-${arch === "x64" ? "x86-64" : arch}-universal`;
}
