import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
} from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../../src/core/store";
import { createServer } from "node:http";
import sharp from "sharp";
import type { Icon, Source } from "../../src/core/types";

let app: ElectronApplication, directory: string;
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m15 15 6 6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
test.beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "iconcast-ui-"));
  const store = new Store(directory);
  const source: Source = {
    id: "repo-team",
    name: "Design team",
    kind: "repository",
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
    ICONCAST_DATA_DIR: directory,
    ICONCAST_TEST_MODE: "1",
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
  await page.getByRole("button", { name: "Design team", exact: false }).click();
  await expect(page.getByTestId("icon-card")).toHaveCount(48);
  await page.getByRole("searchbox", { name: "搜索图标" }).fill("搜索");
  await expect(page.getByTestId("icon-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "search", exact: true }),
  ).toBeVisible();
  for (const target of ["React", "Vue", "SwiftUI"]) {
    await page.getByRole("tab", { name: target, exact: true }).click();
    await page.getByRole("button", { name: "复制代码", exact: true }).click();
    const copied = await app.evaluate(({ clipboard }) => clipboard.readText());
    expect(copied).toContain(
      target === "React"
        ? "SVGProps"
        : target === "Vue"
          ? "<template>"
          : "Image(",
    );
    await expect(
      page.getByRole("button", { name: "已复制", exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(1900);
  }
  await page.screenshot({ path: ".work/screenshots/team-light.png" });
  await page.getByRole("button", { name: "MCP 连接", exact: false }).click();
  await expect(
    page.getByRole("heading", { name: "连接 Codex", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "连接 Claude Code", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "其他 MCP 客户端", exact: true }),
  ).toBeVisible();
  for (const [label, prefix] of [
    ["复制 Codex 命令", "codex mcp add iconcast"],
    ["复制 Claude Code 命令", "claude mcp add"],
  ]) {
    const button = page.getByRole("button", { name: label, exact: true });
    await expect(button).toBeEnabled();
    const shown = await button.locator("..").locator("pre").innerText();
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
      expect(copied).toContain("--transport stdio --scope user iconcast -- ");
    }
  }
  await page
    .getByRole("button", { name: "复制 MCP JSON", exact: true })
    .click();
  await expect
    .poll(() => app.evaluate(({ clipboard }) => clipboard.readText()))
    .toContain('"mcpServers"');
  const configuration = JSON.parse(
    await app.evaluate(({ clipboard }) => clipboard.readText()),
  );
  expect(configuration.mcpServers.iconcast.args).toContain(directory);
  expect(configuration.mcpServers.iconcast.env).toEqual({
    ELECTRON_RUN_AS_NODE: "1",
  });
  await page.getByRole("button", { name: "检查 MCP 连接" }).click();
  await expect(page.getByText("连接正常 · 5 个工具 · 2 个来源")).toBeVisible({
    timeout: 20_000,
  });
  await page.screenshot({ path: ".work/screenshots/mcp-light.png" });
  expect(errors).toEqual([]);
});
test("Themes, settings forms and 960px layout remain usable", async () => {
  const page = await app.firstWindow();
  await page.getByRole("button", { name: "外观设置" }).click();
  await page.getByLabel("外观主题").selectOption("dark");
  await expect(page.locator("html")).toHaveClass("dark");
  await page.getByRole("button", { name: "Design team", exact: false }).click();
  await expect(page.getByTestId("icon-card")).toHaveCount(48);
  await page.screenshot({ path: ".work/screenshots/team-dark.png" });
  const window = await app.browserWindow(page);
  await window.evaluate((window) => window.setSize(960, 640));
  await page.getByRole("button", { name: "仓库管理" }).click();
  await page.getByRole("button", { name: "添加仓库", exact: true }).click();
  await expect(page.getByLabel("仓库地址")).toBeVisible();
  await expect(page.getByRole("button", { name: "连接并同步" })).toBeVisible();
  await page.screenshot({ path: ".work/screenshots/repositories-dark.png" });
  await page.getByRole("button", { name: "视觉模型", exact: true }).click();
  await page.getByLabel("模型名称", { exact: true }).fill("vision-model");
  await page.getByLabel("允许发送图片到模型").click();
  await page.getByRole("button", { name: "保存设置" }).click();
  await expect(page.getByText("模型设置已保存")).toBeVisible();
  await page.screenshot({ path: ".work/screenshots/model-dark.png" });
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
    await page.getByRole("button", { name: "仓库管理" }).click();
    await page.getByRole("button", { name: "编辑", exact: true }).click();
    await page.getByLabel("允许团队图标发送给模型").click();
    await page.getByRole("button", { name: "保存配置" }).click();
    await page.getByRole("button", { name: "视觉模型", exact: true }).click();
    const address = server.address() as { port: number };
    await page
      .getByLabel("模型 API 地址")
      .fill(`http://127.0.0.1:${address.port}/v1`);
    await page.getByLabel("模型名称", { exact: true }).fill("fixture-vision");
    await page.getByLabel("允许发送图片到模型").click();
    await page.getByRole("button", { name: "保存设置" }).click();
    await page
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

test("Default libraries show official SVG assets, totals, theme variants and persistent change acknowledgements", async () => {
  const page = await app.firstWindow();
  for (const id of ["lucide", "tabler", "ri", "uil", "mingcute", "ic", "eva"]) {
    const row = page.getByTestId(`library-${id}`);
    await expect(row).toBeVisible();
    await row.click();
    await expect(page.getByTestId("icon-card")).toHaveAttribute(
      "title",
      `search · ${id}`,
    );
    await expect(page.locator(".filter-toolbar select")).toHaveValue(id);
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
    await page.getByRole("button", { name: "外观设置" }).click();
    await page.getByLabel("外观主题").selectOption(theme);
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

test("Repository form loads branches and cascaded directory selections without credential inputs", async () => {
  const page = await app.firstWindow();
  await page.getByRole("button", { name: "仓库管理", exact: true }).click();
  await page.getByRole("button", { name: "添加仓库", exact: true }).click();
  await expect(page.getByLabel("Git 用户名")).toHaveCount(0);
  await expect(page.getByLabel("仓库访问令牌")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "连接并同步", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("仓库地址")
    .fill("https://github.com/lucide-icons/lucide.git");
  await page.getByRole("button", { name: "读取仓库信息" }).click();
  await expect(page.getByText(/已连接 ·/)).toBeVisible({ timeout: 45000 });
  await page.getByLabel("仓库分支").selectOption("main");
  await expect(page.getByLabel("仓库分支")).toHaveValue("main");
  await expect(
    page.getByRole("button", { name: "SVG 目录", exact: true }),
  ).toBeEnabled({ timeout: 45000 });
  await page.getByRole("button", { name: "SVG 目录", exact: true }).click();
  await page.getByRole("button", { name: "packages", exact: true }).click();
  await page
    .getByLabel("选择目录 packages/lucide-react", { exact: true })
    .check();
  await page
    .getByLabel("选择目录 packages/lucide-static", { exact: true })
    .check();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "移除目录 packages/lucide-react" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "连接并同步", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "移除目录 packages/lucide-react" })
    .click();
  await page
    .getByRole("button", { name: "移除目录 packages/lucide-static" })
    .click();
  await expect(
    page.getByRole("button", { name: "连接并同步", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("仓库地址").fill("https://github.com/team/other.git");
  await expect(page.getByLabel("仓库分支")).toBeDisabled();
});
