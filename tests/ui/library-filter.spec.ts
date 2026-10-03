import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../../src/core/store";

test("Figma library options start unchecked, filter multiple groups and retain selections", async () => {
  const directory = await mkdtemp(join(tmpdir(), "desicast-filters-ui-"));
  const store = new Store(directory);
  for (const [id, name, url] of [
    ["github", "Zulu Github", "https://github.com/team/icons"],
    ["gitlab", "Alpha Gitlab", "https://gitlab.company.com/team/icons"],
  ]) {
    store.saveSource({
      id,
      name,
      url,
      kind: "repository",
      allowVision: false,
      iconCount: 0,
      changes:
        id === "gitlab"
          ? {
              revision: "1",
              detectedAt: new Date().toISOString(),
              added: 1,
              updated: 0,
              removed: 0,
            }
          : undefined,
    });
  }
  store.saveSetting("collections", {
    time: Date.now(),
    items: ["lucide", "tabler", "ri", "uil", "mingcute", "ic", "eva"].map(
      (id) => ({ id, name: id, total: 2000 }),
    ),
  });
  store.close();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DESICAST_DATA_DIR: directory,
    DESICAST_TEST_MODE: "1",
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    args: ["."],
    env: Object.fromEntries(
      Object.entries(env).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
  });
  try {
    const page = await app.firstWindow();
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
    const trigger = page.getByRole("button", { name: "图库选项", exact: true });
    const rows = page.locator(".library-navigation .nav-item");
    await expect(rows).toHaveCount(9);
    await trigger.click();
    const popup = page.getByRole("dialog", { name: "筛选配置" });
    await expect(popup).toBeVisible();
    await expect(popup.locator('[aria-pressed="false"]')).toHaveCount(8);
    await expect(
      popup.getByRole("button", { name: "首字母正序" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({
      path: ".work/screenshots/library-options-default.png",
    });
    await popup.getByRole("button", { name: "Github 仓库" }).click();
    await expect(rows).toHaveCount(1);
    await popup.getByRole("button", { name: "Gitlab 仓库" }).click();
    await expect(rows).toHaveCount(2);
    await popup.getByRole("button", { name: "有更新", exact: true }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows).toHaveText(["Alpha GitlabUpdate0"]);
    await popup.getByRole("button", { name: "正常", exact: true }).click();
    await expect(rows).toHaveCount(2);
    await popup.getByRole("button", { name: "首字母正序" }).click();
    await expect(rows.first()).toContainText("Alpha Gitlab");
    await popup.getByRole("button", { name: "首字母倒序" }).click();
    await expect(
      popup.getByRole("button", { name: "首字母正序" }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(rows.first()).toContainText("Zulu Github");
    await page.keyboard.press("Escape");
    await expect(popup).toBeHidden();
    await trigger.click();
    await expect(popup.locator('[aria-pressed="true"]')).toHaveCount(5);
    await page.screenshot({
      path: ".work/screenshots/library-options-light.png",
    });
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.screenshot({
      path: ".work/screenshots/library-options-dark.png",
    });
    const check = popup.locator(".library-options-check").first();
    await expect(check).toHaveJSProperty("naturalWidth", 16);
    await expect.poll(async () => (await check.boundingBox())?.width).toBe(16);
    await expect.poll(async () => (await check.boundingBox())?.height).toBe(16);
    for (const name of ["Github 仓库", "Gitlab 仓库", "正常", "有更新"])
      await popup.getByRole("button", { name, exact: true }).click();
    await expect(rows).toHaveCount(9);
    await expect(popup.locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(
      popup.getByRole("button", { name: "首字母倒序" }),
    ).toHaveAttribute("aria-pressed", "true");
    const window = await app.browserWindow(page);
    await window.evaluate((window) => window.setSize(960, 640));
    await expect
      .poll(() =>
        popup.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return (
            bounds.left >= 0 &&
            bounds.top >= 0 &&
            bounds.right <= innerWidth &&
            bounds.bottom <= innerHeight
          );
        }),
      )
      .toBe(true);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
