import { selectValue } from "./select-control";
import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../../src/core/store";
import { createServer } from "node:http";
import sharp from "sharp";
import type { Icon, Source } from "../../src/core/types";

let app: ElectronApplication, directory: string;
async function openSettings(page: Page, name: string) {
  const dialog = page.locator(".settings-page");
  await expect(page.locator(".settings-page[data-ending-style]")).toHaveCount(
    0,
  );
  if (await dialog.count())
    await dialog.getByRole("button", { name: "返回" }).click();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  if (name === "首页") {
    await dialog.getByRole("button", { name: "返回", exact: true }).click();
    if (!(await page.locator(".home-content").count()))
      await page.getByRole("button", { name: "返回", exact: true }).click();
    return;
  }
  const labels: Record<string, string> = {
    外观设置: "外观",
    仓库管理: "图标库",
    视觉模型: "模型配置",
  };
  await dialog
    .getByRole("button", { name: labels[name] ?? name, exact: true })
    .click();
}
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m15 15 6 6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
test.beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "desicast-ui-"));
  const store = new Store(directory);
  const source: Source = {
    id: "repo-team",
    name: "Design team",
    kind: "repository",
    access: "private",
    url: "https://github.com/team/icons",
    branch: "main",
    directories: ["icons"],
    allowVision: false,
    commit: "abc123",
    syncedAt: new Date().toISOString(),
    iconCount: 0,
  };
  const icons: Icon[] = Array.from({ length: 48 }, (_, index) => ({
    id: `repo-team:icons/${index ? "icon-" + index : "search"}.svg`,
    name: index ? "icon-" + index : "search",
    sourceId: "repo-team",
    collection: "Design team",
    sourceUrl: source.url!,
    commit: "abc123",
    svg,
  }));
  store.replace(source, icons);
  const prefixes = ["lucide", "tabler", "ri", "uil", "mingcute", "ic", "eva"];
  store.saveSetting("collections", {
    time: Date.now(),
    items: prefixes.map((id, index) => ({ id, name: id, total: 2000 + index })),
  });
  for (const prefix of prefixes) {
    store.saveSetting(`collection-index:${prefix}`, {
      time: Date.now(),
      names: ["search"],
    });
    store.cache([
      {
        ...icons[0],
        id: `public:${prefix}:search`,
        sourceId: "public",
        collection: prefix,
        name: "search",
        publicRevision: `${2000 + prefixes.indexOf(prefix)}::`,
      },
    ]);
  }
  store.saveSetting("collection-changes:ri", {
    revision: "fixture-change",
    detectedAt: new Date().toISOString(),
    added: 3,
    updated: 0,
    removed: 1,
  });
  store.close();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DESICAST_DATA_DIR: directory,
    DESICAST_TEST_MODE: "1",
  };
  delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({
    args: ["."],
    env: Object.fromEntries(
      Object.entries(env).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
  });
});
test.afterEach(async () => {
  await app?.close();
  await rm(directory, { recursive: true, force: true });
});
test("Desktop uses Gendesign, searches team icons, copies each target, and connects independent MCP", async () => {
  const page = await app.firstWindow();
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Design team", exact: false })
    .click();
  await expect(page.getByTestId("icon-card")).toHaveCount(48);
  await page.getByRole("searchbox", { name: "搜索图标" }).fill("搜索");
  await expect(page.getByTestId("icon-card")).toHaveCount(1);
  await page.getByTestId("icon-card").first().click();
  await expect(
    page.getByRole("heading", { name: "search", exact: true }),
  ).toBeVisible();
  for (const target of ["React", "Vue", "SwiftUI"]) {
    await page.getByRole("tab", { name: target, exact: true }).click();
    const preview = page.locator(".detail .code-preview pre");
    await expect(preview).not.toContainText("正在生成");
    await expect(preview).not.toContainText("Source:");
    await expect(
      page.getByRole("button", { name: "尺寸、颜色与来源信息" }),
    ).toHaveCount(0);
    await expect(
      page.locator(".detail .export-instruction, .detail .hint"),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "复制代码", exact: true }).click();
    const copied = await app.evaluate(({ clipboard }) => clipboard.readText());
    expect(copied).toContain("Source: https://github.com/team/icons");
    expect(copied).toContain(
      target === "React"
        ? "SVGProps"
        : target === "Vue"
          ? "<template>"
          : "Image(",
    );
    await expect(page.getByLabel("消息通知")).toContainText("代码已复制");
    await expect(
      page.getByRole("button", { name: "复制代码", exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(1900);
  }
  await page.screenshot({ path: ".work/screenshots/team-light.png" });
  await page.getByRole("button", { name: "MCP 连接", exact: false }).click();
  const dialog = page.getByRole("dialog", { name: "MCP 配置" });
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "ChatGPT", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  for (const [label, prefix] of [
    ["复制 Codex 命令", "codex mcp add desicast"],
    ["复制 Claude Code 命令", "claude mcp add"],
  ]) {
    await page
      .getByRole("tab", {
        name: label.includes("Claude") ? "Claude code" : "ChatGPT",
        exact: true,
      })
      .click();
    const button = page.getByRole("button", { name: label, exact: true });
    await expect(button).toBeEnabled();
    const shown = await dialog.locator(".mcp-code pre:visible").innerText();
    await button.click();
    await expect
      .poll(() => app.evaluate(({ clipboard }) => clipboard.readText()))
      .toBe(shown);
    const copied = await app.evaluate(({ clipboard }) => clipboard.readText());
    expect(copied).toBe(shown);
    expect(copied).toContain(prefix);
    expect(copied).toContain("--env ELECTRON_RUN_AS_NODE=1");
    expect(copied).toContain(`'${directory}'`);
    if (label.includes("Claude")) {
      expect(copied).toContain("--transport stdio --scope user desicast -- ");
    }
  }
  await page.getByRole("tab", { name: "其他", exact: true }).click();
  await page
    .getByRole("button", { name: "复制 MCP JSON", exact: true })
    .click();
  await expect
    .poll(() => app.evaluate(({ clipboard }) => clipboard.readText()))
    .toContain('"mcpServers"');
  const configuration = JSON.parse(
    await app.evaluate(({ clipboard }) => clipboard.readText()),
  );
  expect(configuration.mcpServers.desicast.args).toContain(directory);
  expect(configuration.mcpServers.desicast.env).toEqual({
    ELECTRON_RUN_AS_NODE: "1",
  });
  await page.getByRole("tab", { name: "ChatGPT", exact: true }).click();
  await page.screenshot({
    animations: "disabled",
    path: ".work/screenshots/mcp-design-light.png",
  });
  const assets = await dialog.locator("img:visible").evaluateAll((images) =>
    images.map((image) => {
      const bounds = image.getBoundingClientRect();
      return {
        loaded: (image as HTMLImageElement).naturalWidth > 0,
        width: bounds.width,
        height: bounds.height,
      };
    }),
  );
  expect(assets).toHaveLength(6);
  for (const asset of assets)
    expect(asset).toEqual({ loaded: true, width: 16, height: 16 });
  await page.getByRole("button", { name: "检查 MCP 连接" }).click();
  await expect(page.getByText("连接正常 · 5 个工具 · 2 个来源")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("tab", { name: "ChatGPT", exact: true }).click();
  await page.screenshot({
    animations: "disabled",
    path: ".work/screenshots/mcp-light.png",
  });
  await page.getByRole("button", { name: "确定", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("searchbox", { name: "搜索图标" })).toHaveValue(
    "搜索",
  );
  for (const close of ["取消", "关闭 MCP 配置", "Escape"]) {
    await page.getByRole("button", { name: "MCP 连接", exact: true }).click();
    await expect(dialog).toBeVisible();
    if (close === "Escape") await page.keyboard.press("Escape");
    else await page.getByRole("button", { name: close, exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
test("Themes, settings forms and 960px layout remain usable", async () => {
  const page = await app.firstWindow();
  await openSettings(page, "外观设置");
  await selectValue(page, "外观主题", "dark");
  await page
    .locator(".settings-page")
    .getByRole("button", { name: "返回", exact: true })
    .click();
  await expect(page.locator(".settings-page")).toHaveCount(0);
  await expect(page.locator("html")).toHaveClass("dark");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Design team", exact: false })
    .click();
  await expect(page.getByTestId("icon-card")).toHaveCount(48);
  await page.screenshot({ path: ".work/screenshots/team-dark.png" });
  const window = await app.browserWindow(page);
  await window.evaluate((window) => window.setSize(960, 640));
  await openSettings(page, "仓库管理");
  await page.getByRole("button", { name: "添加仓库", exact: true }).click();
  await expect(page.getByLabel("仓库链接")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "添加", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: ".work/screenshots/repositories-dark.png" });
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await openSettings(page, "视觉模型");
  await page.getByLabel("模型名称", { exact: true }).fill("vision-model");
  await page.getByLabel("允许发送图片到模型").click();
  await page.getByRole("button", { name: "保存设置" }).click();
  await page
    .locator(".settings-page")
    .getByRole("button", { name: "返回", exact: true })
    .click();
  await expect(page.getByText("模型设置已保存")).toBeVisible();
  await page.screenshot({ path: ".work/screenshots/model-dark.png" });
  await page.getByRole("button", { name: "MCP 连接", exact: true }).click();
  const mcpDialog = page.getByRole("dialog", { name: "MCP 配置" });
  await expect(mcpDialog).toBeVisible();
  const bounds = await mcpDialog.boundingBox();
  expect(bounds!.width).toBe(640);
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  await page
    .getByRole("button", { name: "复制 Codex 命令", exact: true })
    .click();
  await page.screenshot({
    animations: "disabled",
    path: ".work/screenshots/mcp-dark-narrow.png",
  });
  await page.getByRole("tab", { name: "其他", exact: true }).click();
  await expect(mcpDialog.locator(".mcp-code pre:visible")).toContainText(
    '"mcpServers"',
  );
  await page.screenshot({
    animations: "disabled",
    path: ".work/screenshots/mcp-json-dark-narrow.png",
  });
  await page
    .getByRole("button", { name: "关闭 MCP 配置", exact: true })
    .click();
  await page.keyboard.press("Meta+k");
  await expect(page.getByRole("searchbox", { name: "搜索图标" })).toBeFocused();
});

test("Image search uses the configured local vision endpoint and Gendesign crop modal", async () => {
  let requests = 0;
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const value = JSON.parse(Buffer.concat(chunks).toString());
    requests++;
    const images = value.messages[0].content.filter(
      (item: { type: string }) => item.type === "image_url",
    );
    const result =
      images.length === 1
        ? { keywords: ["search"], shape: "circle and handle", style: "outline" }
        : {
            matches: [
              { id: "repo-team:icons/search.svg", reason: "轮廓和线条接近" },
            ],
          };
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(result) } }],
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const page = await app.firstWindow();
    await openSettings(page, "仓库管理");
    await page.getByRole("button", { name: "编辑", exact: true }).click();
    await page.getByRole("switch", { name: "开启视觉检索" }).click();
    await page.getByRole("button", { name: "保存配置" }).click();
    await openSettings(page, "视觉模型");
    const address = server.address() as { port: number };
    await page
      .getByLabel("模型 API 地址")
      .fill(`http://127.0.0.1:${address.port}/v1`);
    await page.getByLabel("模型名称", { exact: true }).fill("fixture-vision");
    await page.getByLabel("允许发送图片到模型").click();
    await page.getByRole("button", { name: "保存设置" }).click();
    await page
      .locator(".settings-page")
      .getByRole("button", { name: "返回", exact: true })
      .click();
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Design team", exact: false })
      .click();
    await expect(page.getByTestId("icon-card")).toHaveCount(48);
    const buffer = await sharp(Buffer.from(svg))
      .resize(96, 96)
      .png()
      .toBuffer();
    await page
      .locator("input[type=file]")
      .setInputFiles({ name: "reference.png", mimeType: "image/png", buffer });
    await expect(
      page.getByRole("dialog", { name: "用图片寻找相似图标" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "搜索相似图标", exact: true })
      .click();
    await expect(page.getByText("按形状与风格匹配")).toBeVisible();
    await expect(page.getByTestId("icon-card")).toHaveCount(1);
    await expect(page.getByText("轮廓和线条接近")).toBeVisible();
    expect(requests).toBe(2);
    await page.screenshot({ path: ".work/screenshots/image-search.png" });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("Default libraries show bundled design SVG assets, totals, theme variants and persistent change acknowledgements", async () => {
  const page = await app.firstWindow();
  for (const id of ["lucide", "tabler", "ri", "uil", "mingcute", "ic", "eva"]) {
    const row = page.getByTestId(`library-${id}`);
    await expect(row).toBeVisible();
    await row.click();
    await expect(page.getByTestId("icon-card")).toHaveAttribute(
      "title",
      `search · ${id}`,
    );
    await expect(page.locator('.filter-toolbar [data-slot="select-trigger"]')).toContainText(id);
    await expect(row.locator(".nav-count")).toHaveText(
      (
        2000 +
        ["lucide", "tabler", "ri", "uil", "mingcute", "ic", "eva"].indexOf(id)
      ).toLocaleString(),
    );
  }
  const remix = page.getByTestId("library-ri");
  await expect(
    remix.getByRole("img", { name: "未读变更：新增 3 · 删除 1" }),
  ).toBeVisible();
  await remix.click();
  await expect(
    page.getByRole("status").filter({ hasText: "新增 3 · 删除 1" }),
  ).toBeVisible();
  await page.screenshot({ path: ".work/screenshots/libraries-light.png" });
  for (const theme of ["dark", "light"]) {
    await openSettings(page, "外观设置");
    await selectValue(page, "外观主题", theme);
    await page
      .locator(".settings-page")
      .getByRole("button", { name: "返回", exact: true })
      .click();
    await expect(page.locator(".settings-page")).toHaveCount(0);
    await remix.click();
    await expect(page.getByTestId("icon-card")).toHaveAttribute(
      "title",
      "search · ri",
    );
    await expect(
      page
        .getByTestId("library-lucide")
        .locator(theme === "dark" ? ".mark-dark" : ".mark-light"),
    ).toBeVisible();
    const rendered = await page
      .locator(".library-mark img:visible")
      .evaluateAll((images) =>
        images.every(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth > 0,
        ),
      );
    expect(rendered).toBe(true);
    await page.screenshot({ path: `.work/screenshots/libraries-${theme}.png` });
  }
  const nativeWindow = await app.browserWindow(page);
  await nativeWindow.evaluate((window) => window.setSize(960, 640));
  const layouts = await page
    .locator('[data-testid^="library-"]')
    .evaluateAll((rows) =>
      rows.every((row) => {
        const label = row.children[1].getBoundingClientRect();
        const count = row.querySelector(".nav-count")!.getBoundingClientRect();
        return label.right <= count.left;
      }),
    );
  expect(layouts).toBe(true);
  await page.screenshot({ path: ".work/screenshots/libraries-narrow.png" });
  await page.getByRole("button", { name: "标记已读" }).click();
  await expect(remix.locator(".library-change-dot")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByTestId("library-ri").locator(".library-change-dot"),
  ).toHaveCount(0);
  const store = new Store(directory);
  const team = store.source("repo-team")!;
  store.replace(team, store.local("", team.id).slice(1));
  store.close();
  const teamRow = page.locator(".sidebar").getByRole("button", {
    name: "Design team",
    exact: false,
  });
  await expect(
    teamRow.getByRole("img", { name: "未读变更：删除 1" }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(teamRow.locator(".nav-count")).toHaveText("47");
  await teamRow.click();
  await page.getByRole("button", { name: "标记已读" }).click();
  await expect(teamRow.locator(".library-change-dot")).toHaveCount(0);
});

test("Repository dialog uses metadata fixtures and upstream multiselect directory controls", async () => {
  const page = await app.firstWindow();
  await openSettings(page, "仓库管理");
  await page.getByRole("button", { name: "添加仓库", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "公开仓库", exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("用户名", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("访问令牌", { exact: true })).toHaveCount(0);
  await page.getByRole("radio", { name: "私有仓库", exact: true }).click();
  await expect(page.getByLabel("用户名", { exact: true })).toBeVisible();
  await expect(page.getByLabel("访问令牌", { exact: true })).toBeVisible();
  await page.getByLabel("访问令牌", { exact: true }).fill("discard-on-switch");
  await page.getByRole("radio", { name: "公开仓库", exact: true }).click();
  await expect(page.getByLabel("访问令牌", { exact: true })).toHaveCount(0);
  // Exercise the real Electron bridge and UI without cloning a large remote repo per selection.
  // HTTPS Git browsing and credential behavior are covered by repository-sync.test.ts.
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler("desicast:call");
    ipcMain.handle(
      "desicast:call",
      (_event, method: string, input: { branch?: string }) => {
        if (method !== "browseRepository")
          throw new Error(`Unexpected fixture call: ${method}`);
        return {
          ok: true,
          value: {
            branches: ["main", "preview"],
            branch: input.branch ?? "main",
            directories: [
              "packages",
              "packages/lucide-react",
              "packages/lucide-static",
            ],
            authorization: "UI metadata fixture",
          },
        };
      },
    );
  });

  await page.getByLabel("图标库名称").fill("Lucide test");
  await expect(
    page.getByRole("button", { name: "添加", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("仓库链接")
    .fill("https://github.com/lucide-icons/lucide.git");
  await page.getByRole("button", { name: "读取仓库信息" }).click();
  const branch = page.getByRole("combobox", { name: "仓库分支" });
  await expect(branch).toBeEnabled({ timeout: 45000 });
  await expect(page.locator(".add-library-status")).toHaveCount(0);
  await expect(branch).toHaveCSS(
    "background-color",
    await page
      .getByLabel("仓库链接")
      .locator("xpath=../..")
      .evaluate((element) => getComputedStyle(element).backgroundColor),
  );
  await branch.focus();
  await branch.press("Space");
  await page
    .getByRole("option", { name: "main", exact: true })
    .press("ArrowDown");
  await page
    .getByRole("option", { name: "preview", exact: true })
    .press("Enter");
  await expect(branch).toContainText("preview");
  await selectValue(page, "仓库分支", "main");
  await expect(page.getByLabel("仓库分支")).toContainText("main");
  await expect(
    page.getByRole("button", { name: "SVG 目录", exact: true }),
  ).toBeEnabled({ timeout: 45000 });
  await page.getByRole("button", { name: "SVG 目录", exact: true }).click();
  const packages = page.getByRole("treeitem", {
    name: "packages",
    exact: true,
  });
  await packages.focus();
  await packages.press("ArrowRight");
  for (const name of ["lucide-react", "lucide-static"]) {
    const directory = page.getByRole("treeitem", { name, exact: true });
    await directory.click();
    await expect(directory).toHaveAttribute("aria-selected", "true");
  }
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "移除目录 packages/lucide-react" }),
  ).toBeVisible();
  await selectValue(page, "仓库分支", "main");
  await expect(
    page.getByRole("button", { name: "移除目录 packages/lucide-react" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "添加", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "移除目录 packages/lucide-react" })
    .click();
  await page
    .getByRole("button", { name: "移除目录 packages/lucide-static" })
    .click();
  await expect(
    page.getByRole("button", { name: "添加", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("仓库链接").fill("https://github.com/team/other.git");
  await expect(page.getByLabel("仓库分支")).toBeDisabled();
});

test("Figma home opens existing libraries and preserves global search, settings and responsive themes", async () => {
  const page = await app.firstWindow();
  const window = await app.browserWindow(page);
  await window.evaluate((window) => window.setSize(1440, 900));
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(
    page.getByRole("heading", { name: "Hello，今天想用什么图标库？" }),
  ).toBeVisible();
  await expect(page.locator(".home-library-card")).toHaveCount(7);
  for (const theme of ["light", "dark"]) {
    await openSettings(page, "外观设置");
    await selectValue(page, "外观主题", theme);
    await page
      .locator(".settings-page")
      .getByRole("button", { name: "返回", exact: true })
      .click();
    await expect(page.locator(".settings-page")).toHaveCount(0);
    await openSettings(page, "首页");
    await expect(page.locator(".home-library-card")).toHaveCount(7);
    await expect
      .poll(() =>
        page
          .locator(
            ".home-content img, .sidebar img:visible, .window-actions img",
          )
          .evaluateAll((images) =>
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    const markBoxes = await page
      .locator(".home-library-card .library-mark-card")
      .evaluateAll((marks) =>
        marks.map((mark) => {
          const bounds = mark.getBoundingClientRect();
          return { width: bounds.width, height: bounds.height };
        }),
      );
    expect(markBoxes).toHaveLength(6);
    expect(
      markBoxes.every((bounds) => bounds.width === 64 && bounds.height === 64),
    ).toBe(true);
    const geometry = await page
      .locator(".home-library-card .library-mark img:visible")
      .evaluateAll((images) =>
        images.map((image) => ({
          width: image.getBoundingClientRect().width,
          height: image.getBoundingClientRect().height,
        })),
      );
    expect(geometry.length).toBeGreaterThan(0);
    expect(
      geometry.every(
        (bounds) =>
          bounds.width === geometry[0].width &&
          bounds.height === geometry[0].height,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.work/screenshots/home-${theme}.png`,
      scale: "css",
    });
  }
  await page.getByTestId("home-library-uil").click();
  await expect(page.locator('.filter-toolbar [data-slot="select-trigger"]')).toContainText("uil");
  await expect(page.getByTestId("icon-card")).toHaveCount(1);
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hello，今天想用什么图标库？" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "前进", exact: true }).click();
  await expect(page.locator('.filter-toolbar [data-slot="select-trigger"]')).toContainText("uil");
  await openSettings(page, "首页");
  await window.evaluate((window) => window.setSize(960, 640));
  await page.setViewportSize({ width: 960, height: 640 });
  await expect(page.locator(".home-library-card").first()).toBeVisible();
  const fits = await page
    .locator(".home-library-grid")
    .evaluate((grid) => grid.getBoundingClientRect().right <= innerWidth);
  expect(fits).toBe(true);
  await page.screenshot({
    path: ".work/screenshots/home-narrow.png",
    scale: "css",
  });
  await page.keyboard.press("Meta+k");
  await expect(page.getByRole("searchbox", { name: "搜索图标" })).toBeFocused();
  await page.getByRole("button", { name: "切换侧栏" }).click();
  await expect(page.locator(".sidebar")).toBeHidden();
  await page.getByRole("button", { name: "切换侧栏" }).click();
  await expect(page.locator(".sidebar")).toBeVisible();
});

test("Icon workspace reflows between grid, list and export details while retaining selection", async () => {
  const page = await app.firstWindow();
  const window = await app.browserWindow(page);
  await window.evaluate((window) => window.setSize(1440, 900));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Design team", exact: false })
    .click();
  await expect(page.getByTestId("icon-card")).toHaveCount(48);
  await expect(
    page.getByRole("complementary", { name: "图标详情" }),
  ).toHaveCount(0);
  const full = await page.locator(".library-main").boundingBox();
  await page.screenshot({
    path: ".work/screenshots/icon-grid-light.png",
    scale: "css",
  });
  await page.getByTestId("icon-card").first().click();
  await expect(
    page.getByRole("heading", { name: "icon-1", exact: true }),
  ).toBeVisible();
  const split = await page.locator(".library-main").boundingBox();
  expect(split!.width).toBeLessThan(full!.width);
  await page.getByRole("button", { name: "复制图标名称" }).click();
  expect(await app.evaluate(({ clipboard }) => clipboard.readText())).toBe(
    "icon-1",
  );
  await page.getByRole("button", { name: "复制代码", exact: true }).click();
  expect(await app.evaluate(({ clipboard }) => clipboard.readText())).toContain(
    "<svg",
  );
  await page.screenshot({
    path: ".work/screenshots/icon-detail-light.png",
    scale: "css",
  });
  const viewTabs = page.locator(".view-tabs");
  const tabsStyle = await viewTabs.evaluate((element) => {
    const list = getComputedStyle(element);
    const tab = getComputedStyle(
      element.querySelector('[data-slot="tabs-trigger"]')!,
    );
    return {
      padding: list.paddingTop,
      height: list.height,
      transition: tab.transitionDuration,
    };
  });
  expect(tabsStyle.padding).toBe("3px");
  expect(tabsStyle.height).toBe("36px");
  expect(tabsStyle.transition).not.toBe("0s");
  await page.getByRole("tab", { name: "列表视图" }).click();
  await expect(page.locator(".icon-grid")).toHaveClass(/icon-list/);
  await expect(page.getByTestId("icon-card").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "切换详情面板" }).click();
  await expect(
    page.getByRole("complementary", { name: "图标详情" }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "网格视图" }).click();
  await openSettings(page, "外观设置");
  await selectValue(page, "外观主题", "dark");
  await page
    .locator(".settings-page")
    .getByRole("button", { name: "返回", exact: true })
    .click();
  await expect(page.locator(".settings-page")).toHaveCount(0);
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Design team", exact: false })
    .click();
  await page.getByTestId("icon-card").first().click();
  await page.screenshot({
    path: ".work/screenshots/icon-detail-dark.png",
    scale: "css",
  });
  await window.evaluate((window) => window.setSize(960, 640));
  await page.setViewportSize({ width: 960, height: 640 });
  await expect
    .poll(() =>
      page
        .locator(".detail")
        .evaluate(
          (panel) =>
            panel.getBoundingClientRect().right <= innerWidth &&
            panel.scrollWidth <= panel.clientWidth,
        ),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "复制代码", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "复制代码", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: ".work/screenshots/icon-detail-narrow.png",
    scale: "css",
  });
});

test("Add library matches Figma modal geometry, masks tokens, dismisses and preserves library selection", async () => {
  const page = await app.firstWindow();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Design team", exact: false })
    .click();
  await expect(page.getByTestId("icon-card")).toHaveCount(48);
  for (const theme of ["light", "dark"]) {
    await openSettings(page, "外观设置");
    await selectValue(page, "外观主题", theme);
    await page
      .locator(".settings-page")
      .getByRole("button", { name: "返回", exact: true })
      .click();
    await expect(page.locator(".settings-page")).toHaveCount(0);
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Design team", exact: false })
      .click();
    await page.getByRole("button", { name: "添加图标库", exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: "添加图标库",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("访问令牌", { exact: true })).toHaveCount(0);
    const publicBounds = await dialog.boundingBox();
    await dialog.getByRole("radio", { name: "私有仓库", exact: true }).click();
    const bounds = await dialog.boundingBox();
    expect(bounds!.width).toBe(640);
    expect(bounds!.height).toBe(
      Math.min(615, await page.evaluate(() => innerHeight - 32)),
    );
    expect(bounds!.height).toBe(publicBounds!.height);
    expect(bounds!.height).toBeLessThanOrEqual(
      await page.evaluate(() => innerHeight - 32),
    );
    const assets = await dialog.locator("img").evaluateAll((images) =>
      images.map((image) => ({
        loaded: (image as HTMLImageElement).naturalWidth > 0,
        width: image.getBoundingClientRect().width,
        height: image.getBoundingClientRect().height,
      })),
    );
    expect(assets).toHaveLength(1);
    for (const asset of assets)
      expect(asset).toEqual({ loaded: true, width: 16, height: 16 });
    await expect(dialog.locator('[data-slot="select-icon"]')).toBeVisible();
    const inputAppearance = await dialog
      .locator('[data-slot="input-wrapper"]')
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return { height: style.height, radius: style.borderRadius };
      });
    const branch = dialog.getByRole("combobox", { name: "仓库分支" });
    await expect(branch).toHaveCSS("height", inputAppearance.height);
    await expect(branch).toHaveCSS("border-radius", inputAppearance.radius);
    await expect(branch).toHaveCSS("border-width", "0px");
    await expect(
      dialog.locator('[data-slot="password-input-icon"]'),
    ).toBeVisible();
    await dialog.screenshot({
      path: `.work/screenshots/add-library-${theme}.png`,
      scale: "css",
    });
    await page.getByLabel("图标库名称").fill("Design team");
    await expect(dialog.getByText("11/20", { exact: true })).toBeVisible();
    await page.getByLabel("访问令牌", { exact: true }).fill("test-only-token");
    await expect(page.getByLabel("访问令牌", { exact: true })).toHaveAttribute(
      "type",
      "password",
    );
    await page.getByRole("button", { name: "显示令牌" }).click();
    await expect(page.getByLabel("访问令牌", { exact: true })).toHaveAttribute(
      "type",
      "text",
    );
    await page.getByRole("button", { name: "隐藏令牌" }).click();
    await expect(page.getByLabel("访问令牌", { exact: true })).toHaveAttribute(
      "type",
      "password",
    );
    await expect(
      page.getByRole("switch", { name: "开启视觉检索" }),
    ).toBeChecked();
    await page.getByRole("switch", { name: "开启视觉检索" }).click();
    await expect(
      page.getByRole("switch", { name: "开启视觉检索" }),
    ).not.toBeChecked();
    await page.getByRole("button", { name: "取消", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId("icon-card")).toHaveCount(48);
  }
  for (const close of ["Escape", "关闭添加图标库"]) {
    await page.getByRole("button", { name: "添加图标库", exact: true }).click();
    await page.getByRole("radio", { name: "私有仓库", exact: true }).click();
    await expect(page.getByLabel("访问令牌", { exact: true })).toHaveValue("");
    if (close === "Escape") await page.keyboard.press("Escape");
    else await page.getByRole("button", { name: close }).click();
    await expect(
      page.getByRole("dialog", { name: "添加图标库", exact: true }),
    ).toHaveCount(0);
  }
  await openSettings(page, "仓库管理");
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await expect(page.getByLabel("图标库名称")).toHaveValue("Design team");
  await page.getByLabel("用户名", { exact: true }).fill("test-user");
  await page.getByLabel("访问令牌", { exact: true }).fill("test-only-token");
  await page.getByRole("switch", { name: "开启视觉检索" }).click();
  await page.getByRole("button", { name: "保存配置", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "编辑图标库" })).toHaveCount(0);
  const store = new Store(directory);
  expect(store.source("repo-team")).toMatchObject({
    username: "test-user",
    allowVision: true,
  });
  expect(JSON.stringify(store.source("repo-team"))).not.toContain(
    "test-only-token",
  );
  store.close();
  if (await page.locator(".settings-page").count())
    await page
      .locator(".settings-page")
      .getByRole("button", { name: "返回", exact: true })
      .click();
  await page.getByTestId("library-tabler").click({ button: "right" });
  await page.getByRole("menuitem", { name: "移除图标库", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "移除", exact: true })
    .click();
  await expect(page.getByTestId("library-tabler")).toHaveCount(0);
  await page.getByRole("button", { name: "添加图标库", exact: true }).click();
  await page
    .getByRole("button", { name: "重新添加 Tabler Icons", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "添加图标库", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByTestId("library-tabler")).toBeVisible();
});

test("Settings sidebar follows content scrolling in both directions and at the bottom", async () => {
  const page = await app.firstWindow();
  const window = await app.browserWindow(page);
  await window.evaluate((window) => window.setSize(960, 640));
  await page.getByRole("button", { name: "设置", exact: true }).click();
  const dialog = page.locator(".settings-page");
  const content = dialog.locator(".settings-sections");
  const active = dialog.locator('.settings-menu-item[aria-current="location"]');
  await expect(active).toHaveText("通用设置");
  for (const [id, label] of [
    ["appearance", "外观"],
    ["connector", "连接器"],
    ["model", "模型配置"],
  ]) {
    await dialog.getByRole("button", { name: label, exact: true }).click();
    await expect(active).toHaveText(label);
    await expect(dialog.locator(`#settings-${id}`)).toBeInViewport();
  }
  await content.hover();
  await page.mouse.wheel(0, 3000);
  await expect(active).toHaveText("图标库");
  await page.mouse.wheel(0, -3000);
  await expect(active).toHaveText("通用设置");
  // Scroll the content directly without clicking its corresponding menu item.
  await content.evaluate((container) => {
    const heading = container.querySelector("#settings-connector")!;
    container.scrollTop +=
      heading.getBoundingClientRect().top -
      container.getBoundingClientRect().top -
      parseFloat(getComputedStyle(container).paddingTop);
  });
  await expect(active).toHaveText("连接器");
  await window.evaluate((window) => window.setSize(1200, 800));
  await expect(active).toHaveText("连接器");
});

test("Settings page navigation, persistent theme and connector copy stay usable", async () => {
  const page = await app.firstWindow();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  const dialog = page.locator(".settings-page");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".settings-menu-item")).toHaveCount(5);
  const assets = await dialog.locator(".settings-icon").evaluateAll((icons) =>
    icons.map((icon) => ({
      width: icon.getBoundingClientRect().width,
      height: icon.getBoundingClientRect().height,
      loaded: Boolean(icon.querySelector("svg path")),
    })),
  );
  expect(
    assets.every(
      (asset) => asset.loaded && asset.width === 16 && asset.height === 16,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".work/screenshots/settings-light.png",
    animations: "disabled",
  });
  await expect(
    page.getByRole("dialog", { name: "设置", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "设置分类" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "外观", exact: true }).click();
  await selectValue(page, "外观主题", "dark");
  await expect(page.locator("html")).toHaveClass("dark");
  await dialog.getByRole("button", { name: "返回", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Hello，今天想用什么图标库？" }),
  ).toBeVisible();
  await openSettings(page, "外观设置");
  await expect(page.getByLabel("外观主题")).toContainText("深色");
  const window = await app.browserWindow(page);
  await window.evaluate((window) => window.setSize(960, 640));
  await openSettings(page, "连接器");
  await dialog.getByRole("tab", { name: "其他", exact: true }).click();
  await dialog
    .getByRole("button", { name: "复制 MCP JSON", exact: true })
    .click();
  const copied = await app.evaluate(({ clipboard }) => clipboard.readText());
  expect(JSON.parse(copied).mcpServers.desicast).toBeTruthy();
  await page.screenshot({
    path: ".work/screenshots/settings-dark-narrow.png",
    animations: "disabled",
  });
  await expect(
    dialog.getByRole("button", { name: "返回", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "返回", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Design team", exact: false })
    .click();
  await page.getByLabel("搜索图标", { exact: true }).fill("search");
  await expect(page.getByTestId("icon-card")).toHaveCount(1);
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await dialog.getByRole("button", { name: "返回", exact: true }).click();
  await expect(page.getByLabel("搜索图标", { exact: true })).toHaveValue(
    "search",
  );
  await expect(page.getByTestId("icon-card")).toHaveCount(1);
});
