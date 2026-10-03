import { MCPSettings } from "./MCPSettings";
import { LibraryFilterMenu } from "./LibraryFilterMenu";
import { filterLibraries, type LibraryFilter } from "./library-filter";
import { LibraryContextMenu } from "./LibraryContextMenu";
import { RemoveLibraryDialog } from "./RemoveLibraryDialog";
import type {
  LibraryPreferences,
  LibraryPreference,
} from "../core/library-management";
import type { ReactElement } from "react";
import brandLogo from "../../assets/icon.svg";
import { DesignIcon, LibraryMark, homeLibraries, designNames } from "./design";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { DirectoryCascader } from "./DirectoryCascader";
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
} from "./api";

type Page =
  "home" | "library" | "repositories" | "model" | "appearance";
const publicLibraryOrigins: Record<string, string> = {
  lucide: "https://lucide.dev",
  tabler: "https://tabler.io/icons",
  ri: "https://remixicon.com",
  uil: "https://iconscout.com/unicons",
  mingcute: "https://www.mingcute.com",
  ic: "https://fonts.google.com/icons",
  eva: "https://akveo.github.io/eva-icons",
};
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
    >
      Update
    </span>
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
  const [page, setPage] = useState<Page>("home"),
    [sources, setSources] = useState<Source[]>([]),
    [collections, setCollections] = useState<Collection[]>([]),
    [settings, setSettings] = useState<Settings>(initialSettings);
  const [libraryPreferences, setLibraryPreferences] =
    useState<LibraryPreferences>({});
  const [removeLibrary, setRemoveLibrary] = useState<{
    id: string;
    name: string;
    public: boolean;
  }>();
  const [configureLibrary, setConfigureLibrary] = useState<string>();
  const [configurationName, setConfigurationName] = useState("");
  const [savingLibrary, setSavingLibrary] = useState(false);
  const [editRepository, setEditRepository] = useState<string>();
  const [repositoryEditRevision, setRepositoryEditRevision] = useState(0);
  async function saveLibrary(id: string, patch: LibraryPreference) {
    const value = await api<LibraryPreferences>("saveLibraryPreference", {
      id,
      ...patch,
    });
    setLibraryPreferences(value);
  }
  function libraryMenu(
    id: string,
    name: string,
    isPublic: boolean,
    button: ReactElement,
  ) {
    const preference = libraryPreferences[id];
    const open = () => {
      chooseSource(isPublic ? "public" : id);
      if (isPublic) setCollection(id);
    };
    return (
      <LibraryContextMenu
        key={id}
        pinned={preference?.pinned}
        onOpen={open}
        onPin={() => {
          saveLibrary(id, { pinned: !preference?.pinned }).catch(report);
        }}
        onConfigure={() => {
          if (isPublic) {
            setConfigurationName(preference?.name ?? name);
            setConfigureLibrary(id);
          } else {
            setEditRepository(id);
            setRepositoryEditRevision((value) => value + 1);
            navigate("repositories");
          }
        }}
        onSource={() => {
          const url = isPublic
            ? (collections.find((item) => item.id === id)?.authorUrl ??
              publicLibraryOrigins[id])
            : sources.find((item) => item.id === id)?.url;
          if (url) api("openUrl", url).catch(report);
          else report(new Error("图库来源暂不可用"));
        }}
        onRemove={() => setRemoveLibrary({ id, name, public: isPublic })}
      >
        {button}
      </LibraryContextMenu>
    );
  }
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [libraryOptions, setLibraryOptions] = useState<LibraryFilter>({
    types: [],
    statuses: [],
    sorts: [],
  });
  const [previousPage, setPreviousPage] = useState<Page>();
  const [nextPage, setNextPage] = useState<Page>();
  function navigate(next: Page) {
    setPreviousPage(page);
    setNextPage(undefined);
    setPage(next);
    setSettingsOpen(false);
  }
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
    [exported, setExported] = useState<ExportResult>(),
    [copyState, setCopyState] = useState(false),
    [detailOpen, setDetailOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
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
    api<LibraryPreferences>("libraryPreferences")
      .then(setLibraryPreferences)
      .catch(report);
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
        color: "currentColor",
      })
        .then((value) => {
          if (alive) setExported(value);
        })
        .catch(report);
    return () => {
      alive = false;
    };
  }, [selected?.id, selected?.svg, target]);
  function chooseSource(id: string) {
    setSourceId(id);
    setCollection("");
    setOffset(0);
    setQuery("");
    navigate("library");
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
      if (page === "home") chooseSource("");
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
      setDetailOpen(Boolean(value.icons.length));
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
        color: "currentColor",
      });
      if (!value.canceled) flash(`已导出到 ${value.path}`);
    } catch (err) {
      report(err);
    }
  }
  const activeSource = sources.find((source) => source.id === sourceId),
    heading =
      libraryPreferences[collection]?.name ??
      designNames[collection] ??
      defaultLibraries.find((item) => item.id === collection)?.name ??
      collections.find((item) => item.id === collection)?.name ??
      activeSource?.name ??
      "全部图标";
  const activeChanges = collection
    ? collections.find((item) => item.id === collection)?.changes
    : activeSource?.changes;
  const teams = sources.filter((source) => source.kind === "repository");
  const visibleLibraries = filterLibraries(
    defaultLibraries.map((library) => ({
      ...library,
      name: libraryPreferences[library.id]?.name ?? library.name,
    })),
    teams,
    collections,
    libraryOptions,
    libraryFilter,
  )
    .filter(
      (entry) =>
        !libraryPreferences[entry.library?.id ?? entry.source!.id]?.hidden,
    )
    .sort(
      (a, b) =>
        Number(
          Boolean(libraryPreferences[b.library?.id ?? b.source!.id]?.pinned),
        ) -
        Number(
          Boolean(libraryPreferences[a.library?.id ?? a.source!.id]?.pinned),
        ),
    );
  const homeEntries: {
    id: string;
    library?: (typeof homeLibraries)[number];
    source?: Source;
  }[] = [
    ...homeLibraries.map((library) => ({ id: library.id, library })),
    ...teams.map((source) => ({ id: source.id, source })),
  ]
    .filter((entry) => !libraryPreferences[entry.id]?.hidden)
    .sort(
      (a, b) =>
        Number(Boolean(libraryPreferences[b.id]?.pinned)) -
        Number(Boolean(libraryPreferences[a.id]?.pinned)),
    );
  const titles: Record<Page, string> = {
    home: "首页",
    library: heading,
    repositories: "团队仓库",
    model: "视觉模型",
    appearance: "外观",
  };
  return (
    <div
      className={`app ${sidebarOpen ? "" : "sidebar-collapsed"} ${page === "home" ? "home-view" : page === "library" ? "library-view" : ""}`}
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
        <div className="window-navigation">
          <div className="native-controls-space" aria-hidden="true" />
          <div className="window-actions">
            <IconButton
              kind="plain"
              size="sm"
              aria-label="返回"
              disabled={!previousPage}
              onClick={() => {
                if (previousPage) {
                  setNextPage(page);
                  setPage(previousPage);
                  setPreviousPage(undefined);
                }
              }}
            >
              <DesignIcon name="back" />
            </IconButton>
            <IconButton
              kind="plain"
              size="sm"
              aria-label="前进"
              disabled={!nextPage}
              onClick={() => {
                if (nextPage) {
                  setPreviousPage(page);
                  setPage(nextPage);
                  setNextPage(undefined);
                }
              }}
            >
              <DesignIcon name="forward" />
            </IconButton>
            <IconButton
              kind="plain"
              size="sm"
              aria-label="切换侧栏"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((value) => !value)}
            >
              <DesignIcon name="sidebar" />
            </IconButton>
          </div>
        </div>
        {page === "library" ? (
          <div className="library-window-heading">
            <span className="window-library-title">
              {collection === "lucide" ? (
                <DesignIcon name="lucide-heading" />
              ) : defaultLibraries.find(
                  (library) => library.id === collection,
                ) ? (
                <LibraryMark
                  library={defaultLibraries.find(
                    (library) => library.id === collection,
                  )!}
                />
              ) : (
                <DesignIcon
                  name={
                    activeSource?.kind === "repository" ? "book-row" : "search"
                  }
                />
              )}
              <span>{heading}</span>
            </span>
            <IconButton
              kind="plain"
              size="sm"
              selected={detailOpen}
              aria-label="切换详情面板"
              aria-expanded={detailOpen}
              onClick={() => setDetailOpen((value) => !value)}
            >
              <DesignIcon name="code" />
            </IconButton>
          </div>
        ) : (
          <span
            className="window-title"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <img src={brandLogo} width="28" height="28" alt="DesiCast Logo" />
            DesiCast
          </span>
        )}
      </header>
      <div className="shell">
        <aside className="sidebar" aria-label="图库导航" hidden={!sidebarOpen}>
          <div className="sidebar-menu">
            <Button
              className="nav-item"
              kind="plain"
              onClick={() => {
                setEditRepository(undefined);
                setRepositoryEditRevision((value) => value + 1);
                navigate("repositories");
              }}
            >
              <DesignIcon name="add" />
              <span>添加图标库</span>
            </Button>
            <Button
              className={`nav-item ${page === "library" && !sourceId ? "active" : ""}`}
              kind="plain"
              onClick={() => {
                chooseSource("");
                requestAnimationFrame(() => searchInput.current?.focus());
              }}
            >
              <DesignIcon name="search" />
              <span>全局搜索</span>
            </Button>
          </div>
          <div className="library-heading">
            <span>图标库</span>
            <div className="library-heading-actions">
              <IconButton
                kind="plain"
                size="sm"
                aria-label="筛选图标库"
                aria-expanded={filterOpen}
                onClick={() => setFilterOpen((value) => !value)}
              >
                <DesignIcon name="library-search" />
              </IconButton>
              <LibraryFilterMenu
                value={libraryOptions}
                onChange={setLibraryOptions}
              />
              <IconButton
                kind="plain"
                size="sm"
                aria-label="添加团队仓库"
                onClick={() => {
                  setEditRepository(undefined);
                  setRepositoryEditRevision((value) => value + 1);
                  navigate("repositories");
                }}
              >
                <DesignIcon name="library-add" />
              </IconButton>
            </div>
          </div>
          {filterOpen && (
            <div className="sidebar-filter">
              <SearchBox
                aria-label="筛选图标库"
                placeholder="搜索图标库"
                value={libraryFilter}
                onValueChange={setLibraryFilter}
              />
            </div>
          )}
          <div className="library-navigation">
            {visibleLibraries.map((entry) => {
              const library = entry.library;
              const source = entry.source;
              const metadata = library
                ? collections.find((item) => item.id === library.id)
                : undefined;
              const id = library?.id ?? source!.id;
              const name = library
                ? (libraryPreferences[id]?.name ?? designNames[library.id])
                : source!.name;
              const changes = metadata?.changes ?? source?.changes;
              return libraryMenu(
                id,
                name,
                Boolean(library),
                <button
                  key={id}
                  data-testid={`library-${id}`}
                  className={`nav-item ${page === "library" && (library ? sourceId === "public" && collection === id : sourceId === id) ? "active" : ""}`}
                  title={`${library?.name ?? name} · ${library ? (metadata ? metadata.total.toLocaleString() + " 个图标" : "数量暂不可用") : source!.iconCount.toLocaleString() + " 个图标"}${changes ? " · " + changeDescription(changes) : ""}`}
                  onClick={() => {
                    chooseSource(library ? "public" : id);
                    if (library) setCollection(id);
                  }}
                >
                  {library ? (
                    <LibraryMark library={library} />
                  ) : (
                    <DesignIcon name="book-row" />
                  )}
                  <span>{name}</span>
                  <ChangeBadge changes={changes} />
                  <span className="nav-count">
                    {library
                      ? metadata
                        ? metadata.total.toLocaleString()
                        : "—"
                      : source!.iconCount.toLocaleString()}
                  </span>
                </button>,
              );
            })}
            {visibleLibraries.length === 0 && (
              <p className="library-filter-empty">没有符合条件的图标库</p>
            )}
          </div>
          <div className="sidebar-foot">
            <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
              <PopoverTrigger
                render={<IconButton kind="plain" aria-label="设置" />}
              >
                <DesignIcon name="settings" />
              </PopoverTrigger>
              <PopoverContent
                className="navigation-popup"
                side="top"
                align="start"
              >
                <Button kind="plain" onClick={() => navigate("home")}>
                  首页
                </Button>
                <Button
                  kind="plain"
                  onClick={() => {
                    setEditRepository(undefined);
                    setRepositoryEditRevision((value) => value + 1);
                    navigate("repositories");
                  }}
                >
                  仓库管理
                </Button>
                <Button kind="plain" onClick={() => navigate("model")}>
                  视觉模型
                </Button>
                <Button kind="plain" onClick={() => navigate("appearance")}>
                  外观设置
                </Button>
              </PopoverContent>
            </Popover>
            <Button
              kind="plain"
              className="mcp-badge"
              aria-label="MCP 连接"
              onClick={() => setMcpOpen(true)}
            >
              <DesignIcon name="check" />
              <span>MCP</span>
            </Button>
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
          {page !== "home" && page !== "library" && (
            <div className="page-heading">
              <div className="heading-title">{titles[page]}</div>
            </div>
          )}
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
          {page === "home" ? (
            <section className="home-content" aria-label="选择图标库">
              <div className="home-center">
                <h1>Hello，今天想用什么图标库？</h1>
                <div className="home-library-grid">
                  {homeEntries.map(({ id, library, source }) => {
                    const name = library
                      ? (libraryPreferences[id]?.name ?? library.designName)
                      : source!.name;
                    return libraryMenu(
                      id,
                      name,
                      Boolean(library),
                      <Button
                        key={id}
                        kind="plain"
                        className="home-library-card"
                        data-testid={`home-library-${id}`}
                        title={name}
                        onClick={() => {
                          chooseSource(library ? "public" : id);
                          if (library) setCollection(id);
                        }}
                      >
                        {library ? (
                          <LibraryMark library={library} card />
                        ) : (
                          <span className="home-team-mark">
                            <DesignIcon name="book-card" />
                          </span>
                        )}
                        <span>{name}</span>
                      </Button>,
                    );
                  })}
                </div>
              </div>
            </section>
          ) : page === "library" ? (
            <div className="library-layout">
              <section className="library-main">
                <div className="search-toolbar">
                  <SearchBox
                    ref={searchInput}
                    wrapperClassName="main-search"
                    size="md"
                    aria-label="搜索图标"
                    placeholder="搜索图标名称"
                    value={query}
                    onValueChange={(value) => {
                      setQuery(value);
                      setOffset(0);
                    }}
                  />
                  <div className="grid-toolbar-actions">
                    <Popover>
                      <PopoverTrigger
                        render={
                          <IconButton
                            kind="plain"
                            size="sm"
                            aria-label="搜索选项"
                          />
                        }
                      >
                        <DesignIcon name="library-options" />
                      </PopoverTrigger>
                      <PopoverContent className="navigation-popup" align="end">
                        <Button
                          kind="plain"
                          leftIcon={<PicRegular size={16} />}
                          onClick={() => fileInput.current?.click()}
                        >
                          以图搜图
                        </Button>
                        <Button
                          kind="plain"
                          leftIcon={<Refresh1Regular size={16} />}
                          onClick={refreshLibrary}
                        >
                          刷新图库
                        </Button>
                      </PopoverContent>
                    </Popover>
                    <Tabs
                      value={view}
                      onValueChange={(value) =>
                        setView(value as "grid" | "list")
                      }
                    >
                      <TabsList className="view-tabs" aria-label="图标显示方式">
                        <TabsTrigger value="grid" aria-label="网格视图">
                          <DesignIcon name="grid" />
                        </TabsTrigger>
                        <TabsTrigger value="list" aria-label="列表视图">
                          <DesignIcon name="list" />
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
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
                <div
                  className="filter-toolbar"
                  hidden={Boolean(sourceId) && !visionResult}
                >
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
                    <div
                      className={`icon-grid ${view === "list" ? "icon-list" : ""}`}
                    >
                      {result.icons.map((icon) => (
                        <button
                          key={icon.id}
                          data-testid="icon-card"
                          className={`icon-card ${selected?.id === icon.id ? "selected" : ""}`}
                          aria-pressed={selected?.id === icon.id && detailOpen}
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
                              width="48"
                              height="48"
                            />
                          </div>
                          <span className="card-name">{icon.name}</span>
                          {view === "list" && (
                            <span className="card-source">
                              {designNames[icon.collection] ?? icon.collection}
                            </span>
                          )}
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
                <footer
                  className="grid-footer"
                  hidden={result.total <= 48 && !visionResult}
                >
                  <span>
                    {visionResult
                      ? "视觉匹配结果"
                      : `${result.total.toLocaleString()} 个图标`}
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
                      <div className="detail-preview">
                        <img
                          className={
                            isMonochrome(selected.svg) ? "monochrome" : ""
                          }
                          src={svgUrl(exported?.previewSvg ?? selected.svg)}
                          alt={selected.name}
                          width="80"
                          height="80"
                        />
                      </div>
                      <div className="detail-identity">
                        <div className="identity-row">
                          <span>名称</span>
                          <h2>{selected.name}</h2>
                          <IconButton
                            kind="plain"
                            size="sm"
                            aria-label="复制图标名称"
                            onClick={() =>
                              api("copy", selected.name)
                                .then(() => flash("图标名称已复制"))
                                .catch(report)
                            }
                          >
                            <DesignIcon name="copy-name" />
                          </IconButton>
                        </div>
                        <div className="identity-row">
                          <span>来源</span>
                          <Button
                            className="source-link"
                            kind="plain"
                            size="sm"
                            onClick={() =>
                              api("openUrl", selected.sourceUrl).catch(report)
                            }
                            leftIcon={
                              selected.sourceUrl.includes("github.com") ? (
                                <DesignIcon name="github" />
                              ) : (
                                <LinkRegular size={16} />
                              )
                            }
                          >
                            {selected.sourceUrl.includes("github.com")
                              ? "Github"
                              : "查看来源"}
                          </Button>
                        </div>
                      </div>
                      {selected.reason && (
                        <p className="match-reason">{selected.reason}</p>
                      )}
                      <div className="export-section">
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
                          <pre>
                            {exported?.code.replace(
                              /^(?:\/\/ Source:[^\n]*\n|<!-- Source:[^\n]* -->\n)/,
                              "",
                            ) ?? "正在生成…"}
                          </pre>
                        </div>
                        <div className="export-actions">
                          <Button disabled={!exported} onClick={copy}>
                            {copyState ? "已复制" : "复制代码"}
                          </Button>
                          <IconButton
                            kind="ghost"
                            aria-label="导出资源文件"
                            title={
                              target === "swiftui"
                                ? "导出后将 .imageset 拖入 Assets.xcassets"
                                : "导出资源文件"
                            }
                            disabled={!exported}
                            onClick={download}
                          >
                            <DesignIcon name="download" />
                          </IconButton>
                        </div>
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
                <>
                  {defaultLibraries.some(
                    (library) => libraryPreferences[library.id]?.hidden,
                  ) && (
                    <div className="removed-public-libraries">
                      <h2>已移除的公共图标库</h2>
                      {defaultLibraries
                        .filter(
                          (library) => libraryPreferences[library.id]?.hidden,
                        )
                        .map((library) => (
                          <Button
                            key={library.id}
                            kind="ghost"
                            onClick={() =>
                              saveLibrary(library.id, { hidden: false }).catch(
                                report,
                              )
                            }
                          >
                            重新添加{" "}
                            {libraryPreferences[library.id]?.name ??
                              library.name}
                          </Button>
                        ))}
                    </div>
                  )}
                  <RepositorySettings
                    key={repositoryEditRevision}
                    initialEditing={editRepository}
                    onRemove={(source) =>
                      setRemoveLibrary({
                        id: source.id,
                        name: source.name,
                        public: false,
                      })
                    }
                    sources={teams}
                    onRefresh={() => {
                      refreshSources();
                      setRevision((value) => value + 1);
                    }}
                    onSync={sync}
                    onError={report}
                    onNotice={flash}
                  />
                </>
              ) : page === "model" ? (
                <ModelSettings
                  settings={settings}
                  onSettings={setSettings}
                  onError={report}
                  onNotice={flash}
                />
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
                    DesiCast 0.1.0 · 本地图库与独立 MCP 服务
                    <br />
                    图标本身保留来源的视觉风格。
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      {mcpOpen && (
        <MCPSettings
          onClose={() => setMcpOpen(false)}
          onError={report}
          onNotice={flash}
        />
      )}
      {removeLibrary && (
        <RemoveLibraryDialog
          name={removeLibrary.name}
          onClose={() => setRemoveLibrary(undefined)}
          onError={report}
          onRemove={async () => {
            if (removeLibrary.public)
              await saveLibrary(removeLibrary.id, {
                hidden: true,
                pinned: false,
              });
            else {
              await api("removeRepository", removeLibrary.id);
              await refreshSources();
            }
            if (
              (removeLibrary.public && collection === removeLibrary.id) ||
              (!removeLibrary.public && sourceId === removeLibrary.id)
            ) {
              generation.current++;
              setSourceId("");
              setCollection("");
              setSelected(undefined);
              setResult({ icons: [], total: 0 });
              navigate("home");
            }
            flash("图标库已移除");
          }}
        />
      )}
      {configureLibrary && (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open && !savingLibrary) setConfigureLibrary(undefined);
          }}
        >
          <ModalContent>
            <ModalHeader>
              <ModalTitle>配置图标库</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <Field label="显示名称">
                <Input
                  aria-label="图标库显示名称"
                  maxLength={100}
                  value={configurationName}
                  onValueChange={setConfigurationName}
                />
              </Field>
              <p className="hint">
                公共图库的图标内容与来源由上游维护，显示名称仅用于本机导航。
              </p>
            </ModalBody>
            <ModalFooter>
              <Button
                kind="plain"
                disabled={savingLibrary}
                onClick={() => setConfigureLibrary(undefined)}
              >
                取消
              </Button>
              <Button
                loading={savingLibrary}
                disabled={!configurationName.trim() || savingLibrary}
                onClick={async () => {
                  setSavingLibrary(true);
                  try {
                    await saveLibrary(configureLibrary, {
                      name: configurationName.trim(),
                    });
                    setConfigureLibrary(undefined);
                  } catch (err) {
                    report(err);
                  } finally {
                    setSavingLibrary(false);
                  }
                }}
              >
                保存配置
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
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
  initialEditing,
  onRemove,
  sources,
  onRefresh,
  onSync,
  onError,
  onNotice,
}: {
  initialEditing?: string;
  onRemove: (source: Source) => void;
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
    [branch, setBranch] = useState(""),
    [directories, setDirectories] = useState<string[]>([]),
    [metadata, setMetadata] = useState<{
      branches: string[];
      directories: string[];
      authorization: string;
    }>(),
    [loading, setLoading] = useState(false),
    [loadError, setLoadError] = useState(""),
    [allowVision, setAllowVision] = useState(false);
  function edit(source?: Source) {
    requestVersion.current++;
    setLoading(false);
    setEditing(source?.id);
    setName(source?.name ?? "");
    setUrl(source?.url ?? "");
    setBranch(source?.branch ?? "");
    setDirectories(source?.directories ?? []);
    setMetadata(undefined);
    setLoadError("");
    setAllowVision(source?.allowVision ?? false);
    setShowForm(true);
  }
  const requestVersion = useRef(0);
  useEffect(() => {
    if (initialEditing) {
      const source = sources.find((source) => source.id === initialEditing);
      if (source) edit(source);
    }
  }, [initialEditing]);
  async function loadRepository(selectedBranch?: string) {
    const version = ++requestVersion.current;
    setLoading(true);
    setMetadata(undefined);
    setLoadError("");
    try {
      const result = await api<{
        branches: string[];
        directories: string[];
        authorization: string;
        branch: string;
      }>("browseRepository", { url, branch: selectedBranch });
      if (version !== requestVersion.current) return;
      setMetadata(result);
      setBranch(result.branch);
      setDirectories((current) =>
        current.filter((p) => p === "." || result.directories.includes(p)),
      );
    } catch (err) {
      if (version === requestVersion.current)
        setLoadError(err instanceof Error ? err.message : "读取失败");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }
  async function save() {
    setBusy(true);
    try {
      const repository: RepositoryInput = {
        name,
        url,
        branch,
        directories,
        username: editing
          ? sources.find((source) => source.id === editing)?.username
          : undefined,
        allowVision,
      };
      if (editing) await api("updateRepository", { id: editing, repository });
      else await api("addRepository", repository);
      setShowForm(false);
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
              <NativeSelect
                aria-label="仓库分支"
                value={branch}
                disabled={!metadata || loading}
                onChange={(event) => {
                  setBranch(event.target.value);
                  setDirectories([]);
                  loadRepository(event.target.value);
                }}
              >
                {!metadata && (
                  <option value={branch}>{branch || "先读取仓库"}</option>
                )}
                {metadata?.branches.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="仓库地址">
            <Input
              aria-label="仓库地址"
              required
              placeholder="https://github.com/your-team/icons.git"
              value={url}
              onValueChange={(value) => {
                requestVersion.current++;
                setUrl(value);
                setMetadata(undefined);
                setBranch("");
                setDirectories([]);
                setLoading(false);
                setLoadError("");
              }}
            />
          </Field>
          <div className="repository-access-row">
            <Button
              kind="ghost"
              loading={loading}
              disabled={!url || loading}
              onClick={() => loadRepository(branch || undefined)}
            >
              读取仓库信息
            </Button>
            <span className="hint">
              {metadata
                ? `已连接 · ${metadata.authorization}`
                : "自动使用本机 Git 凭据或 gh / glab 登录，无需填写用户名和令牌"}
            </span>
          </div>
          {loadError && (
            <p role="alert" className="repository-error">
              {loadError}
            </p>
          )}
          <Field
            label="SVG 目录"
            hint="逐级浏览，可选择多个目录；选中父目录会包含其全部子目录"
          >
            <DirectoryCascader
              paths={metadata?.directories ?? []}
              value={directories}
              onChange={setDirectories}
              disabled={!metadata || loading}
            />
          </Field>
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
                requestVersion.current++;
                setShowForm(false);
              }}
            >
              取消
            </Button>
            <Button
              type="submit"
              loading={busy}
              disabled={
                loading ||
                !directories.length ||
                (!metadata &&
                  !(
                    editing &&
                    sources.some(
                      (source) =>
                        source.id === editing &&
                        source.url === url &&
                        source.branch === branch,
                    )
                  ))
              }
            >
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
                    onClick={() => onRemove(source)}
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
                <p>选择仓库和目录，DesiCast 会同步 SVG 并提供给 MCP。</p>
                <Button kind="ghost" onClick={() => edit()}>
                  连接第一个仓库
                </Button>
              </div>
            )}
      </div>
      <div className="settings-note">
        仓库只读同步，不会提交或推送。更新失败时保留上一份缓存。
        <br />
        私有仓库请先在本机授权 Git、gh 或 glab 后读取仓库；不支持 SSH 地址或 Git
        子模块。
      </div>
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
