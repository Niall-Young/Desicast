import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  clipboard,
  shell,
  nativeTheme,
} from "electron";
import { join, resolve, sep } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import { browseRepository } from "../core/repository-access";
import { IconService } from "../core/service";
import {
  libraryPreferences,
  saveLibraryPreference,
} from "../core/library-management";
import { KeychainSecrets, MemorySecrets } from "../core/secrets";
import {
  searchSchema,
  exportSchema,
  repositorySchema,
  settingsSchema,
  visionSchema,
} from "../core/contracts";
import type { ExportResult } from "../core/types";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { readClipboardImage } from "./clipboard-image";

app.setName("DesiCast");
const dataDirectory =
  process.env.DESICAST_DATA_DIR || join(app.getPath("appData"), "DesiCast");
app.setPath("userData", dataDirectory);
let service: IconService, window: BrowserWindow | undefined;
const testMode = process.env.DESICAST_TEST_MODE === "1" && !app.isPackaged;
function mcpInfo() {
  const command = app.isPackaged
    ? join(process.resourcesPath, "desicast-mcp")
    : process.execPath;
  const args = app.isPackaged
    ? []
    : [join(app.getAppPath(), "dist/mcp/server.mjs")];
  const env = app.isPackaged ? {} : { ELECTRON_RUN_AS_NODE: "1" };
  const allArgs = [...args, "--data-dir", dataDirectory];
  const quote = (s: string) => `'${s.replaceAll("'", "'\\''")}'`;
  return {
    command,
    args: allArgs,
    env,
    configuration: JSON.stringify(
      {
        mcpServers: {
          desicast: {
            command,
            args: allArgs,
            ...(app.isPackaged ? {} : { env }),
          },
        },
      },
      null,
      2,
    ),
    codexCommand: `codex mcp add desicast ${app.isPackaged ? "" : "--env ELECTRON_RUN_AS_NODE=1 "}-- ${[command, ...allArgs].map(quote).join(" ")}`,
    claudeCommand: `claude mcp add ${app.isPackaged ? "" : "--env ELECTRON_RUN_AS_NODE=1 "}--transport stdio --scope user desicast -- ${[command, ...allArgs].map(quote).join(" ")}`,
    dataDirectory,
    packaged: app.isPackaged,
  };
}
async function exportFiles(result: ExportResult) {
  const selection = await dialog.showOpenDialog(window!, {
    title: "选择资源导出目录",
    properties: ["openDirectory", "createDirectory"],
  });
  if (selection.canceled) return { canceled: true };
  const root = join(
    selection.filePaths[0],
    `DesiCast-${result.icon.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
  );
  if (
    result.files.some(
      (file) =>
        file.path.startsWith("/") || file.path.split("/").includes(".."),
    )
  )
    throw new Error("导出路径无效");
  // Export into a fresh child to avoid silently overwriting user files.
  let output = root;
  try {
    await mkdir(output);
  } catch {
    output = `${root}-${Date.now()}`;
    await mkdir(output);
  }
  for (const file of result.files) {
    const path = resolve(output, file.path);
    if (!path.startsWith(output + sep)) throw new Error("导出路径越界");
    await mkdir(resolve(path, ".."), { recursive: true });
    await writeFile(path, file.content, "utf8");
  }
  return { canceled: false, path: output };
}
async function call(method: string, input: unknown) {
  switch (method) {
    case "libraryPreferences":
      return libraryPreferences(service.store);
    case "saveLibraryPreference":
      return saveLibraryPreference(service.store, input);
    case "sources":
      return service.sources();
    case "collections":
      return service.collections(input === true);
    case "acknowledgeChanges": {
      const value = z
        .object({ id: z.string(), revision: z.string() })
        .parse(input);
      return service.acknowledgeChanges(value.id, value.revision);
    }
    case "settings":
      return {
        ...(await service.settings()),
        systemDark: nativeTheme.shouldUseDarkColors,
      };
    case "saveSettings": {
      const value = z
        .object({ settings: settingsSchema, apiKey: z.string().optional() })
        .parse(input);
      const saved = await service.saveSettings(value.settings, value.apiKey);
      window?.webContents.setZoomFactor((saved.zoom ?? 100) / 100);
      return saved;
    }
    case "search":
      return service.search(searchSchema.parse(input));
    case "getIcon":
      return service.getIcon(exportSchema.parse(input));
    case "browseRepository": {
      const value = z
        .object({
          sourceId: z.string().optional(),
          url: z.string().max(2000),
          branch: z.string().max(200).optional(),
          username: z.string().max(200).optional(),
          token: z.string().max(4096).optional(),
        })
        .parse(input);
      const source = value.sourceId
        ? service.store.source(value.sourceId)
        : undefined;
      const savedToken =
        source?.kind === "repository" && source.url === value.url
          ? await service.secrets.get(`repository:${source.id}`)
          : undefined;
      const token = value.token || savedToken;
      return browseRepository(
        value.url,
        value.branch,
        token
          ? {
              username: value.username || source?.username || "oauth2",
              password: token,
              method: "访问令牌",
            }
          : undefined,
      );
    }
    case "addRepository": {
      const source = await service.addRepository(repositorySchema.parse(input));
      service.sync(source.id).catch(() => {});
      return source;
    }
    case "updateRepository": {
      const value = z
        .object({ id: z.string(), repository: repositorySchema })
        .parse(input);
      return service.updateRepository(value.id, value.repository);
    }
    case "removeRepository":
      return service.removeRepository(z.string().parse(input));
    case "sync":
      return service.sync(z.string().parse(input));
    case "vision":
      return service.vision(visionSchema.parse(input));
    case "addModelProvider":
      return service.addModelProvider(
        z
          .object({
            baseUrl: z.string().min(1).max(2000),
            model: z.string().min(1).max(200),
            apiKey: z.string().max(4096).optional(),
          })
          .parse(input),
      );
    case "selectModelProvider":
      return service.selectModelProvider(
        z.string().min(1).max(100).parse(input),
      );
    case "removeModelProvider":
      return service.removeModelProvider(
        z.string().min(1).max(100).parse(input),
      );
    case "testModel":
      return service.testModel(
        input === undefined
          ? undefined
          : z
              .object({
                baseUrl: z.string().min(1).max(2000),
                model: z.string().min(1).max(200),
                apiKey: z.string().max(4096).optional(),
              })
              .parse(input),
      );
    case "mcpInfo":
      return mcpInfo();
    case "mcpCheck": {
      const info = mcpInfo(),
        client = new Client({
          name: "desicast-desktop-check",
          version: "0.1.0",
        });
      const env = Object.fromEntries(
        Object.entries({ ...process.env, ...info.env }).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      );
      const transport = new StdioClientTransport({
        command: info.command,
        args: info.args,
        env,
        stderr: "pipe",
      });
      try {
        await client.connect(transport);
        const tools = await client.listTools();
        const response = await client.callTool({
          name: "list_sources",
          arguments: {},
        });
        if (response.isError) throw new Error("MCP 来源读取失败");
        const text = response.content as { type: string; text?: string }[];
        const sources = JSON.parse(
          text.find((item) => item.type === "text")?.text ?? "[]",
        );
        return { tools: tools.tools.length, sourceCount: sources.length };
      } finally {
        await client.close();
      }
    }
    case "clipboardImage":
      return readClipboardImage(await clipboard.read());
    case "copy":
      clipboard.writeText(z.string().max(2_000_000).parse(input));
      return true;
    case "export":
      return exportFiles(await service.getIcon(exportSchema.parse(input)));
    case "openUrl": {
      const url = new URL(z.string().parse(input));
      if (url.protocol !== "https:") throw new Error("只能打开 HTTPS 链接");
      await shell.openExternal(url.toString());
      return true;
    }
    case "reveal": {
      const path = z.string().parse(input);
      if (!path.startsWith(dataDirectory + sep)) throw new Error("路径无效");
      shell.showItemInFolder(path);
      return true;
    }
    default:
      throw new Error("未知操作");
  }
}
function createWindow() {
  window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "DesiCast",
    titleBarStyle: "hiddenInset",
    // 19px top margin + 7px native control radius = 26px navigation center
    trafficLightPosition: { x: 20, y: 19 },
    backgroundColor: "#ffffff",
    webPreferences: {
      zoomFactor: (service.store.settings().zoom ?? 100) / 100,
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.on("closed", () => {
    window = undefined;
  });
  if (process.env.DESICAST_DEV_URL && !app.isPackaged)
    window.loadURL(process.env.DESICAST_DEV_URL);
  else window.loadFile(join(__dirname, "../renderer/index.html"));
}
async function bootstrap() {
  await app.whenReady();
  if (!app.isPackaged && process.platform === "darwin")
    app.dock?.setIcon(join(app.getAppPath(), "assets/icon.png"));
  if (!app.requestSingleInstanceLock()) {
    app.quit();
  } else {
    service = new IconService(
      dataDirectory,
      testMode ? new MemorySecrets() : new KeychainSecrets(),
    );
    ipcMain.handle("desicast:call", async (event, method, input) => {
      if (
        event.sender !== window?.webContents ||
        event.senderFrame !== window.webContents.mainFrame
      )
        return { ok: false, error: "无权调用" };
      try {
        return { ok: true, value: await call(method, input) };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "操作失败",
        };
      }
    });
    createWindow();
    if (!testMode)
      for (const source of service.store
        .sources()
        .filter((source) => source.kind === "repository"))
        service.sync(source.id).catch(() => {});
    app.on("activate", () => {
      if (!window) createWindow();
    });
    app.on("second-instance", () => {
      window?.show();
      window?.focus();
    });
    app.on("window-all-closed", () => app.quit());
    app.on("will-quit", () => service.close());
  }
}
bootstrap().catch((error) => {
  console.error(error instanceof Error ? error.message : "启动失败");
  app.quit();
});
