import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { promisify } from "node:util";
import { createRequire } from "node:module";

const electron = createRequire(import.meta.url)("electron") as string;

const run = promisify(execFile);
const helper = () =>
  import(new URL("../scripts/dev-app.mjs", import.meta.url).href);

test("development launch uses LaunchServices and passes only application environment", async () => {
  const { devAppLaunchArgs } = await helper();
  const args = devAppLaunchArgs(
    "/tmp/DesiCast Dev.app",
    "/tmp/project with spaces",
    {
      DESICAST_DEV_URL: "http://127.0.0.1:5178/",
      DESICAST_TEST_MODE: "1",
      DESICAST_DATA_DIR: "/tmp/custom data",
      ELECTRON_RUN_AS_NODE: "1",
      SECRET_TOKEN: "private",
    },
  );
  assert.deepEqual(args, [
    "-n",
    "-W",
    "-a",
    "/tmp/DesiCast Dev.app",
    "--stdout",
    "/tmp/project with spaces/.work/dev/main.stdout.log",
    "--stderr",
    "/tmp/project with spaces/.work/dev/main.stderr.log",
    "--env",
    "ELECTRON_RUN_AS_NODE=",
    "--env",
    "DESICAST_DEV_URL=http://127.0.0.1:5178/",
    "--env",
    "DESICAST_TEST_MODE=1",
    "--env",
    "DESICAST_DATA_DIR=/tmp/custom data",
    "--args",
    "/tmp/project with spaces",
  ]);
});

test(
  "macOS development runtime has its own verified identity without modifying Electron",
  { skip: process.platform !== "darwin" },
  async () => {
    const { prepareDevApp, devAppId } = await helper();
    const original = resolve(electron, "../../Info.plist");
    const before = await readFile(original);
    const app = await prepareDevApp(electron, process.cwd());
    const { stdout } = await run("/usr/libexec/PlistBuddy", [
      "-c",
      "Print :CFBundleIdentifier",
      join(app, "Contents/Info.plist"),
    ]);
    assert.equal(stdout.trim(), devAppId);
    for (const name of await readdir(join(app, "Contents/Frameworks"))) {
      if (!name.endsWith(".app")) continue;
      assert.ok(name.startsWith("DesiCast Dev Helper"));
      const plist = join(
        app,
        "Contents/Frameworks",
        name,
        "Contents/Info.plist",
      );
      const { stdout: executable } = await run("/usr/libexec/PlistBuddy", [
        "-c",
        "Print :CFBundleExecutable",
        plist,
      ]);
      await access(
        join(
          app,
          "Contents/Frameworks",
          name,
          "Contents/MacOS",
          executable.trim(),
        ),
      );
      const { stdout: identifier } = await run("/usr/libexec/PlistBuddy", [
        "-c",
        "Print :CFBundleIdentifier",
        plist,
      ]);
      assert.ok(identifier.trim().startsWith(`${devAppId}.helper`));
    }
    await run("/usr/bin/codesign", ["--verify", "--deep", "--strict", app]);
    // Node mode verifies the renamed executable without a GUI or a status item
    const { stdout: version } = await run(
      join(app, "Contents/MacOS/DesiCast Dev"),
      ["--eval", "process.stdout.write(process.versions.electron)"],
      { env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" } },
    );
    assert.match(version, /^\d+\.\d+\.\d+$/);
    assert.deepEqual(await readFile(original), before);
    assert.equal(await prepareDevApp(electron, process.cwd()), app);
  },
);
