import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../../src/core/store";

test("library context actions, confirmations, re-add and persistence work in Electron", async () => {
  const directory = await mkdtemp(join(tmpdir(), "desicast-context-"));
  const store = new Store(directory);
  store.saveSource({
    id: "repo-menu",
    kind: "repository",
    name: "Menu team",
    url: "https://github.com/team/icons",
    branch: "main",
    directories: ["icons"],
    allowVision: false,
    iconCount: 0,
  });
  store.saveSetting("collections", {
    time: Date.now(),
    items: ["lucide", "tabler", "ri", "uil", "mingcute", "ic", "eva"].map(
      (id) => ({ id, name: id, total: 1 }),
    ),
  });
  store.close();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DESICAST_DATA_DIR: directory,
    DESICAST_TEST_MODE: "1",
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const launch = () =>
    electron.launch({
      args: ["."],
      env: Object.fromEntries(
        Object.entries(env).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
    });
  let app = await launch();
  try {
    let page = await app.firstWindow();
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    const unpinnedFirst = await page
      .locator(".library-navigation > button")
      .first()
      .getAttribute("data-testid");
    await page.getByTestId("library-tabler").click({ button: "right" });
    await expect(page.getByRole("menuitem")).toHaveText([
      "打开",
      "置顶",
      "配置",
      "查看来源",
      "移除图标库",
    ]);
    await page.screenshot({
      path: ".work/screenshots/library-context-light.png",
    });
    await page.getByRole("menuitem", { name: "置顶", exact: true }).click();
    await expect(
      page.locator(".library-navigation > button").first(),
    ).toHaveAttribute("data-testid", "library-tabler");
    await page.getByTestId("library-tabler").click({ button: "right" });
    await expect(
      page.getByRole("menuitem", { name: "取消置顶", exact: true }),
    ).toBeVisible();
    await page.getByRole("menuitem", { name: "取消置顶", exact: true }).click();
    await expect(
      page.locator(".library-navigation > button").first(),
    ).toHaveAttribute("data-testid", unpinnedFirst!);
    await app.evaluate(({ shell }) => {
      shell.openExternal = async (url: string) => {
        (
          globalThis as typeof globalThis & { openedSource?: string }
        ).openedSource = url;
      };
    });
    await page.getByTestId("library-tabler").click({ button: "right" });
    await page.getByRole("menuitem", { name: "查看来源", exact: true }).click();
    await expect
      .poll(() =>
        app.evaluate(
          () =>
            (globalThis as typeof globalThis & { openedSource?: string })
              .openedSource,
        ),
      )
      .toBe("https://tabler.io/icons");
    await page.getByTestId("library-tabler").click({ button: "right" });
    await page.getByRole("menuitem", { name: "配置", exact: true }).click();
    await page.getByLabel("图标库显示名称").fill("Custom Tabler");
    await page.getByRole("button", { name: "保存配置", exact: true }).click();
    await expect(page.getByTestId("library-tabler")).toContainText(
      "Custom Tabler",
    );
    await page.getByTestId("home-library-tabler").click({ button: "right" });
    await page
      .getByRole("menuitem", { name: "移除图标库", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "移除图标库" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.locator("[data-slot=dialog-header] img"),
    ).toHaveJSProperty("naturalWidth", 20);
    await page.screenshot({
      path: ".work/screenshots/remove-library-light.png",
    });
    await dialog.getByRole("button", { name: "取消", exact: true }).click();
    await expect(page.getByTestId("library-tabler")).toBeVisible();
    await page.getByTestId("library-tabler").click({ button: "right" });
    await page
      .getByRole("menuitem", { name: "移除图标库", exact: true })
      .click();
    await dialog.getByRole("button", { name: "移除", exact: true }).click();
    await expect(page.getByTestId("library-tabler")).toHaveCount(0);
    await page.getByTestId("home-library-repo-menu").click({ button: "right" });
    await page.getByRole("menuitem", { name: "置顶", exact: true }).click();
    await expect(
      page.locator(".home-library-grid > button").first(),
    ).toHaveAttribute("data-testid", "home-library-repo-menu");
    await expect(
      page.locator(".library-navigation > button").first(),
    ).toHaveAttribute("data-testid", "library-repo-menu");
    await page.getByTestId("library-repo-menu").click({ button: "right" });
    await page.getByRole("menuitem", { name: "取消置顶", exact: true }).click();

    await expect(page.getByTestId("home-library-tabler")).toHaveCount(0);
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    await expect(page.getByTestId("library-tabler")).toHaveCount(0);
    await page.getByRole("button", { name: "添加图标库", exact: true }).click();
    await page
      .getByRole("button", { name: "重新添加 Custom Tabler", exact: true })
      .click();
    await expect(page.getByTestId("library-tabler")).toBeVisible();
    await page.getByTestId("library-tabler").click({ button: "right" });
    await page.getByRole("menuitem", { name: "打开", exact: true }).click();
    await expect(page.locator(".window-library-title")).toContainText(
      "Custom Tabler",
    );
    await page.getByRole("button", { name: "设置", exact: true }).click();
    const settings = page.locator(".settings-page");
    await settings.getByRole("button", { name: "外观", exact: true }).click();
    await page.getByLabel("外观主题").selectOption("dark");
    await settings.getByRole("button", { name: "返回", exact: true }).click();
    await expect(settings).toHaveCount(0);
    await page.getByTestId("library-repo-menu").click({ button: "right" });
    await page.screenshot({
      path: ".work/screenshots/library-context-dark.png",
    });
    await page
      .getByRole("menuitem", { name: "移除图标库", exact: true })
      .click();
    await page.screenshot({
      path: ".work/screenshots/remove-library-dark.png",
    });
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "取消", exact: true })
      .click();
    await page.getByTestId("library-repo-menu").click({ button: "right" });
    await page.getByRole("menuitem", { name: "配置", exact: true }).click();
    await expect(page.getByLabel("图标库名称")).toHaveValue("Menu team");
    await page.getByRole("button", { name: "取消", exact: true }).click();
    await page.getByTestId("library-repo-menu").click({ button: "right" });
    await page
      .getByRole("menuitem", { name: "移除图标库", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "移除", exact: true })
      .click();
    await expect(page.getByTestId("library-repo-menu")).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
