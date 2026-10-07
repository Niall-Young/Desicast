import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export async function copyTrayAssets(outputDirectory = "dist/electron") {
  await mkdir(outputDirectory, { recursive: true });
  for (const name of ["trayTemplate.png", "trayTemplate@2x.png"]) {
    await copyFile(
      new URL(`../assets/${name}`, import.meta.url),
      join(outputDirectory, name),
    );
  }
}
