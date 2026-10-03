import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const composerTool = process.env.ICON_COMPOSER_TOOL ||
  "/Applications/Xcode.app/Contents/Applications/Icon Composer.app/Contents/Executables/ictool";
if (!existsSync(composerTool)) {
  throw new Error("Install Xcode with Icon Composer or set ICON_COMPOSER_TOOL to ictool.");
}
await mkdir(".work/icon.iconset", { recursive: true });
execFileSync(composerTool, [
  "assets/Desicast.icon", "--export-image", "--output-file", ".work/icon-glass.png",
  "--platform", "macOS", "--rendition", "Default",
  "--width", "1024", "--height", "1024", "--scale", "1",
]);
// Electron's PNG/ICNS path needs legacy macOS canvas padding. Native .icon
// artwork is full bleed; keeping it full bleed here makes the Dock tile too big.
await sharp(".work/icon-glass.png")
  .toColourspace("srgb")
  .resize(832, 832)
  .extend({ top: 96, bottom: 96, left: 96, right: 96, background: "#00000000" })
  .png()
  .toFile("assets/icon.png");
for (const size of [16, 32, 128, 256, 512])
  for (const scale of [1, 2])
    await sharp("assets/icon.png")
      .resize(size * scale)
      .png()
      .toFile(
        `.work/icon.iconset/icon_${size}x${size}${scale === 2 ? "@2x" : ""}.png`,
      );
execFileSync("/usr/bin/iconutil", [
  "-c",
  "icns",
  ".work/icon.iconset",
  "-o",
  "assets/icon.icns",
]);
