import { randomUUID } from "node:crypto";
import { Store, defaults } from "./store";
import { PublicLibrary, translateQuery } from "./public";
import {
  repositoryUrl,
  repositoryDirectories,
  syncRepository,
} from "./repositories";
import { VisionModel, modelEndpoint, imageBuffer } from "./model";
import { exportIcon } from "./svg";
import type {
  SecretStore,
  RepositoryInput,
  Source,
  SearchInput,
  SearchResult,
  ExportInput,
  Settings,
  VisionInput,
  Icon,
} from "./types";

export class IconService {
  readonly store: Store;
  readonly publicLibrary: PublicLibrary;
  constructor(
    directory: string,
    readonly secrets: SecretStore,
    fetcher: typeof fetch = fetch,
    publicApi?: string,
  ) {
    this.store = new Store(directory);
    this.publicLibrary = new PublicLibrary(this.store, fetcher, publicApi);
  }
  async sources() {
    return Promise.all(
      this.store.sources().map(async (source) => ({
        ...source,
        hasCredential:
          source.kind === "repository" &&
          Boolean(await this.secrets.get(`repository:${source.id}`)),
      })),
    );
  }
  async settings(): Promise<Settings> {
    const settings = this.store.settings();
    return {
      ...settings,
      model: {
        ...settings.model,
        hasKey: Boolean(await this.secrets.get("model")),
      },
    };
  }
  async saveSettings(settings: Settings, apiKey?: string) {
    modelEndpoint(settings.model.baseUrl);
    if (apiKey !== undefined) {
      if (apiKey) await this.secrets.set("model", apiKey);
      else await this.secrets.delete("model");
    }
    this.store.saveSetting("preferences", {
      theme: settings.theme,
      model: {
        baseUrl: settings.model.baseUrl,
        model: settings.model.model,
        consent: settings.model.consent,
      },
    });
    return this.settings();
  }
  async addRepository(input: RepositoryInput): Promise<Source> {
    const url = repositoryUrl(input.url),
      directories = repositoryDirectories(input.directories);
    if (
      !input.name.trim() ||
      !input.branch.trim() ||
      input.branch.startsWith("-") ||
      /[\s\0]/.test(input.branch)
    )
      throw new Error("请输入有效的名称和分支");
    const source: Source = {
      id: `repo-${randomUUID()}`,
      kind: "repository",
      name: input.name.trim(),
      url,
      branch: input.branch,
      directories,
      username: input.username,
      allowVision: input.allowVision,
      iconCount: 0,
    };
    if (input.token)
      await this.secrets.set(`repository:${source.id}`, input.token);
    this.store.saveSource(source);
    return source;
  }
  async updateRepository(id: string, input: RepositoryInput) {
    const existing = this.store.source(id);
    if (!existing || existing.kind !== "repository")
      throw new Error("仓库不存在");
    repositoryUrl(input.url);
    repositoryDirectories(input.directories);
    if (
      !input.name.trim() ||
      !input.branch.trim() ||
      input.branch.startsWith("-") ||
      /[\s\0]/.test(input.branch)
    )
      throw new Error("请输入有效的名称和分支");
    if (
      this.store.db
        .prepare("SELECT 1 FROM locks WHERE key=? AND expires>?")
        .get(`sync:${id}`, Date.now())
    )
      throw new Error("请等待仓库同步完成后修改配置");
    if (input.token !== undefined) {
      if (input.token) await this.secrets.set(`repository:${id}`, input.token);
      else await this.secrets.delete(`repository:${id}`);
    }
    const source = {
      ...existing,
      name: input.name.trim(),
      url: repositoryUrl(input.url),
      branch: input.branch,
      directories: repositoryDirectories(input.directories),
      username: input.username,
      allowVision: input.allowVision,
    };
    this.store.saveSource(source);
    return source;
  }
  async removeRepository(id: string) {
    if (id === "public") throw new Error("无法移除公共图库");
    if (
      this.store.db
        .prepare("SELECT 1 FROM locks WHERE key=? AND expires>?")
        .get(`sync:${id}`, Date.now())
    )
      throw new Error("请等待同步完成再移除仓库");
    this.store.removeSource(id);
    await this.secrets.delete(`repository:${id}`);
  }
  sync(id: string) {
    return syncRepository(this.store, this.secrets, id);
  }
  collections(force = false) {
    return this.publicLibrary.collections(force);
  }
  acknowledgeChanges(id: string, revision: string) {
    this.store.acknowledgeChanges(id, revision);
  }
  async search(input: SearchInput): Promise<SearchResult> {
    const query = input.query.trim(),
      limit = Math.max(1, Math.min(input.limit ?? 48, 96)),
      offset = Math.max(0, input.offset ?? 0);
    if (input.sourceId && !this.store.source(input.sourceId))
      throw new Error("图标来源不存在");
    const translated = translateQuery(query),
      local = this.store.local(query, input.sourceId, input.collection);
    const expanded =
      translated === query
        ? local
        : [
            ...new Map(
              [
                ...local,
                ...this.store.local(
                  translated,
                  input.sourceId,
                  input.collection,
                ),
              ].map((icon) => [icon.id, icon]),
            ).values(),
          ];
    const team = expanded.filter((icon) => icon.sourceId !== "public");
    if (input.sourceId && input.sourceId !== "public")
      return { icons: team.slice(offset, offset + limit), total: team.length };
    if (team.length >= offset + limit)
      return { icons: team.slice(offset, offset + limit), total: team.length };
    try {
      const publicOffset = Math.max(0, offset - team.length),
        teamPage = team.slice(offset, offset + limit);
      const result = await this.publicLibrary.search(
        query,
        input.collection,
        limit - teamPage.length,
        publicOffset,
      );
      return {
        icons: [...teamPage, ...result.icons],
        total: team.length + result.total,
      };
    } catch {
      return {
        icons: expanded.slice(offset, offset + limit),
        total: expanded.length,
        warning: "公共图库暂时无法连接，当前显示本地缓存",
      };
    }
  }
  async getIcon(input: ExportInput) {
    const icon = input.id.startsWith("public:")
      ? await this.publicLibrary.get(input.id)
      : this.store.icon(input.id);
    if (!icon) throw new Error("图标不存在，请同步来源后重试");
    return exportIcon(icon, input);
  }
  async vision(input: VisionInput): Promise<SearchResult> {
    imageBuffer(input.dataUrl);
    const settings = await this.settings();
    if (!settings.model.consent)
      throw new Error("请在模型设置中确认图片发送范围，再使用图片搜索");
    const source = input.sourceId
      ? this.store.source(input.sourceId)
      : undefined;
    if (input.sourceId && !source) throw new Error("图标来源不存在");
    if (source && !source.allowVision)
      throw new Error("此来源已禁用模型图片搜索");
    const model = new VisionModel(
      settings.model,
      await this.secrets.get("model"),
    );
    const description = await model.describe(input.dataUrl),
      candidates: Icon[] = [];
    for (const keyword of description.keywords.slice(0, 4)) {
      const result = await this.search({
        query: keyword,
        sourceId: input.sourceId,
        collection: input.collection,
        limit: 12,
      });
      candidates.push(
        ...result.icons.filter(
          (icon) => this.store.source(icon.sourceId)?.allowVision,
        ),
      );
    }
    const distinct = [
      ...new Map(candidates.map((icon) => [icon.id, icon])).values(),
    ];
    const results = await model.rank(input.dataUrl, distinct, description);
    return {
      icons: results.slice(0, input.limit ?? 12),
      total: results.length,
      warning: !results.length
        ? "没有找到足够相似的候选，可尝试裁剪图标或改用关键词"
        : undefined,
    };
  }
  async testModel() {
    const settings = await this.settings(),
      model = new VisionModel(settings.model, await this.secrets.get("model"));
    // A real image-input request checks vision capability, not just model listing.
    const sharp = (await import("sharp")).default;
    const image = await sharp(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="20" fill="none" stroke="black" stroke-width="4"/></svg>',
      ),
    )
      .png()
      .toBuffer();
    return model.describe(`data:image/png;base64,${image.toString("base64")}`);
  }
  close() {
    this.store.close();
  }
}
