import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import { parse, compileScript } from "@vue/compiler-sfc";
import { exportIcon } from "../../src/core/svg";
import type { Icon } from "../../src/core/types";

test("HTML, React and Vue exports render gradients and independent repeated instances", async () => {
  const folder = resolve(".work/export-fixtures");
  await mkdir(folder, { recursive: true });
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="paint"><stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#00f"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="4" fill="url(\'#paint\')"/></svg>';
  const icon: Icon = {
    id: "team:gradient.svg",
    name: "gradient",
    sourceId: "team",
    collection: "Team",
    sourceUrl: "https://github.com/team/icons",
    svg,
  };
  const react = exportIcon(icon, { id: icon.id, target: "react", size: 96 });
  await writeFile(
    join(folder, "react.tsx"),
    `${react.code}\nimport { createRoot } from 'react-dom/client';\ncreateRoot(document.getElementById('root')!).render(<><IconGradient/><IconGradient/></>);`,
  );
  const vue = exportIcon(icon, { id: icon.id, target: "vue", size: 96 }),
    parsed = parse(vue.code),
    compiled = compileScript(parsed.descriptor, {
      id: "example",
      inlineTemplate: true,
      genDefaultAs: "IconGradient",
    });
  await writeFile(
    join(folder, "vue.ts"),
    `${compiled.content}\nimport {createApp,h} from 'vue';\ncreateApp({render:()=>h('div',[h(IconGradient),h(IconGradient)])}).mount('#root');`,
  );
  await build({
    entryPoints: [join(folder, "react.tsx"), join(folder, "vue.ts")],
    outdir: folder,
    bundle: true,
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  for (const target of ["react", "vue"])
    await writeFile(
      join(folder, `${target}.html`),
      `<!doctype html><html><body><div id="root"></div><script src="./${target}.js"></script></body></html>`,
    );
  const html = exportIcon(icon, { id: icon.id, target: "html", size: 96 }),
    second = exportIcon(
      { ...icon, id: "team:second.svg" },
      { id: "team:second.svg", target: "html", size: 96 },
    );
  await writeFile(
    join(folder, "html.html"),
    `<!doctype html><html><body>${html.code}${second.code}</body></html>`,
  );
  const directory = await mkdtemp(join(tmpdir(), "iconcast-export-ui-"));
  const env = Object.fromEntries(
    Object.entries({
      ...process.env,
      ICONCAST_DATA_DIR: directory,
      ICONCAST_TEST_MODE: "1",
    }).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: ["."], env });
  try {
    await app.firstWindow();
    for (const target of ["html", "react", "vue"]) {
      const next = app.waitForEvent("window");
      await app.evaluate(
        async ({ BrowserWindow }, path) => {
          const window = new BrowserWindow({
            width: 500,
            height: 300,
            show: false,
            webPreferences: { nodeIntegration: false },
          });
          await window.loadFile(path);
        },
        join(folder, `${target}.html`),
      );
      const page = await next;
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      await expect(page.locator("svg")).toHaveCount(2);
      const ids = await page
        .locator("linearGradient")
        .evaluateAll((nodes) => nodes.map((node) => node.id));
      expect(new Set(ids).size).toBe(2);
      const fills = await page
        .locator("svg > rect")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("fill")));
      expect(fills).toEqual(ids.map((id) => `url(#${id})`));
      const colors = await page
        .locator("stop")
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("stop-color")),
        );
      expect(colors).toEqual(["#f00", "#00f", "#f00", "#00f"]);
      await page.screenshot({ path: `.work/screenshots/export-${target}.png` });
      expect(errors).toEqual([]);
      const window = await app.browserWindow(page);
      await window.evaluate((window) => window.close());
    }
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
