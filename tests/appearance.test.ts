import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { IconService } from "../src/core/service";
import { MemorySecrets } from "../src/core/secrets";
import { settingsSchema } from "../src/core/contracts";
import { brandColors, interfaceZooms } from "../src/core/types";
import {
  applyBrandColor,
  brandColorTokens,
  verifyAppearanceSave,
} from "../src/renderer/appearance";

test("Brand palette follows light/dark shades and grey restores upstream tokens", () => {
  const values = new Map<string, string>([
    ["--nico-color-interaction-selected", "var(--nico-color-blue-100)"],
  ]);
  const root = {
    style: {
      setProperty: (key: string, value: string) => values.set(key, value),
      removeProperty: (key: string) => values.delete(key),
    },
  } as unknown as HTMLElement;
  for (const color of brandColors.filter((color) => color !== "grey")) {
    for (const dark of [false, true]) {
      applyBrandColor(root, color, dark);
      assert.equal(
        values.get("--nico-color-background-brand-intense"),
        `var(--nico-color-${color}-${dark ? 400 : 500})`,
      );
      assert.equal(
        values.get("--nico-color-background-brand-intense-hover"),
        `var(--nico-color-${color}-${dark ? 300 : 600})`,
      );
      assert.equal(values.has("--nico-color-interaction-selected"), false);
      assert.equal(
        values.get("--nico-color-text-brand"),
        brandColorTokens(color, dark)["--nico-color-background-brand-intense"],
      );
    }
  }
  applyBrandColor(root, "grey", false);
  assert.equal(values.size, 0);
});

test("Appearance survives reopening, legacy saves and model provider updates", async () => {
  const directory = await mkdtemp(join(tmpdir(), "desicast-appearance-"));
  const secrets = new MemorySecrets();
  let service = new IconService(directory, secrets);
  try {
    const legacy = service.store.settings();
    delete legacy.brandColor;
    delete legacy.zoom;
    service.store.saveSetting("preferences", legacy);
    assert.equal((await service.settings()).brandColor, "grey");
    assert.equal((await service.settings()).zoom, 100);
    for (const zoom of interfaceZooms) {
      await service.saveSettings({
        ...(await service.settings()),
        brandColor: "purple",
        zoom,
      });
      service.close();
      service = new IconService(directory, secrets);
      assert.equal((await service.settings()).zoom, zoom);
      assert.equal((await service.settings()).brandColor, "purple");
    }
    const { brandColor, zoom, ...oldClient } = await service.settings();
    await service.saveSettings({ ...oldClient, theme: "dark" });
    const updated = await service.addModelProvider({
      baseUrl: "https://example.com/v1",
      model: "vision",
    });
    assert.equal(updated.brandColor, brandColor);
    assert.equal(updated.zoom, zoom);
    assert.equal(
      settingsSchema.safeParse({ ...updated, zoom: 120 }).success,
      false,
    );
    assert.equal(
      settingsSchema.safeParse({ ...updated, brandColor: "invalid" }).success,
      false,
    );
  } finally {
    service.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("Appearance save detects a stale main process instead of silently resetting the choice", () => {
  const saved = {
    theme: "system" as const,
    model: { baseUrl: "https://example.com/v1", model: "", consent: false },
  };
  assert.throws(
    () => verifyAppearanceSave(saved, { brandColor: "blue" }),
    /重启/,
  );
  assert.throws(
    () => verifyAppearanceSave({ ...saved, zoom: 100 }, { zoom: 150 }),
    /重启/,
  );
  assert.doesNotThrow(() =>
    verifyAppearanceSave(
      { ...saved, brandColor: "blue", zoom: 150 },
      { brandColor: "blue", zoom: 150 },
    ),
  );
});
