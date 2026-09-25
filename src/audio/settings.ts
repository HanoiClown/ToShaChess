import type { Database } from "../shared/contracts";

// Serialize partial changes across screen remounts. Reading immediately before
// each write prevents a volume drag from restoring an old budget or engine level.
let pending: Promise<unknown> = Promise.resolve();
export function saveSettingsPatch(patch: Partial<Database["settings"]>) {
  const result = pending.then(async () => {
    const latest = await window.chessApp.snapshot();
    return window.chessApp.updateSettings({
      ...latest.database.settings,
      ...patch,
    });
  });
  pending = result.catch(() => {});
  return result;
}
