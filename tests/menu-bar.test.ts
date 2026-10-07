import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MenuBarController } from "../src/electron/menu-bar";
import { menuBarLabels } from "../src/shared/menu-bar";
import { IconService } from "../src/core/service";
import { MemorySecrets } from "../src/core/secrets";
import { settingsSchema } from "../src/core/contracts";

test("menu bar toggling retains one native item, updates language, and destroys on disable/quit", () => {
  let created = 0,
    destroyed = 0;
  const menus: string[] = [];
  const bar = new MenuBarController(() => {
    created++;
    return {
      destroy: () => {
        destroyed++;
      },
      setMenu: (labels) => {
        menus.push(labels.open);
      },
    };
  });
  bar.update(false, menuBarLabels({ theme: "system", language: "zh" }));
  assert.equal(created, 0);
  assert.equal(bar.enabled, false);
  bar.update(true, menuBarLabels({ theme: "system", language: "zh" }));
  bar.update(true, menuBarLabels({ theme: "system", language: "en" }));
  assert.equal(created, 1);
  assert.equal(bar.enabled, true);
  assert.deepEqual(menus, ["打开 DesiCast", "Open DesiCast"]);
  bar.update(false, menuBarLabels({ theme: "system", language: "en" }));
  assert.equal(destroyed, 1);
  assert.equal(bar.enabled, false);
  bar.update(
    true,
    menuBarLabels({ theme: "system", language: "system" }, ["en-US"]),
  );
  assert.equal(created, 2);
  bar.destroy();
  bar.destroy();
  assert.equal(destroyed, 2);
  assert.equal(bar.enabled, false);
  assert.equal(
    menuBarLabels({ theme: "system", language: "system" }, ["zh-CN"]).open,
    "打开 DesiCast",
  );
});

test("menu bar preference defaults off, survives reopening, and is preserved by legacy saves", async () => {
  const directory = await mkdtemp(join(tmpdir(), "desicast-menu-bar-"));
  const secrets = new MemorySecrets();
  let service = new IconService(directory, secrets);
  try {
    assert.equal((await service.settings()).showInMenuBar, false);
    for (const enabled of [true, false, true]) {
      await service.saveSettings(
        settingsSchema.parse({
          ...(await service.settings()),
          showInMenuBar: enabled,
        }),
      );
      service.close();
      service = new IconService(directory, secrets);
      assert.equal((await service.settings()).showInMenuBar, enabled);
    }
    const { showInMenuBar, ...legacy } = await service.settings();
    await service.saveSettings(legacy);
    assert.equal((await service.settings()).showInMenuBar, showInMenuBar);
    await service.addModelProvider({
      baseUrl: "https://example.com/v1",
      model: "vision",
    });
    assert.equal((await service.settings()).showInMenuBar, true);
    assert.equal(
      settingsSchema.safeParse({ ...legacy, showInMenuBar: "true" }).success,
      false,
    );
  } finally {
    service.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("menu bar initialization failures leave no enabled item and allow retry", () => {
  let failCreate = true;
  let failMenu = true;
  let destroyed = 0;
  const bar = new MenuBarController(() => {
    if (failCreate) throw new Error("Missing image");
    return {
      destroy: () => destroyed++,
      setMenu: () => {
        if (failMenu) throw new Error("Menu unavailable");
      },
    };
  });
  const labels = menuBarLabels({ theme: "system" });
  assert.throws(() => bar.update(true, labels), /Missing image/);
  assert.equal(bar.enabled, false);
  failCreate = false;
  assert.throws(() => bar.update(true, labels), /Menu unavailable/);
  assert.equal(bar.enabled, false);
  assert.equal(destroyed, 1);
  failMenu = false;
  bar.update(true, labels);
  assert.equal(bar.enabled, true);
  bar.destroy();
  assert.equal(destroyed, 2);
});
