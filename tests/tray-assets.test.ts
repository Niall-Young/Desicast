import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

test("tray assets are available from a clean output directory at both display scales", async () => {
  const directory = await mkdtemp(join(tmpdir(), "desicast-tray-assets-"));
  try {
    // The same preparation is used by development and production builds
    const { copyTrayAssets } = await import(
      new URL("../scripts/tray-assets.mjs", import.meta.url).href
    );
    const output = join(directory, "electron");
    await copyTrayAssets(output);
    for (const [name, size] of [
      ["trayTemplate.png", 18],
      ["trayTemplate@2x.png", 36],
    ] as const) {
      const copied = await readFile(join(output, name));
      assert.deepEqual(
        copied,
        await readFile(new URL(`../assets/${name}`, import.meta.url)),
      );
      const metadata = await sharp(copied).metadata();
      assert.equal(metadata.width, size);
      assert.equal(metadata.height, size);
      const { data } = await sharp(copied)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      assert.ok(data.some((alpha, index) => index % 4 === 3 && alpha > 0));
      assert.ok(data.some((alpha, index) => index % 4 === 3 && alpha === 0));
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
