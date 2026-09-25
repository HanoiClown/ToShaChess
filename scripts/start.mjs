import { spawn } from "node:child_process";
import electron from "electron";
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const app = spawn(electron, ["."], {
  env,
  stdio: "inherit",
  windowsHide: true,
});
app.on("exit", (code) => process.exit(code ?? 0));
