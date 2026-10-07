import { build } from "esbuild";
import { createServer } from "vite";
import { spawn } from "node:child_process";
import { copyTrayAssets } from "./tray-assets.mjs";
import electron from "electron";
import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prepareDevApp, devAppLaunchArgs } from "./dev-app.mjs";
await build({
  entryPoints: ["src/electron/main.ts"],
  outfile: "dist/electron/main.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  external: ["electron", "sharp"],
});
await copyTrayAssets();
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
const server = await createServer({ server: { strictPort: false } });
await server.listen();
const devUrl = server.resolvedUrls?.local[0];
if (!devUrl) {
  await server.close();
  throw new Error("无法确定开发服务地址");
}
console.log(`DesiCast 开发服务：${devUrl}`);
const env = { ...process.env, DESICAST_DEV_URL: devUrl };
delete env.ELECTRON_RUN_AS_NODE;
let child;
const session = randomUUID();
const sessionFile = resolve(".work/dev/session.json");
try {
  if (process.platform === "darwin") {
    const app = await prepareDevApp(electron, process.cwd());
    await mkdir(resolve(".work/dev"), { recursive: true });
    env.DESICAST_DEV_SESSION = session;
    env.DESICAST_DEV_SESSION_FILE = sessionFile;
    console.log(`DesiCast 独立开发应用：${app}`);
    console.log(
      "主进程日志：.work/dev/main.stdout.log 与 .work/dev/main.stderr.log",
    );
    child = spawn("/usr/bin/open", devAppLaunchArgs(app, process.cwd(), env), {
      stdio: "inherit",
    });
  } else {
    child = spawn(electron, ["."], { stdio: "inherit", env });
  }
} catch (error) {
  await server.close();
  throw error;
}
async function stop() {
  if (process.platform === "darwin") {
    try {
      const value = JSON.parse(await readFile(sessionFile, "utf8"));
      if (value.session === session && Number.isSafeInteger(value.pid))
        process.kill(value.pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ESRCH")
        console.error(error.message);
    }
  }
  child.kill();
  await server.close();
}
child.on("error", async (error) => {
  console.error(error.message);
  await stop();
  process.exitCode = 1;
});
child.on("exit", async (code) => {
  await server.close();
  process.exitCode = code ?? 0;
});
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
