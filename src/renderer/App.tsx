import { defaultLibraries, changeDescription } from "./libraries";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  SearchRegular,
  Settings1Regular,
  FolderRegular,
  CopyRegular,
  DownloadRegular,
  AddRegular,
  CloseRegular,
  Refresh1Regular,
  PicRegular,
  LinkRegular,
  CodeRegular,
  TerminalRegular,
  ArrowRightRegular,
  GridRegular,
  LeftRegular,
  RightRegular,
  CheckRegular,
} from "@mingcute/react/core-regular";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { SearchBox } from "@/components/ui/search-box";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { StatusIndicator } from "@/components/ui/status-indicator";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type {
  Collection,
  LibraryChanges,
  ExportResult,
  Icon,
  RepositoryInput,
  SearchResult,
  Settings,
  Source,
  Target,
} from "../core/types";
import {
  api,
  initialSettings,
  svgUrl,
  isMonochrome,
  type MCPInfo,
} from "./api";

type Page = "library" | "repositories" | "model" | "mcp" | "appearance";
const targets: Target[] = ["svg", "html", "react", "vue", "swiftui"];
const labels: Record<Target, string> = {
  svg: "SVG",
  html: "HTML",
  react: "React",
  vue: "Vue",
  swiftui: "SwiftUI",
};
function Glyph({ children }: { children: ReactNode }) {
  return <span className="glyph">{children}</span>;
}
function ChangeBadge({ changes }: { changes?: LibraryChanges }) {
  if (!changes) return null;
  return (
    <span
      className="library-change-dot"
      role="img"
      aria-label={`未读变更：${changeDescription(changes)}`}
      title={changeDescription(changes)}
    />
  );
}
function Logo() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 25 25"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="9" height="9" rx="2" fill="currentColor" />
      <rect x="14" y="1" width="9" height="9" rx="4.5" fill="currentColor" />
      <rect x="1" y="14" width="9" height="9" rx="2" fill="currentColor" />
      <path d="M18.5 13L24 18.5L18.5 24L13 18.5L18.5 13Z" fill="currentColor" />
    </svg>
  );
}
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-title">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function App() {
  const [page, setPage] = useState<Page>("library"),
    [sources, setSources] = useState<Source[]>([]),
    [collections, setCollections] = useState<Collection[]>([]),
    [settings, setSettings] = useState<Settings>(initialSettings);
  const [sourceId, setSourceId] = useState(""),
    [collection, setCollection] = useState(""),
    [query, setQuery] = useState(""),
    [offset, setOffset] = useState(0),
    [result, setResult] = useState<SearchResult>({ icons: [], total: 0 }),
    [selected, setSelected] = useState<Icon>(),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const [target, setTarget] = useState<Target>("svg"),
    [size, setSize] = useState(24),
    [color, setColor] = useState("currentColor"),
    [exported, setExported] = useState<ExportResult>(),
    [copyState, setCopyState] = useState(false),
    [detailOpen, setDetailOpen] = useState(true);
  const [reference, setReference] = useState<string>(),
    [visionResult, setVisionResult] = useState(false),
    [cropOpen, setCropOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null),
    generation = useRef(0),
    searchInput = useRef<HTMLInputElement>(null),
    syncing = useRef(new Set<string>());
  const sourceSnapshot = useRef(""),
    catalogSnapshot = useRef("");
  const refreshSources = () =>
    api<Source[]>("sources").then((value) => {
      const next = JSON.stringify(
        value.map((source) => [source.id, source.commit, source.iconCount]),
      );
      if (sourceSnapshot.current && sourceSnapshot.current !== next)
        setRevision((revision) => revision + 1);
      sourceSnapshot.current = next;
      setSources(value);
    });
  const refreshCollections = (force = false) =>
    api<Collection[]>("collections", force).then((value) => {
      const next = JSON.stringify(
        value.map((item) => [
          item.id,
          item.total,
          item.version,
          item.lastModified,
        ]),
      );
      if (catalogSnapshot.current && catalogSnapshot.current !== next)
        setRevision((revision) => revision + 1);
      catalogSnapshot.current = next;
      setCollections(value);
    });
  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 3500);
  };
  const report = (err: unknown) =>
    setError(err instanceof Error ? err.message : "操作失败");
  useEffect(() => {
    refreshSources().catch(report);
    api<Settings>("settings").then(setSettings).catch(report);
    refreshCollections().catch(() => {});
    const collectionTimer = setInterval(
      () => refreshCollections(true).catch(() => {}),
      3_600_000,
    );
    const timer = setInterval(() => refreshSources().catch(() => {}), 4000);
    return () => {
      clearInterval(timer);
      clearInterval(collectionTimer);
    };
  }, []);
  useEffect(() => {
    if (
      sourceSnapshot.current &&
      sourceId &&
      !sources.some((source) => source.id === sourceId)
    ) {
      setSourceId("");
      setCollection("");
      setOffset(0);
    }
  }, [sources, sourceId]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.classList.toggle(
        "dark",
        settings.theme === "dark" ||
          (settings.theme === "system" && media.matches),
      );
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings.theme]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setPage("library");
        requestAnimationFrame(() => searchInput.current?.focus());
      }
      if (event.key === "Escape") {
        setCropOpen(false);
        setError("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    if (page !== "library") return;
    const current = ++generation.current;
    const timer = setTimeout(() => {
      setBusy(true);
      setError("");
      setVisionResult(false);
      api<SearchResult>("search", {
        query,
        sourceId: sourceId || undefined,
        collection: collection || undefined,
        limit: 48,
        offset,
      })
        .then((value) => {
          if (current !== generation.current) return;
          setResult(value);
          setSelected(
            (previous) =>
              value.icons.find((icon) => icon.id === previous?.id) ??
              value.icons[0],
          );
        })
        .catch((err) => {
          if (current === generation.current) report(err);
        })
        .finally(() => {
          if (current === generation.current) setBusy(false);
        });
    }, 220);
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [query, sourceId, collection, offset, revision, page]);
  useEffect(() => {
    let alive = true;
    setExported(undefined);
    if (selected)
      api<ExportResult>("getIcon", {
        id: selected.id,
        target,
        size,
        color: color === "original" ? undefined : color,
      })
        .then((value) => {
          if (alive) setExported(value);
        })
        .catch(report);
    return () => {
      alive = false;
    };
  }, [selected?.id, selected?.svg, target, size, color]);
  function chooseSource(id: string) {
    setSourceId(id);
    setCollection("");
    setOffset(0);
    setQuery("");
    setPage("library");
  }
  async function acknowledgeChanges() {
    if (!activeChanges) return;
    try {
      await api("acknowledgeChanges", {
        id: collection ? `public:${collection}` : sourceId,
        revision: activeChanges.revision,
      });
      await refreshSources();
      await refreshCollections();
    } catch (err) {
      report(err);
    }
  }
  async function refreshLibrary() {
    if (activeSource?.kind === "repository") return sync(activeSource);
    try {
      await refreshCollections(true);
      setRevision((value) => value + 1);
      flash("图库目录已更新");
    } catch (err) {
      report(err);
    }
  }
  async function sync(source: Source) {
    if (syncing.current.has(source.id)) return;
    syncing.current.add(source.id);
    setError("");
    flash(`正在同步 ${source.name}`);
    try {
      await api("sync", source.id);
      flash("仓库已同步");
      setRevision((value) => value + 1);
    } catch (err) {
      report(err);
    } finally {
      syncing.current.delete(source.id);
      refreshSources();
    }
  }
  async function loadFile(file: File) {
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError("请选择小于 8 MB 的 PNG、JPEG 或 WebP");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReference(String(reader.result));
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  }
  async function searchImage(dataUrl: string) {
    setReference(dataUrl);
    setCropOpen(false);
    if (!settings.model.model || !settings.model.consent) {
      setPage("model");
      flash("请先配置视觉模型并确认图片发送范围");
      return;
    }
    const current = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const value = await api<SearchResult>("vision", {
        dataUrl,
        sourceId: sourceId || undefined,
        collection: collection || undefined,
      });
      if (current !== generation.current) return;
      setResult(value);
      setSelected(value.icons[0]);
      setVisionResult(true);
    } catch (err) {
      if (current === generation.current) report(err);
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  async function copy() {
    if (!exported) return;
    try {
      await api("copy", exported.code);
      setCopyState(true);
      setTimeout(() => setCopyState(false), 1800);
    } catch (err) {
      report(err);
    }
  }
  async function download() {
    if (!selected) return;
    try {
      const value = await api<{ canceled: boolean; path?: string }>("export", {
        id: selected.id,
        target,
        size,
        color: color === "original" ? undefined : color,
      });
      if (!value.canceled) flash(`已导出到 ${value.path}`);
    } catch (err) {
      report(err);
    }
  }
  const activeSource = sources.find((source) => source.id === sourceId),
    heading =
      defaultLibraries.find((item) => item.id === collection)?.name ??
      collections.find((item) => item.id === collection)?.name ??
      activeSource?.name ??
      "全部图标";
  const activeChanges = collection
    ? collections.find((item) => item.id === collection)?.changes
    : activeSource?.changes;
  const teams = sources.filter((source) => source.kind === "repository");
  const titles: Record<Page, string> = {
    library: heading,
    repositories: "团队仓库",
    model: "视觉模型",
    mcp: "MCP 连接",
    appearance: "外观",
  };
  return (
    <div
      className="app"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (event.dataTransfer.files[0]) loadFile(event.dataTransfer.files[0]);
      }}
      onPaste={(event) => {
        const file = Array.from(event.clipboardData.items)
          .find((item) => item.type.startsWith("image/"))
          ?.getAsFile();
        if (file) {
          event.preventDefault();
          loadFile(file);
        }
      }}
    >
      <header className="titlebar">
        <span className="window-title">Iconcast</span>
        <span className="titlebar-end">你的图标，随处可用</span>
      </header>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <Logo />
            <span>Iconcast</span>
            <span className="version">0.1</span>
          </div>
          <div className="nav-caption">工作空间</div>
          <button
            className={`nav-item ${page === "library" && !sourceId ? "active" : ""}`}
            onClick={() => chooseSource("")}
          >
            <Glyph>
              <GridRegular />
            </Glyph>
            <span>全部图标</span>
          </button>
          <button
            className={`nav-item ${page === "library" && sourceId === "public" && !collection ? "active" : ""}`}
            onClick={() => chooseSource("public")}
          >
            <Glyph>
              <SearchRegular />
            </Glyph>
            <span>开源图库</span>
            <span className="nav-count">
              {collections.length
                ? collections
                    .reduce((sum, item) => sum + item.total, 0)
                    .toLocaleString()
                : "—"}
            </span>
          </button>
          <div className="nav-caption public-heading">默认图库</div>
          {defaultLibraries.map((library) => {
            const metadata = collections.find((item) => item.id === library.id);
            return (
              <button
                key={library.id}
                data-testid={`library-${library.id}`}
                className={`nav-item ${page === "library" && sourceId === "public" && collection === library.id ? "active" : ""}`}
                title={`${library.name} · ${metadata ? metadata.total.toLocaleString() + " 个图标" : "数量暂不可用"}${metadata?.changes ? " · " + changeDescription(metadata.changes) : ""}`}
                onClick={() => {
                  chooseSource("public");
                  setCollection(library.id);
                }}
              >
                <span className="library-mark" aria-hidden="true">
                  {library.monochrome ? (
                    <span
                      className="library-mark-mask"
                      style={{ maskImage: `url("${library.mark}")` }}
                    />
                  ) : (
                    <>
                      <img
                        className={library.darkMark ? "mark-light" : ""}
                        src={library.mark}
                        alt=""
                      />
                      {library.darkMark && (
                        <img
                          className="mark-dark"
                          src={library.darkMark}
                          alt=""
                        />
                      )}
                    </>
                  )}
                </span>
                <span>{library.name}</span>
                <ChangeBadge changes={metadata?.changes} />
                <span className="nav-count">
                  {metadata ? metadata.total.toLocaleString() : "—"}
                </span>
              </button>
            );
          })}
          <div className="nav-caption team-heading">
            <span>团队图库</span>
            <IconButton
              size="sm"
              kind="plain"
              aria-label="添加团队仓库"
              onClick={() => setPage("repositories")}
            >
              <AddRegular size={16} />
            </IconButton>
          </div>
          {teams.length ? (
            teams.map((source) => (
              <button
                key={source.id}
                className={`nav-item ${page === "library" && sourceId === source.id ? "active" : ""}`}
                onClick={() => chooseSource(source.id)}
                title={source.name}
              >
                <Glyph>
                  <FolderRegular />
                </Glyph>
                <span>{source.name}</span>
                <ChangeBadge changes={source.changes} />
                <span className="nav-count">
                  {source.iconCount.toLocaleString()}
                </span>
              </button>
            ))
          ) : (
            <div className="sidebar-empty">
              <p>把团队的 SVG 带进来</p>
              <Button
                kind="plain"
                size="sm"
                onClick={() => setPage("repositories")}
              >
                连接 Git 仓库 <ArrowRightRegular size={14} />
              </Button>
            </div>
          )}
          <div className="sidebar-bottom">
            <button
              className={`nav-item ${page === "mcp" ? "active" : ""}`}
              onClick={() => setPage("mcp")}
            >
              <Glyph>
                <LinkRegular />
              </Glyph>
              <span>MCP 连接</span>
              <span className="tiny-badge">AI</span>
            </button>
            <button
              className={`nav-item ${page === "repositories" ? "active" : ""}`}
              onClick={() => setPage("repositories")}
            >
              <Glyph>
                <FolderRegular />
              </Glyph>
              <span>仓库管理</span>
            </button>
            <button
              className={`nav-item ${page === "model" ? "active" : ""}`}
              onClick={() => setPage("model")}
            >
              <Glyph>
                <PicRegular />
              </Glyph>
              <span>视觉模型</span>
            </button>
            <button
              className={`nav-item ${page === "appearance" ? "active" : ""}`}
              onClick={() => setPage("appearance")}
            >
              <Glyph>
                <Settings1Regular />
              </Glyph>
              <span>外观设置</span>
            </button>
            <div className="sidebar-foot">
              <span className="local-dot" />
              本地优先<span>⌘ K 搜索</span>
            </div>
          </div>
        </aside>
        <main className="workspace">
          {page === "library" && activeChanges && (
            <div className="library-change-notice" role="status">
              <span>
                {heading}：{changeDescription(activeChanges)}
                {collection ? "（目录变更）" : ""}
              </span>
              <Button kind="plain" size="sm" onClick={acknowledgeChanges}>
                标记已读
              </Button>
            </div>
          )}
          <div className="page-heading">
            <div className="heading-title">
              {titles[page]}
              {page === "library" && (
                <span className="heading-meta">
                  {activeSource?.kind === "repository"
                    ? "团队 SVG"
                    : "公共与团队 SVG"}
                </span>
              )}
            </div>
            <div className="heading-actions">
              {page === "library" && (
                <>
                  <IconButton
                    kind="plain"
                    aria-label="刷新图库"
                    onClick={refreshLibrary}
                  >
                    <Refresh1Regular size={16} />
                  </IconButton>
                  <IconButton
                    kind="plain"
                    selected={detailOpen}
                    aria-label="切换详情面板"
                    onClick={() => setDetailOpen((value) => !value)}
                  >
                    <CodeRegular size={16} />
                  </IconButton>
                </>
              )}
            </div>
          </div>
          {error && (
            <div className="banner error" role="alert">
              <span>{error}</span>
              <IconButton
                kind="plain"
                size="sm"
                aria-label="关闭错误提示"
                onClick={() => setError("")}
              >
                <CloseRegular size={16} />
              </IconButton>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              <CheckRegular size={15} />
              {notice}
            </div>
          )}
          {page === "library" ? (
            <div className="library-layout">
              <section className="library-main">
                <div className="search-toolbar">
                  <SearchBox
                    ref={searchInput}
                    wrapperClassName="main-search"
                    size="lg"
                    aria-label="搜索图标"
                    placeholder="搜索图标，比如 search、设置、箭头…"
                    value={query}
                    onValueChange={(value) => {
                      setQuery(value);
                      setOffset(0);
                    }}
                  />
                  <Button
                    kind="ghost"
                    size="lg"
                    leftIcon={<PicRegular size={16} />}
                    onClick={() => fileInput.current?.click()}
                  >
                    以图搜图
                  </Button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(event) => {
                      if (event.target.files?.[0])
                        loadFile(event.target.files[0]);
                      event.target.value = "";
                    }}
                  />
                </div>
                <div className="filter-toolbar">
                  <div className="filter-left">
                    <NativeSelect
                      size="sm"
                      aria-label="图标集"
                      value={collection}
                      onChange={(event) => {
                        setCollection(event.target.value);
                        setOffset(0);
                      }}
                      disabled={Boolean(activeSource?.kind === "repository")}
                    >
                      <option value="">全部图标集</option>
                      {collections.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </NativeSelect>
                    {visionResult ? (
                      <span className="filter-hint">按形状与风格匹配</span>
                    ) : (
                      <span className="filter-hint">
                        {query ? "搜索结果" : "探索常用图标"}
                      </span>
                    )}
                  </div>
                  <span className="result-count">
                    {busy ? (
                      <>
                        <Spinner />
                        搜索中
                      </>
                    ) : (
                      `${result.total.toLocaleString()} 个图标`
                    )}
                  </span>
                </div>
                {reference && (
                  <div className="reference-strip">
                    <img src={reference} alt="图片搜索参考" />
                    <span>参考图片</span>
                    <Button
                      size="sm"
                      kind="plain"
                      onClick={() => setCropOpen(true)}
                    >
                      裁剪
                    </Button>
                    <Button
                      size="sm"
                      kind="plain"
                      disabled={busy}
                      onClick={() => searchImage(reference)}
                    >
                      重新搜索
                    </Button>
                    <IconButton
                      size="sm"
                      kind="plain"
                      aria-label="移除参考图"
                      onClick={() => {
                        setReference(undefined);
                        setRevision((value) => value + 1);
                      }}
                    >
                      <CloseRegular size={16} />
                    </IconButton>
                  </div>
                )}
                {result.warning && (
                  <div className="inline-warning" role="status">
                    {result.warning}
                  </div>
                )}
                <div
                  className={`grid-scroll ${busy ? "is-loading" : ""}`}
                  aria-busy={busy}
                >
                  {result.icons.length ? (
                    <div className="icon-grid">
                      {result.icons.map((icon) => (
                        <button
                          key={icon.id}
                          data-testid="icon-card"
                          className={`icon-card ${selected?.id === icon.id ? "selected" : ""}`}
                          onClick={() => {
                            setSelected(icon);
                            setDetailOpen(true);
                          }}
                          title={`${icon.name} · ${icon.collection}`}
                        >
                          <div className="card-art">
                            <img
                              className={
                                isMonochrome(icon.svg) ? "monochrome" : ""
                              }
                              src={svgUrl(icon.svg)}
                              alt=""
                              width="28"
                              height="28"
                            />
                          </div>
                          <span className="card-name">{icon.name}</span>
                          <span className="card-source">{icon.collection}</span>
                          {icon.sourceId !== "public" && (
                            <span className="team-mark" title="团队图标" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : busy ? (
                    <div className="skeleton-grid">
                      {Array.from({ length: 36 }, (_, index) => (
                        <div className="skeleton-card" key={index} />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <Glyph>
                        <SearchRegular />
                      </Glyph>
                      <h2>
                        {activeSource?.kind === "repository"
                          ? "这个仓库还没有匹配的图标"
                          : "没有找到图标"}
                      </h2>
                      <p>
                        {activeSource?.kind === "repository"
                          ? "同步仓库或试试其他关键词"
                          : "试试英文关键词，或检查网络连接"}
                      </p>
                      {activeSource?.kind === "repository" && (
                        <Button kind="ghost" onClick={() => sync(activeSource)}>
                          同步仓库
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <footer className="grid-footer">
                  <span>
                    {visionResult
                      ? "视觉匹配结果"
                      : "统一 SVG · 原始风格 · 按需缓存"}
                  </span>
                  <div className="pager">
                    <IconButton
                      size="sm"
                      kind="plain"
                      aria-label="上一页"
                      disabled={!offset || busy || visionResult}
                      onClick={() =>
                        setOffset((value) => Math.max(0, value - 48))
                      }
                    >
                      <LeftRegular size={16} />
                    </IconButton>
                    <span>{Math.floor(offset / 48) + 1}</span>
                    <IconButton
                      size="sm"
                      kind="plain"
                      aria-label="下一页"
                      disabled={
                        offset + 48 >= result.total || busy || visionResult
                      }
                      onClick={() => setOffset((value) => value + 48)}
                    >
                      <RightRegular size={16} />
                    </IconButton>
                  </div>
                </footer>
              </section>
              {detailOpen && (
                <aside className="detail" aria-label="图标详情">
                  {selected ? (
                    <>
                      <div className="detail-top">
                        <span>图标详情</span>
                        <IconButton
                          size="sm"
                          kind="plain"
                          aria-label="收起详情"
                          onClick={() => setDetailOpen(false)}
                        >
                          <CloseRegular size={16} />
                        </IconButton>
                      </div>
                      <div className="detail-preview">
                        <img
                          className={
                            color === "currentColor" &&
                            isMonochrome(selected.svg)
                              ? "monochrome"
                              : ""
                          }
                          src={svgUrl(exported?.previewSvg ?? selected.svg)}
                          alt={selected.name}
                          width="80"
                          height="80"
                        />
                        <span className="preview-dimension">
                          SVG · 矢量图标
                        </span>
                      </div>
                      <div className="detail-identity">
                        <h2>{selected.name}</h2>
                        <span>{selected.collection}</span>
                      </div>
                      {selected.reason && (
                        <p className="match-reason">{selected.reason}</p>
                      )}
                      <div className="detail-properties">
                        <Field label="尺寸">
                          <NativeSelect
                            size="sm"
                            aria-label="图标尺寸"
                            value={size}
                            onChange={(event) =>
                              setSize(Number(event.target.value))
                            }
                          >
                            {[16, 20, 24, 32, 48, 64].map((value) => (
                              <option key={value} value={value}>
                                {value} px
                              </option>
                            ))}
                          </NativeSelect>
                        </Field>
                        <Field label="颜色">
                          <NativeSelect
                            size="sm"
                            aria-label="图标颜色"
                            value={color}
                            onChange={(event) => setColor(event.target.value)}
                          >
                            <option value="currentColor">跟随主题</option>
                            <option value="original">原始颜色</option>
                            <option value="#000000">黑色</option>
                            <option value="#ffffff">白色</option>
                            <option value="#3568d4">蓝色</option>
                          </NativeSelect>
                        </Field>
                      </div>
                      <div className="export-section">
                        <span className="section-label">使用方式</span>
                        <Tabs
                          value={target}
                          onValueChange={(value) => setTarget(value as Target)}
                        >
                          <TabsList className="target-tabs">
                            {targets.map((value) => (
                              <TabsTrigger key={value} value={value}>
                                {labels[value]}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </Tabs>
                        <div className="code-preview">
                          <div className="code-label">
                            <CodeRegular size={13} />
                            {target === "swiftui"
                              ? "Image + SVG Asset"
                              : target === "react"
                                ? "TSX"
                                : target === "vue"
                                  ? "Vue SFC"
                                  : "SVG"}
                          </div>
                          <pre>{exported?.code ?? "正在生成…"}</pre>
                        </div>
                        <p className="export-instruction">
                          {exported?.instructions}
                        </p>
                        <div className="export-actions">
                          <Button
                            disabled={!exported}
                            leftIcon={
                              copyState ? (
                                <CheckRegular size={16} />
                              ) : (
                                <CopyRegular size={16} />
                              )
                            }
                            onClick={copy}
                          >
                            {copyState ? "已复制" : "复制代码"}
                          </Button>
                          <IconButton
                            kind="ghost"
                            aria-label="导出资源文件"
                            disabled={!exported}
                            onClick={download}
                          >
                            <DownloadRegular size={16} />
                          </IconButton>
                        </div>
                        {target === "swiftui" && (
                          <span className="hint">
                            使用 SwiftUI 时，请同时导出资源文件
                          </span>
                        )}
                      </div>
                      <div className="source-info">
                        <span className="section-label">来源信息</span>
                        <dl>
                          <dt>来源</dt>
                          <dd>
                            {selected.sourceId === "public"
                              ? "开源图库"
                              : "团队仓库"}
                          </dd>
                          <dt>{selected.commit ? "版本" : "许可"}</dt>
                          <dd>
                            {selected.commit?.slice(0, 10) ??
                              selected.license ??
                              "见原始来源"}
                          </dd>
                        </dl>
                        {selected.path && (
                          <p className="source-path" title={selected.path}>
                            {selected.path}
                          </p>
                        )}
                        <Button
                          kind="plain"
                          size="sm"
                          onClick={() =>
                            api("openUrl", selected.sourceUrl).catch(report)
                          }
                        >
                          查看来源 <ArrowRightRegular size={14} />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="detail-empty">
                      <CodeRegular size={24} />
                      <p>
                        选择一个图标
                        <br />
                        查看预览和使用代码
                      </p>
                    </div>
                  )}
                </aside>
              )}
            </div>
          ) : (
            <div className="settings-scroll">
              {page === "repositories" ? (
                <RepositorySettings
                  sources={teams}
                  onRefresh={() => {
                    refreshSources();
                    setRevision((value) => value + 1);
                  }}
                  onSync={sync}
                  onError={report}
                  onNotice={flash}
                />
              ) : page === "model" ? (
                <ModelSettings
                  settings={settings}
                  onSettings={setSettings}
                  onError={report}
                  onNotice={flash}
                />
              ) : page === "mcp" ? (
                <MCPSettings onError={report} onNotice={flash} />
              ) : (
                <div className="settings-content">
                  <div className="settings-intro">
                    <h1>让工作空间适合你</h1>
                    <p>界面使用 Gendesign 组件与 Nico 主题。</p>
                  </div>
                  <Field label="外观">
                    <NativeSelect
                      aria-label="外观主题"
                      value={settings.theme}
                      onChange={(event) => {
                        const next = {
                          ...settings,
                          theme: event.target.value as Settings["theme"],
                        };
                        api<Settings>("saveSettings", { settings: next })
                          .then(setSettings)
                          .catch(report);
                      }}
                    >
                      <option value="system">跟随系统</option>
                      <option value="light">浅色</option>
                      <option value="dark">深色</option>
                    </NativeSelect>
                  </Field>
                  <div className="settings-note">
                    Iconcast 0.1.0 · 本地图库与独立 MCP 服务
                    <br />
                    图标本身保留来源的视觉风格。
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      {cropOpen && reference && (
        <CropDialog
          image={reference}
          onClose={() => setCropOpen(false)}
          onSearch={searchImage}
        />
      )}
    </div>
  );
}

function RepositorySettings({
  sources,
  onRefresh,
  onSync,
  onError,
  onNotice,
}: {
  sources: Source[];
  onRefresh: () => void;
  onSync: (source: Source) => void;
  onError: (err: unknown) => void;
  onNotice: (message: string) => void;
}) {
  const [editing, setEditing] = useState<string>(),
    [showForm, setShowForm] = useState(false),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(""),
    [url, setUrl] = useState(""),
    [branch, setBranch] = useState("main"),
    [directories, setDirectories] = useState("icons"),
    [username, setUsername] = useState(""),
    [token, setToken] = useState(""),
    [clearToken, setClearToken] = useState(false),
    [allowVision, setAllowVision] = useState(false),
    [confirmRemove, setConfirmRemove] = useState<string>();
  function edit(source?: Source) {
    setEditing(source?.id);
    setName(source?.name ?? "");
    setUrl(source?.url ?? "");
    setBranch(source?.branch ?? "main");
    setDirectories(source?.directories?.join(", ") ?? "icons");
    setUsername(source?.username ?? "");
    setToken("");
    setClearToken(false);
    setAllowVision(source?.allowVision ?? false);
    setShowForm(true);
  }
  async function save() {
    setBusy(true);
    try {
      const repository: RepositoryInput = {
        name,
        url,
        branch,
        directories: directories
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        username: username || undefined,
        token: token || (clearToken ? "" : undefined),
        allowVision,
      };
      if (editing) await api("updateRepository", { id: editing, repository });
      else await api("addRepository", repository);
      setShowForm(false);
      setToken("");
      onRefresh();
      onNotice(
        editing
          ? "仓库配置已更新，请同步获取最新图标"
          : "仓库已添加，正在拉取图标",
      );
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-content wide">
      <div className="settings-intro intro-row">
        <div>
          <h1>团队图标，一个来源</h1>
          <p>连接 GitHub 或 GitLab，让团队维护的 SVG 随时可用。</p>
        </div>
        <Button leftIcon={<AddRegular size={16} />} onClick={() => edit()}>
          添加仓库
        </Button>
      </div>
      {showForm && (
        <form
          className="repository-form"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <h2>{editing ? "编辑仓库" : "连接仓库"}</h2>
          <div className="form-grid">
            <Field label="图库名称">
              <Input
                aria-label="图库名称"
                required
                placeholder="例如 Design team"
                value={name}
                onValueChange={setName}
              />
            </Field>
            <Field label="分支">
              <Input
                aria-label="仓库分支"
                required
                value={branch}
                onValueChange={setBranch}
              />
            </Field>
          </div>
          <Field label="仓库地址">
            <Input
              aria-label="仓库地址"
              required
              placeholder="https://github.com/your-team/icons.git"
              value={url}
              onValueChange={setUrl}
            />
          </Field>
          <Field
            label="SVG 目录"
            hint="仓库内的相对目录，多个目录用英文逗号分隔；填写 . 索引整个仓库"
          >
            <Input
              aria-label="SVG 目录"
              required
              value={directories}
              onValueChange={setDirectories}
            />
          </Field>
          <div className="form-grid">
            <Field
              label="Git 用户名"
              hint="GitLab 默认 oauth2；GitHub 可填写你的用户名"
            >
              <Input
                aria-label="Git 用户名"
                value={username}
                onValueChange={setUsername}
              />
            </Field>
            <Field label="访问令牌" hint="私有仓库使用；保存在 macOS Keychain">
              <PasswordInput
                aria-label="仓库访问令牌"
                placeholder={editing ? "留空保留已有凭证" : "公开仓库可留空"}
                value={token}
                onValueChange={setToken}
              />
            </Field>
          </div>
          {editing &&
            sources.find((source) => source.id === editing)?.hasCredential && (
              <Button
                kind="plain"
                color="negative"
                size="sm"
                onClick={() => {
                  setToken("");
                  setClearToken((value) => !value);
                }}
              >
                {clearToken ? "取消清除凭证" : "清除已保存凭证"}
              </Button>
            )}
          <div className="toggle-row">
            <div>
              <strong>允许模型图片搜索</strong>
              <p>视觉搜索可能发送这个仓库的候选图标预览。</p>
            </div>
            <Switch
              aria-label="允许团队图标发送给模型"
              checked={allowVision}
              onCheckedChange={setAllowVision}
            />
          </div>
          <div className="form-actions">
            <Button
              kind="plain"
              onClick={() => {
                setShowForm(false);
                setToken("");
              }}
            >
              取消
            </Button>
            <Button type="submit" loading={busy}>
              {editing ? "保存配置" : "连接并同步"}
            </Button>
          </div>
        </form>
      )}
      <div className="repository-list">
        {sources.length
          ? sources.map((source) => (
              <div className="repository-row" key={source.id}>
                <div className="repository-icon">
                  <FolderRegular size={22} />
                </div>
                <div className="repository-main">
                  <h2>{source.name}</h2>
                  <p title={source.url}>{source.url}</p>
                  <div className="repository-meta">
                    <span>{source.branch}</span>
                    <span>{source.iconCount} 个图标</span>
                    <span>{source.commit?.slice(0, 8) ?? "等待首次同步"}</span>
                    {source.hasCredential && <span>私有凭证已保存</span>}
                  </div>
                  {source.error && (
                    <div className="repository-error">{source.error}</div>
                  )}
                  {source.syncedAt && (
                    <span className="hint">
                      上次同步 {new Date(source.syncedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="repository-actions">
                  <StatusIndicator
                    color={
                      source.error
                        ? "negative"
                        : source.syncedAt
                          ? "positive"
                          : "neutral"
                    }
                  >
                    {source.error
                      ? "需检查"
                      : source.syncedAt
                        ? "已同步"
                        : "待同步"}
                  </StatusIndicator>
                  <Button size="sm" kind="ghost" onClick={() => onSync(source)}>
                    同步
                  </Button>
                  <Button size="sm" kind="plain" onClick={() => edit(source)}>
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    kind="plain"
                    color="negative"
                    onClick={() => setConfirmRemove(source.id)}
                  >
                    移除
                  </Button>
                </div>
              </div>
            ))
          : !showForm && (
              <div className="repository-empty">
                <FolderRegular size={32} />
                <h2>团队的图标，在这里集合</h2>
                <p>选择仓库和目录，Iconcast 会同步 SVG 并提供给 MCP。</p>
                <Button kind="ghost" onClick={() => edit()}>
                  连接第一个仓库
                </Button>
              </div>
            )}
      </div>
      <div className="settings-note">
        仓库只读同步，不会提交或推送。更新失败时保留上一份缓存。
        <br />
        访问令牌需要仓库读取权限；不支持 SSH 地址或 Git 子模块。
      </div>
      {confirmRemove && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirmRemove(undefined);
          }}
        >
          <DialogContent negative>
            <DialogHeader>
              <DialogTitle>移除这个图库？</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <DialogDescription>
                将删除本地索引和凭证，远端仓库不受影响。
              </DialogDescription>
            </DialogBody>
            <DialogFooter>
              <Button kind="plain" onClick={() => setConfirmRemove(undefined)}>
                取消
              </Button>
              <Button
                color="negative"
                onClick={async () => {
                  try {
                    await api("removeRepository", confirmRemove);
                    setConfirmRemove(undefined);
                    onRefresh();
                  } catch (err) {
                    onError(err);
                  }
                }}
              >
                移除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ModelSettings({
  settings,
  onSettings,
  onError,
  onNotice,
}: {
  settings: Settings;
  onSettings: (value: Settings) => void;
  onError: (err: unknown) => void;
  onNotice: (message: string) => void;
}) {
  const [baseUrl, setBaseUrl] = useState(settings.model.baseUrl),
    [model, setModel] = useState(settings.model.model),
    [key, setKey] = useState(""),
    [consent, setConsent] = useState(settings.model.consent),
    [busy, setBusy] = useState(false),
    [testing, setTesting] = useState(false);
  async function save() {
    const next = await api<Settings>("saveSettings", {
      settings: { ...settings, model: { baseUrl, model, consent } },
      apiKey: key || undefined,
    });
    onSettings(next);
    setKey("");
    return next;
  }
  return (
    <div className="settings-content">
      <div className="settings-intro">
        <h1>用形状找到图标</h1>
        <p>连接你自己的视觉模型，按参考图的轮廓和风格寻找相似 SVG。</p>
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try {
            await save();
            onNotice("模型设置已保存");
          } catch (err) {
            onError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field
          label="API 地址"
          hint="兼容 OpenAI Chat Completions 图片输入；支持 HTTPS 或本机 HTTP"
        >
          <Input
            aria-label="模型 API 地址"
            required
            value={baseUrl}
            onValueChange={setBaseUrl}
          />
        </Field>
        <Field label="模型名称" hint="填写服务提供的视觉或多模态模型名称">
          <Input
            aria-label="模型名称"
            placeholder="支持图片输入的模型"
            value={model}
            onValueChange={setModel}
          />
        </Field>
        <Field
          label="API Key"
          hint="保存到 macOS Keychain；本地无认证服务可留空"
        >
          <PasswordInput
            aria-label="模型 API Key"
            placeholder={
              settings.model.hasKey ? "已保存，留空保留" : "输入 API Key"
            }
            value={key}
            onValueChange={setKey}
          />
        </Field>
        {settings.model.hasKey && (
          <Button
            kind="plain"
            color="negative"
            size="sm"
            onClick={async () => {
              try {
                const next = await api<Settings>("saveSettings", {
                  settings: { ...settings, model: { baseUrl, model, consent } },
                  apiKey: "",
                });
                onSettings(next);
                onNotice("API Key 已清除");
              } catch (err) {
                onError(err);
              }
            }}
          >
            清除已保存 Key
          </Button>
        )}
        <div className="toggle-row consent-row">
          <div>
            <strong>允许发送图片进行视觉搜索</strong>
            <p>
              参考图与允许的候选图标将发送到上述服务。
              <br />
              关键词搜索不使用模型，团队仓库可单独关闭图片发送。
            </p>
          </div>
          <Switch
            aria-label="允许发送图片到模型"
            checked={consent}
            onCheckedChange={setConsent}
          />
        </div>
        <div className="form-actions">
          <Button
            kind="ghost"
            loading={testing}
            disabled={!model || busy}
            onClick={async () => {
              setTesting(true);
              try {
                await save();
                await api("testModel");
                onNotice("连接成功，已验证图片输入");
              } catch (err) {
                onError(err);
              } finally {
                setTesting(false);
              }
            }}
          >
            测试图片能力
          </Button>
          <Button type="submit" loading={busy} disabled={testing}>
            保存设置
          </Button>
        </div>
      </form>
      <div className="settings-note">
        搜索会先提取关键词，再比对候选图标。结果是相似匹配，不保证找到原图标。
        <br />
        支持 PNG、JPEG、WebP，单张不超过 8 MB。
      </div>
    </div>
  );
}

function MCPSettings({
  onError,
  onNotice,
}: {
  onError: (err: unknown) => void;
  onNotice: (message: string) => void;
}) {
  const [info, setInfo] = useState<MCPInfo>(),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState<string>();
  useEffect(() => {
    api<MCPInfo>("mcpInfo").then(setInfo).catch(onError);
  }, []);
  async function copy(value: string) {
    try {
      await api("copy", value);
      onNotice("连接配置已复制");
    } catch (err) {
      onError(err);
    }
  }
  return (
    <div className="settings-content">
      <div className="settings-intro">
        <div className="mcp-symbol">
          <LinkRegular size={28} />
        </div>
        <h1>把图标交给你的 Agent</h1>
        <p>同一份图库，通过 MCP 搜索、获取并用于你的项目。</p>
      </div>
      <div className="connection-summary">
        <StatusIndicator color="positive">本地 stdio 服务</StatusIndicator>
        <span>退出桌面应用后仍可连接</span>
      </div>
      <h2 className="settings-subheading">连接 Codex</h2>
      <p className="hint">
        复制命令到终端执行，随后在新的 Codex 会话中使用 Iconcast。
      </p>
      <div className="config-code">
        <pre>{info?.codexCommand ?? "正在读取…"}</pre>
        <IconButton
          size="sm"
          kind="plain"
          aria-label="复制 Codex 命令"
          disabled={!info}
          onClick={() => copy(info!.codexCommand)}
        >
          <CopyRegular size={16} />
        </IconButton>
      </div>
      <h2 className="settings-subheading">其他 MCP 客户端</h2>
      <div className="config-code">
        <pre>{info?.configuration ?? "正在读取…"}</pre>
        <IconButton
          size="sm"
          kind="plain"
          aria-label="复制 MCP JSON"
          disabled={!info}
          onClick={() => copy(info!.configuration)}
        >
          <CopyRegular size={16} />
        </IconButton>
      </div>
      <div className="tool-list">
        <span>可用工具</span>
        {[
          "list_sources",
          "search_icons",
          "search_icons_by_image",
          "get_icon",
          "sync_repository",
        ].map((tool) => (
          <code key={tool}>{tool}</code>
        ))}
      </div>
      <p className="hint">
        视觉搜索可能耗时较长。Codex 可在现有 [mcp_servers.iconcast] 配置中设置
        tool_timeout_sec = 240；其他客户端请调整工具超时。
      </p>
      <div className="form-actions">
        <Button
          kind="ghost"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const value = await api<{ tools: number; sourceCount: number }>(
                "mcpCheck",
              );
              setStatus(
                `连接正常 · ${value.tools} 个工具 · ${value.sourceCount} 个来源`,
              );
              onNotice("独立 MCP 进程自检通过");
            } catch (err) {
              onError(err);
            } finally {
              setBusy(false);
            }
          }}
        >
          检查 MCP 连接
        </Button>
      </div>
      {status && <p className="positive-message">{status}</p>}
      <div className="settings-note">
        Agent 获取独立代码或资源包，放进项目后无需 Iconcast 常驻。
        <br />
        示例：“用团队图库的搜索图标完成这个 Vue 页面。”
      </div>
    </div>
  );
}

function CropDialog({
  image,
  onClose,
  onSearch,
}: {
  image: string;
  onClose: () => void;
  onSearch: (value: string) => void;
}) {
  const img = useRef<HTMLImageElement>(null),
    surface = useRef<HTMLDivElement>(null),
    start = useRef<{ x: number; y: number } | undefined>(undefined),
    [crop, setCrop] = useState<{
      x: number;
      y: number;
      w: number;
      h: number;
    }>();
  function point(event: React.PointerEvent) {
    const rect = surface.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  }
  function submit() {
    if (!crop || crop.w < 0.01 || crop.h < 0.01) {
      onSearch(image);
      return;
    }
    const element = img.current!,
      canvas = document.createElement("canvas");
    canvas.width = Math.round(element.naturalWidth * crop.w);
    canvas.height = Math.round(element.naturalHeight * crop.h);
    canvas
      .getContext("2d")!
      .drawImage(
        element,
        element.naturalWidth * crop.x,
        element.naturalHeight * crop.y,
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    onSearch(canvas.toDataURL("image/png"));
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ModalContent className="w-[560px]">
        <ModalHeader closeLabel="关闭图片裁剪">
          <ModalTitle>用图片寻找相似图标</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <ModalDescription>
            拖动选择图标区域，也可以直接使用整张图片。
          </ModalDescription>
          <div
            ref={surface}
            className="crop-surface"
            onPointerDown={(event) => {
              start.current = point(event);
              setCrop(undefined);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!start.current) return;
              const end = point(event);
              setCrop({
                x: Math.min(start.current.x, end.x),
                y: Math.min(start.current.y, end.y),
                w: Math.abs(end.x - start.current.x),
                h: Math.abs(end.y - start.current.y),
              });
            }}
            onPointerUp={() => {
              start.current = undefined;
            }}
          >
            <img ref={img} src={image} alt="待裁剪的参考图" draggable={false} />
            {crop && (
              <div
                className="crop-selection"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.w * 100}%`,
                  height: `${crop.h * 100}%`,
                }}
              />
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="plain" onClick={() => setCrop(undefined)}>
            重置裁剪
          </Button>
          <Button onClick={submit} leftIcon={<SearchRegular size={16} />}>
            搜索相似图标
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
