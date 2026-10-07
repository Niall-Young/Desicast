import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { promisify } from "node:util";

const run = promisify(execFile);
export const devAppId = "com.niallyoung.desicast.dev";
const devAppName = "DesiCast Dev";

async function setPlist(plist, key, value) {
  try {
    await run("/usr/libexec/PlistBuddy", ["-c", `Set :${key} ${value}`, plist]);
  } catch {
    await run("/usr/libexec/PlistBuddy", [
      "-c",
      `Add :${key} string ${value}`,
      plist,
    ]);
  }
}

export async function prepareDevApp(electronPath, projectRoot) {
  const root = resolve(projectRoot);
  // Desktop/iCloud file-provider metadata can invalidate a generated signature
  const workspaceId = createHash("sha256")
    .update(root)
    .digest("hex")
    .slice(0, 16);
  const output = join(homedir(), "Library/Caches/DesiCast/dev", workspaceId);
  const app = join(output, "DesiCast Dev.app");
  const source = resolve(dirname(electronPath), "../..");
  const icon = join(root, "assets/icon.icns");
  const fingerprint = createHash("sha256")
    .update(await readFile(join(source, "Contents/Info.plist")))
    .update(await readFile(icon))
    .update(await readFile(new URL(import.meta.url)))
    .update(source)
    .digest("hex");
  try {
    if (
      (await readFile(join(output, "runtime.sha256"), "utf8")) === fingerprint
    ) {
      await run("/usr/bin/codesign", ["--verify", "--deep", "--strict", app]);
      return app;
    }
  } catch {
    // Missing or invalid caches are rebuilt without modifying node_modules
  }
  await mkdir(output, { recursive: true });
  const temporary = join(output, "DesiCast Dev.pending.app");
  await rm(temporary, { recursive: true, force: true });
  try {
    await run("/usr/bin/ditto", ["--norsrc", "--noextattr", source, temporary]);
    const plist = join(temporary, "Contents/Info.plist");
    for (const [key, value] of [
      ["CFBundleIdentifier", devAppId],
      ["CFBundleName", devAppName],
      ["CFBundleDisplayName", devAppName],
      ["CFBundleExecutable", devAppName],
    ]) {
      await setPlist(plist, key, value);
    }
    await rename(
      join(temporary, "Contents/MacOS/Electron"),
      join(temporary, "Contents/MacOS", devAppName),
    );
    await copyFile(icon, join(temporary, "Contents/Resources/electron.icns"));
    const frameworks = join(temporary, "Contents/Frameworks");
    for (const name of await readdir(frameworks)) {
      if (!name.startsWith("Electron Helper") || !name.endsWith(".app"))
        continue;
      const helper = join(frameworks, name, "Contents/Info.plist");
      const originalName = name.slice(0, -4);
      const helperName = originalName.replace(/^Electron/, devAppName);
      const suffix = originalName
        .slice("Electron Helper".length)
        .replace(/[^A-Za-z]/g, "")
        .toLowerCase();
      await setPlist(
        helper,
        "CFBundleIdentifier",
        `${devAppId}.helper${suffix ? `.${suffix}` : ""}`,
      );
      await setPlist(helper, "CFBundleName", helperName);
      await setPlist(helper, "CFBundleDisplayName", helperName);
      await setPlist(helper, "CFBundleExecutable", helperName);
      await rename(
        join(frameworks, name, "Contents/MacOS", originalName),
        join(frameworks, name, "Contents/MacOS", helperName),
      );
      await rename(
        join(frameworks, name),
        join(frameworks, `${helperName}.app`),
      );
    }
    // Only the generated copy is stripped of Finder metadata before signing
    await run("/usr/bin/xattr", ["-cr", temporary]);
    await run("/usr/bin/codesign", [
      "--force",
      "--deep",
      "--sign",
      "-",
      temporary,
    ]);
    await run("/usr/bin/codesign", [
      "--verify",
      "--deep",
      "--strict",
      temporary,
    ]);
    await rm(app, { recursive: true, force: true });
    await rename(temporary, app);
    await writeFile(join(output, "runtime.sha256"), fingerprint);
    return app;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export function devAppLaunchArgs(app, projectRoot, environment) {
  const args = [
    "-n",
    "-W",
    "-a",
    app,
    "--stdout",
    resolve(projectRoot, ".work/dev/main.stdout.log"),
    "--stderr",
    resolve(projectRoot, ".work/dev/main.stderr.log"),
    "--env",
    "ELECTRON_RUN_AS_NODE=",
  ];
  for (const [name, value] of Object.entries(environment)) {
    if (name.startsWith("DESICAST_") && value !== undefined)
      args.push("--env", `${name}=${value}`);
  }
  return [...args, "--args", resolve(projectRoot)];
}
