import { build, Platform, Arch } from "electron-builder";
import { mkdir, writeFile, chmod } from "node:fs/promises";
import { arch } from "node:os";
await mkdir(".work", { recursive: true });
await writeFile(
  ".work/desicast-mcp",
  '#!/bin/sh\nRESOURCES="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"\nexport ELECTRON_RUN_AS_NODE=1\nexec "$RESOURCES/../MacOS/DesiCast" "$RESOURCES/app.asar/dist/mcp/server.mjs" "$@"\n',
);
await chmod(".work/desicast-mcp", 0o755);
await build({
  targets: Platform.MAC.createTarget(
    ["dir", "zip", "dmg"],
    arch() === "arm64" ? Arch.arm64 : Arch.x64,
  ),
  config: {
    appId: "com.niallyoung.desicast",
    productName: "DesiCast",
    directories: { output: "release" },
    files: ["dist/**/*", "package.json"],
    extraResources: [{ from: ".work/desicast-mcp", to: "desicast-mcp" }],
    asarUnpack: ["node_modules/sharp/**/*", "node_modules/@img/**/*"],
    npmRebuild: false,
    mac: {
      icon: "assets/icon.icns",
      category: "public.app-category.developer-tools",
      identity: null,
      hardenedRuntime: false,
    },
    artifactName: "DesiCast-${version}-${arch}.${ext}",
  },
});
