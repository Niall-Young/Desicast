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
import { publicSearchCollections } from "./search-scope";
import { libraryPreferences } from "./library-management";
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
  ModelSettings,
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
  private modelSecret(model: ModelSettings) {
    return model.id && model.id !== "legacy" ? `model:${model.id}` : "model";
  }
  private modelProviders(settings: Settings) {
    return (
      settings.modelProviders ??
      (settings.model.model.trim()
        ? [{ ...settings.model, id: settings.model.id ?? "legacy" }]
        : [])
    );
  }
  async settings(): Promise<Settings> {
    const settings = this.store.settings();
    const providers = this.modelProviders(settings);
    return {
      ...settings,
      model: {
        ...settings.model,
        consent: Boolean(settings.model.model.trim()),
        id: settings.model.id ?? (providers.length ? "legacy" : undefined),
        hasKey: Boolean(
          await this.secrets.get(this.modelSecret(settings.model)),
        ),
      },
      modelProviders: await Promise.all(
        providers.map(async (provider) => ({
          ...provider,
          hasKey: Boolean(await this.secrets.get(this.modelSecret(provider))),
        })),
      ),
    };
  }
  async saveSettings(settings: Settings, apiKey?: string) {
    modelEndpoint(settings.model.baseUrl);
    const previous = this.store.settings();
    const providers = this.modelProviders(previous);
    const model = {
      id:
        settings.model.id ??
        (settings.model.model.trim() ? "legacy" : undefined),
      baseUrl: settings.model.baseUrl,
      model: settings.model.model,
      consent: settings.model.consent,
    };
    if (model.id && !providers.some((provider) => provider.id === model.id)) {
      providers.push({ ...model, id: model.id });
    }
    if (apiKey !== undefined) {
      if (apiKey) await this.secrets.set(this.modelSecret(model), apiKey);
      else await this.secrets.delete(this.modelSecret(model));
    }
    this.store.saveSetting("preferences", {
      theme: settings.theme,
      brandColor: settings.brandColor ?? previous.brandColor ?? "grey",
      zoom: settings.zoom ?? previous.zoom ?? 100,
      model,
      modelProviders: providers.map((provider) =>
        provider.id === model.id
          ? { ...model, id: provider.id }
          : {
              id: provider.id,
              baseUrl: provider.baseUrl,
              model: provider.model,
              consent: provider.consent,
            },
      ),
    });
    return this.settings();
  }
  async addModelProvider(input: {
    baseUrl: string;
    model: string;
    apiKey?: string;
  }) {
    const baseUrl = input.baseUrl.trim(),
      name = input.model.trim();
    modelEndpoint(baseUrl);
    if (!name) throw new Error("请输入模型名称");
    const settings = this.store.settings();
    const provider = { id: randomUUID(), baseUrl, model: name, consent: true };
    if (input.apiKey)
      await this.secrets.set(this.modelSecret(provider), input.apiKey);
    this.store.saveSetting("preferences", {
      ...settings,
      model: provider,
      modelProviders: [
        ...this.modelProviders(settings).map(
          ({ id, baseUrl, model, consent }) => ({
            id,
            baseUrl,
            model,
            consent,
          }),
        ),
        provider,
      ],
    });
    return this.settings();
  }
  async selectModelProvider(id: string) {
    const settings = this.store.settings();
    const providers = this.modelProviders(settings);
    const provider = providers.find((provider) => provider.id === id);
    if (!provider) throw new Error("模型供应商不存在");
    this.store.saveSetting("preferences", {
      ...settings,
      model: { ...provider, consent: true },
      modelProviders: providers.map(({ id, baseUrl, model }) => ({
        id,
        baseUrl,
        model,
        consent: true,
      })),
    });
    return this.settings();
  }
  async removeModelProvider(id: string) {
    const settings = this.store.settings();
    const providers = this.modelProviders(settings);
    const provider = providers.find((provider) => provider.id === id);
    if (!provider) throw new Error("模型供应商不存在");
    const remaining = providers
      .filter((provider) => provider.id !== id)
      .map(({ id, baseUrl, model, consent }) => ({
        id,
        baseUrl,
        model,
        consent,
      }));
    const activeId = settings.model.id ?? "legacy";
    const active =
      remaining.find((provider) => provider.id === activeId) ?? remaining[0];
    await this.secrets.delete(this.modelSecret(provider));
    this.store.saveSetting("preferences", {
      ...settings,
      model: active ? { ...active, consent: true } : { ...defaults.model },
      modelProviders: remaining,
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
      access: input.access,
      username: input.access === "public" ? undefined : input.username,
      allowVision: input.allowVision,
      iconCount: 0,
    };
    if (input.access !== "public" && input.token)
      await this.secrets.set(`repository:${source.id}`, input.token);
    this.store.saveSource(source);
    return source;
  }
  async updateRepository(id: string, input: RepositoryInput) {
    const existing = this.store.source(id);
    if (!existing || existing.kind !== "repository")
      throw new Error("仓库不存在");
    const access = input.access ?? existing.access;
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
    if (access === "public") {
      await this.secrets.delete(`repository:${id}`);
    } else if (input.token !== undefined) {
      if (input.token) await this.secrets.set(`repository:${id}`, input.token);
      else await this.secrets.delete(`repository:${id}`);
    }
    const source = {
      ...existing,
      name: input.name.trim(),
      url: repositoryUrl(input.url),
      branch: input.branch,
      directories: repositoryDirectories(input.directories),
      access,
      username: access === "public" ? undefined : input.username,
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
    return this.searchIcons(input);
  }
  private async searchIcons(
    input: SearchInput,
    visionOnly = false,
  ): Promise<SearchResult> {
    const query = input.query.trim(),
      limit = Math.max(1, Math.min(input.limit ?? 48, 96)),
      offset = Math.max(0, input.offset ?? 0);
    if (input.sourceId && !this.store.source(input.sourceId))
      throw new Error("图标来源不存在");
    const preferences = libraryPreferences(this.store);
    const publicCollections = publicSearchCollections.filter(
      (id) => !preferences[id]?.hidden,
    );
    const isEligible = (icon: Icon) => {
      const source = this.store.source(icon.sourceId);
      if (!source || (visionOnly && !source.allowVision)) return false;
      return icon.sourceId === "public"
        ? publicCollections.some((id) => id === icon.collection)
        : source.kind === "repository" && !preferences[source.id]?.hidden;
    };
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
    const eligible = expanded.filter(isEligible);
    const team = eligible.filter((icon) => icon.sourceId !== "public");
    if (
      (input.sourceId && input.sourceId !== "public") ||
      !publicCollections.length ||
      (input.collection &&
        !publicCollections.some((id) => id === input.collection)) ||
      (visionOnly && !this.store.source("public")?.allowVision)
    )
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
        publicCollections,
      );
      return {
        icons: [...teamPage, ...result.icons.filter(isEligible)],
        total: team.length + result.total,
      };
    } catch {
      return {
        icons: eligible.slice(offset, offset + limit),
        total: eligible.length,
        warning: eligible.length
          ? "公共图库检索失败，当前显示匹配的本地缓存"
          : "公共图库检索失败，暂时无法获取结果",
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
      await this.secrets.get(this.modelSecret(settings.model)),
    );
    const description = await model.describe(input.dataUrl);
    const keywords = description.keywords;
    // Combine the subject with its modifiers: "ad circle" finds ad-circle,
    // whereas separate searches for "ad" and "circle" bury it in generic hits.
    const queries = [
      ...new Set([
        ...keywords.slice(1).map((keyword) => `${keywords[0]} ${keyword}`),
        ...keywords,
      ]),
    ];
    const groups: Icon[][] = [];
    let failedQueries = 0;
    for (let start = 0; start < queries.length; start += 3) {
      const batch = await Promise.all(
        queries.slice(start, start + 3).map(async (query) => {
          const result = await this.searchIcons(
            {
              query,
              sourceId: input.sourceId,
              collection: input.collection,
              limit: 12,
            },
            true,
          );
          if (result.warning) failedQueries++;
          return result.icons.filter(
            (icon) => this.store.source(icon.sourceId)?.allowVision,
          );
        }),
      );
      groups.push(...batch);
    }
    // Interleave groups before applying the sheet limit so later shape queries
    // are represented instead of being discarded after the first two keywords.
    const distinct: Icon[] = [];
    const seen = new Set<string>();
    for (let index = 0; index < 12 && distinct.length < 48; index++) {
      for (const group of groups) {
        const icon = group[index];
        if (!icon || seen.has(icon.id)) continue;
        seen.add(icon.id);
        distinct.push(icon);
        if (distinct.length === 48) break;
      }
    }
    const results = await model.rank(input.dataUrl, distinct, description);
    return {
      icons: results.slice(0, input.limit ?? 12),
      total: results.length,
      warning:
        [
          ...(failedQueries
            ? [
                failedQueries < queries.length
                  ? "部分公共图库检索失败，结果可能不完整"
                  : distinct.length
                    ? "公共图库检索失败，当前仅使用本地缓存候选"
                    : "公共图库检索失败，未获取到候选图标",
              ]
            : []),
          ...(!results.length
            ? ["没有找到足够相似的候选，可尝试裁剪图标或改用关键词"]
            : []),
        ].join("；") || undefined,
    };
  }
  async testModel(draft?: { baseUrl: string; model: string; apiKey?: string }) {
    const settings = await this.settings();
    const config = draft
      ? {
          baseUrl: draft.baseUrl.trim(),
          model: draft.model.trim(),
          consent: true,
        }
      : settings.model;
    modelEndpoint(config.baseUrl);
    const model = new VisionModel(
      config,
      draft ? draft.apiKey : await this.secrets.get(this.modelSecret(config)),
    );
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
