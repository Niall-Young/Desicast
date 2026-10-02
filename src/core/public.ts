import { randomUUID } from "node:crypto";
import { Store } from "./store";
import { sanitizeSvg } from "./svg";
import type { Collection, Icon } from "./types";

export const aliases: Record<string, string> = {
  搜索: "search",
  设置: "settings",
  首页: "home",
  用户: "user",
  关闭: "close",
  添加: "plus",
  删除: "trash",
  编辑: "edit",
  下载: "download",
  上传: "upload",
  退出登录: "log-out",
  收起侧栏: "panel-left-close",
  文件夹: "folder",
  文件: "file",
  复制: "copy",
  箭头: "arrow",
  菜单: "menu",
  通知: "bell",
  收藏: "heart",
  图片: "image",
  日历: "calendar",
  锁: "lock",
  勾选: "check",
};
export function translateQuery(query: string) {
  let result = query.trim();
  for (const [key, value] of Object.entries(aliases).sort(
    (a, b) => b[0].length - a[0].length,
  ))
    result = result.replaceAll(key, value);
  return result;
}
const featured = [
  "search",
  "settings",
  "house",
  "user",
  "folder",
  "file",
  "copy",
  "check",
  "x",
  "plus",
  "arrow-right",
  "arrow-left",
  "download",
  "upload",
  "image",
  "bell",
  "heart",
  "star",
  "calendar",
  "clock",
  "mail",
  "link",
  "lock",
  "unlock",
  "menu",
  "panel-left",
  "code",
  "terminal",
  "globe",
  "git-branch",
  "layers",
  "layout-grid",
  "sliders-horizontal",
  "filter",
  "refresh-cw",
  "trash-2",
  "pencil",
  "circle-help",
  "external-link",
  "chevron-down",
  "chevron-right",
  "eye",
  "package",
  "palette",
  "sparkles",
  "circle-check",
  "circle-alert",
  "cloud",
];

export class PublicLibrary {
  constructor(
    private store: Store,
    private fetcher: typeof fetch = fetch,
    private baseUrl = "https://api.iconify.design",
  ) {}
  private directoryRequest?: Promise<Collection[]>;
  collections(force = false): Promise<Collection[]> {
    if (this.directoryRequest) return this.directoryRequest;
    this.directoryRequest = this.loadCollections(force).finally(() => {
      this.directoryRequest = undefined;
    });
    return this.directoryRequest;
  }
  private withChanges(items: Collection[]) {
    return items.map((item) => ({
      ...item,
      changes:
        this.store.setting<Collection["changes"]>(
          `collection-changes:${item.id}`,
          undefined,
        ) ?? undefined,
    }));
  }
  private async loadCollections(force: boolean): Promise<Collection[]> {
    const cached = this.store.setting<{ time: number; items: Collection[] }>(
      "collections",
      { time: 0, items: [] },
    );
    if (!force && cached.time > Date.now() - 86_400_000)
      return this.withChanges(cached.items);
    try {
      const response = await this.fetcher(`${this.baseUrl}/collections`, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error("图库目录不可用");
      const data = (await response.json()) as Record<
        string,
        {
          name: string;
          total: number;
          version?: string;
          license?: { title?: string; spdx?: string; url?: string };
          author?: { url?: string };
        }
      >;
      let modificationTimes: Record<string, number> = {};
      try {
        const modified = await this.fetcher(`${this.baseUrl}/last-modified`, {
          signal: AbortSignal.timeout(15_000),
        });
        if (modified.ok)
          modificationTimes = (await modified.json()).lastModified ?? {};
      } catch {
        /* Keep previous modification metadata when this optional endpoint is unavailable. */
      }
      const items = Object.entries(data).map(([id, info]) => ({
        id,
        name: info.name,
        total: info.total,
        version: info.version,
        lastModified:
          modificationTimes[id] ??
          cached.items.find((item) => item.id === id)?.lastModified,
        license: info.license?.spdx ?? info.license?.title,
        licenseUrl: info.license?.url,
        authorUrl: info.author?.url,
      }));
      this.store.transaction(() => {
        for (const item of items) {
          const previous = cached.items.find((old) => old.id === item.id);
          if (!previous) continue;
          const versionUpdated = Boolean(
            previous.version &&
            item.version &&
            previous.version !== item.version,
          );
          const catalogUpdated = Boolean(
            previous.lastModified &&
            item.lastModified &&
            previous.lastModified !== item.lastModified,
          );
          if (
            previous.total === item.total &&
            !versionUpdated &&
            !catalogUpdated
          )
            continue;
          const indexKey = `collection-index:${item.id}`;
          const index = this.store.setting<
            { time: number; names: string[] } | undefined
          >(indexKey, undefined);
          if (index) this.store.saveSetting(indexKey, { ...index, time: 0 });
          const key = `collection-changes:${item.id}`;
          const pending = this.store.setting<Collection["changes"]>(
            key,
            undefined,
          );
          const delta = item.total - previous.total;
          this.store.saveSetting(key, {
            revision: randomUUID(),
            detectedAt: new Date().toISOString(),
            added: (pending?.added ?? 0) + Math.max(0, delta),
            removed: (pending?.removed ?? 0) + Math.max(0, -delta),
            updated: 0,
            versionUpdated: versionUpdated || pending?.versionUpdated,
            catalogUpdated: catalogUpdated || pending?.catalogUpdated,
          });
        }
        this.store.saveSetting("collections", { time: Date.now(), items });
      });
      return this.withChanges(items);
    } catch {
      if (cached.items.length && !force) return this.withChanges(cached.items);
      throw new Error("无法获取开源图库目录，请检查网络");
    }
  }
  async get(id: string): Promise<Icon> {
    const cached = this.store.icon(id);
    const metadata = this.store
      .setting<{ items: Collection[] }>("collections", { items: [] })
      .items.find((item) => item.id === id.split(":")[1]);
    if (
      cached &&
      (!metadata || cached.publicRevision === this.publicRevision(metadata))
    )
      return cached;
    try {
      return await this.fetchIcon(id);
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  }
  private publicRevision(collection: Collection) {
    return `${collection.total}:${collection.version ?? ""}:${collection.lastModified ?? ""}`;
  }
  private async fetchIcon(id: string): Promise<Icon> {
    if (!/^public:[a-z0-9-]+:[a-z0-9-]+$/.test(id))
      throw new Error("公共图标标识无效");
    const [, prefix, name] = id.split(":");
    const collections = await this.collections(),
      collection = collections.find((item) => item.id === prefix);
    if (!collection) throw new Error("图标集不存在");
    const response = await this.fetcher(
      `${this.baseUrl}/${prefix}/${name}.svg`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!response.ok) throw new Error(`图标获取失败：${prefix}:${name}`);
    const svg = sanitizeSvg(await response.text());
    const icon: Icon = {
      id,
      name,
      sourceId: "public",
      publicRevision: this.publicRevision(collection),
      collection: prefix,
      svg,
      sourceUrl:
        collection.authorUrl ??
        `https://icon-sets.iconify.design/${prefix}/${name}/`,
      license: collection.license,
      licenseUrl: collection.licenseUrl,
    };
    this.store.cache([icon]);
    return icon;
  }
  async search(
    query: string,
    collection?: string,
    limit = 48,
    offset = 0,
  ): Promise<{ icons: Icon[]; total: number }> {
    let ids: string[], total: number;
    if (!query.trim() && !collection) {
      ids = featured.map((name) => `public:lucide:${name}`);
      total = ids.length;
    } else if (!query.trim() && collection) {
      const key = `collection-index:${collection}`;
      let index = this.store.setting<
        { time: number; names: string[] } | undefined
      >(key, undefined);
      if (!index || index.time < Date.now() - 86_400_000) {
        const response = await this.fetcher(
          `${this.baseUrl}/collection?prefix=${encodeURIComponent(collection)}`,
          { signal: AbortSignal.timeout(20_000) },
        );
        if (!response.ok) throw new Error("无法获取图库图标目录");
        const data = (await response.json()) as {
          uncategorized?: string[];
          categories?: Record<string, string[]>;
        };
        const names = [
          ...new Set([
            ...(data.uncategorized ?? []),
            ...Object.values(data.categories ?? {}).flat(),
          ]),
        ].sort();
        index = { time: Date.now(), names };
        this.store.saveSetting(key, index);
      }
      ids = index.names.map((name) => `public:${collection}:${name}`);
      total = ids.length;
    } else {
      const params = new URLSearchParams({
        query: translateQuery(query) || "icon",
        limit: String(Math.min(999, offset + limit)),
      });
      if (collection) params.set("prefix", collection);
      const response = await this.fetcher(`${this.baseUrl}/search?${params}`, {
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error("公共图标搜索失败");
      const data = (await response.json()) as {
        icons: string[];
        total?: number;
      };
      ids = data.icons.map((id) => `public:${id}`);
      total = Math.min(data.total ?? ids.length, 999);
    }
    const page = ids.slice(offset, offset + limit),
      icons: Icon[] = [];
    for (let start = 0; start < page.length; start += 12) {
      const batch = await Promise.allSettled(
        page.slice(start, start + 12).map((id) => this.get(id)),
      );
      for (const result of batch)
        if (result.status === "fulfilled") icons.push(result.value);
    }
    if (page.length && !icons.length)
      throw new Error("无法下载图标预览，请检查网络");
    return { icons, total };
  }
}
