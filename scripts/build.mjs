import { build } from "esbuild";
import { copyFile } from "node:fs/promises";
import { build as viteBuild } from "vite";
await viteBuild();
await build({
  entryPoints: ["src/electron/main.ts"],
  outfile: "dist/electron/main.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  external: ["electron", "sharp"],
  banner: { js: "// DesiCast desktop main process" },
});
await copyFile("assets/trayTemplate.png", "dist/electron/trayTemplate.png");
await copyFile("assets/trayTemplate@2x.png", "dist/electron/trayTemplate@2x.png");
await build({
  entryPoints: ["src/electron/preload.ts"],
  outfile: "dist/electron/preload.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
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
