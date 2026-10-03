import { build } from "esbuild";
import { createServer } from "vite";
import { spawn } from "node:child_process";
import electron from "electron";
await build({
  entryPoints: ["src/electron/main.ts"],
  outfile: "dist/electron/main.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  external: ["electron", "sharp"],
});
await build({
  entryPoints: ["src/electron/preload.ts"],
  outfile: "dist/electron/preload.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron"],
});
await build({
  entryPoints: ["src/mcp/server.ts"],
  outfile: "dist/mcp/server.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  external: ["sharp"],
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
});
const server = await createServer();
await server.listen();
const env = { ...process.env, DESICAST_DEV_URL: "http://127.0.0.1:5173" };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, ["."], { stdio: "inherit", env });
child.on("exit", async () => {
  await server.close();
  process.exit(0);
});
process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());
