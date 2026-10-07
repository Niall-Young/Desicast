import { flushSync } from "react-dom";
import { Button as TagButton } from "@base-ui/react/button";
import imageTagClose from "./design-assets/image-tag/close.svg?url";
import { GlobalSearchDialog } from "./GlobalSearchDialog";
import { ModelSettings } from "./ModelSettings";
import { AddLibraryDialog } from "./AddLibraryDialog";
import { IconViewSwitch } from "./IconViewSwitch";
import { HomeLibraryPager } from "./HomeLibraryPager";
import { SettingsPage } from "./SettingsPage";
import { applyBrandColor } from "./appearance";
import { MCPSettings } from "./MCPSettings";
import { LibraryFilterMenu } from "./LibraryFilterMenu";
import {
  defaultLibraryFilter,
  filterLibraries,
  type LibraryFilter,
} from "./library-filter";
import { LibraryContextMenu } from "./LibraryContextMenu";
import { RemoveLibraryDialog } from "./RemoveLibraryDialog";
import { RepositoryEmptyState } from "./RepositoryEmptyState";
import { LibraryUpdateMessage } from "./LibraryUpdateMessage";
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
} from "@mingcute/react/core-regular";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { GithubFilled } from "@mingcute/react/core-filled";
import { IconButton } from "@/components/ui/icon-button";
import { useMessage } from "@/components/ui/message";
import { SearchBox } from "@/components/ui/search-box";
import { Select } from "./Select";
import { Pagination } from "@/components/ui/pagination";
import { Segmented, SegmentedList, SegmentedItem } from "./Segmented";
import { Spinner } from "@/components/ui/spinner";
import { StatusIndicator } from "@/components/ui/status-indicator";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";

import type {
  Collection,
  LibraryChanges,
  ExportResult,
  Icon,
  SearchResult,
  Settings,
  Source,
  Target,
} from "../core/types";
import { api, initialSettings, svgUrl, isMonochrome } from "./api";
import { clipboardImage } from "./clipboard-image";

type Page = "home" | "library" | "repositories" | "model" | "appearance";
const publicLibraryOrigins: Record<string, string> = {
  lucide: "https://lucide.dev",
  tabler: "https://tabler.io/icons",
  ri: "https://remixicon.com",
  uil: "https://iconscout.com/unicons",
  mingcute: "https://www.mingcute.com",
  ic: "https://fonts.google.com/icons",
  eva: "https://akveo.github.io/eva-icons",
};
const targets: Target[] = ["svg", "react", "vue", "swiftui"];
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
  const message = useMessage();
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
  const [configureLibrary, setConfigureLibrary] = useState<Source>();
  const [addLibraryOpen, setAddLibraryOpen] = useState(false);
  const openAddLibrary = () => setAddLibraryOpen(true);
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
        onConfigure={
          isPublic
            ? undefined
            : () => {
                const source = sources.find((item) => item.id === id);
                if (source) setConfigureLibrary(source);
              }
        }
        onSource={() => {
          const url = isPublic
            ? (collections.find((item) => item.id === id)?.authorUrl ??
              publicLibraryOrigins[id])
            : sources.find((item) => item.id === id)?.url;
          if (url) api("openUrl", url).catch(report);
          else report(new Error("图库来源暂不可用"));
        }}
        onRemove={
          isPublic
            ? undefined
            : () => setRemoveLibrary({ id, name, public: false })
        }
      >
        {button}
      </LibraryContextMenu>
    );
  }
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState("");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [librarySearchOpen, setLibrarySearchOpen] = useState(false);
  const librarySearchButton = useRef<HTMLButtonElement>(null);
  const [libraryOptions, setLibraryOptions] =
    useState<LibraryFilter>(defaultLibraryFilter);
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
    [revision, setRevision] = useState(0);
  const visionEnabled = sourceId
    ? Boolean(sources.find((source) => source.id === sourceId)?.allowVision)
    : sources.some((source) => source.allowVision);
  const [target, setTarget] = useState<Target>("svg"),
    [exported, setExported] = useState<ExportResult>(),
    [exportPending, setExportPending] = useState(false),
    [detailOpen, setDetailOpen] = useState(false);
  const [codeAnimation, setCodeAnimation] = useState<{
    key: number;
    direction: "forward" | "backward";
  }>({ key: 0, direction: "forward" });
  const [detailMounted, setDetailMounted] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [viewDirection, setViewDirection] = useState<"forward" | "backward">();
  const [reference, setReference] = useState<string>(),
    [visionResult, setVisionResult] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null),
    generation = useRef(0),
    pendingSearchIcon = useRef<Icon | undefined>(undefined),
    searchInput = useRef<HTMLInputElement>(null),
    syncing = useRef(new Set<string>());
  const lastExportTarget = useRef<Target>(target),
    pendingExportDirection = useRef<"forward" | "backward">("forward"),
    lastExportIconId = useRef<string | undefined>(undefined);
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
  const flash = (text: string) => {
    message.add({ title: text, color: "positive" });
  };
  const report = (err: unknown) =>
    message.add({
      title: err instanceof Error ? err.message : "操作失败",
      color: "negative",
      timeout: 8000,
    });
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
    const apply = () => {
      const dark =
        settings.theme === "dark" ||
        (settings.theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      applyBrandColor(
        document.documentElement,
        settings.brandColor ?? "grey",
        dark,
      );
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings.theme, settings.brandColor]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setGlobalSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    if (detailOpen) {
      setDetailMounted(true);
      return;
    }
    const timer = setTimeout(() => setDetailMounted(false), 180);
    return () => clearTimeout(timer);
  }, [detailOpen]);
  useEffect(() => {
    if (page !== "library") return;
    const current = ++generation.current;
    const timer = setTimeout(() => {
      setBusy(true);
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
          const opened = pendingSearchIcon.current;
          pendingSearchIcon.current = undefined;
          if (opened && !value.icons.some((icon) => icon.id === opened.id)) {
            value = {
              ...value,
              icons: [opened, ...value.icons],
              total: Math.max(value.total, 1),
            };
          }
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
    const switchingIcon =
      selected !== undefined && lastExportIconId.current !== selected.id;
    if (switchingIcon) {
      lastExportIconId.current = selected.id;
      setExported(undefined);
    }
    if (!selected) {
      setExportPending(false);
      return;
    }
    if (switchingIcon) setExportPending(true);
    api<ExportResult>("getIcon", {
      id: selected.id,
      target,
      color: "currentColor",
    })
      .then((value) => {
        if (!alive) return;
        setExported(value);
        if (lastExportTarget.current !== target) {
          lastExportTarget.current = target;
          setCodeAnimation((previous) => ({
            key: previous.key + 1,
            direction: pendingExportDirection.current,
          }));
        }
      })
      .catch(report)
      .finally(() => {
        if (alive) setExportPending(false);
      });
    return () => {
      alive = false;
    };
  }, [selected?.id, selected?.svg, target]);
  function chooseSource(id: string) {
    pendingSearchIcon.current = undefined;
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
  const [libraryRefreshing, setLibraryRefreshing] = useState(false);
  const libraryRefreshPending = useRef(false);
  async function refreshLibrary() {
    if (libraryRefreshPending.current) return;
    libraryRefreshPending.current = true;
    setLibraryRefreshing(true);
    try {
      if (activeSource?.kind === "repository") {
        await sync(activeSource);
        return;
      }
      await refreshCollections(true);
      setRevision((value) => value + 1);
      flash("图库目录已更新");
    } catch (err) {
      report(err);
    } finally {
      libraryRefreshPending.current = false;
      setLibraryRefreshing(false);
    }
  }
  async function sync(source: Source) {
    if (syncing.current.has(source.id)) return;
    syncing.current.add(source.id);
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
    if (!visionEnabled) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      message.add({
        title: "请选择小于 8 MB 的 PNG、JPEG 或 WebP",
        color: "negative",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      void searchImage(String(reader.result), page === "home");
    };
    reader.onerror = () => flash("图片读取失败，请重新选择");
    reader.readAsDataURL(file);
  }
  async function searchImage(dataUrl: string, global = false) {
    if (global ? !sources.some((source) => source.allowVision) : !visionEnabled)
      return;
    if (global) {
      // Settle navigation before starting the request in its new scope.
      flushSync(() => chooseSource(""));
    }
    setReference(dataUrl);
    if (!settings.model.model || !settings.model.consent) {
      setPage("model");
      flash("请先配置视觉模型并确认图片发送范围");
      return;
    }
    const current = ++generation.current;
    setBusy(true);
    try {
      const value = await api<SearchResult>("vision", {
        dataUrl,
        sourceId: global ? undefined : sourceId || undefined,
        collection: global ? undefined : collection || undefined,
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
    if (!exported || exportPending) return;
    try {
      await api("copy", exported.code);
      flash("代码已复制");
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
  const availablePublicLibraries = defaultLibraries
    .filter((library) => !libraryPreferences[library.id]?.hidden)
    .map((library) => ({
      ...library,
      name: libraryPreferences[library.id]?.name ?? library.name,
    }));
  const searchLibraries = [
    ...availablePublicLibraries.map((library) => ({
      id: library.id,
      name: library.name,
      public: true,
    })),
    ...teams
      .filter((source) => !libraryPreferences[source.id]?.hidden)
      .map((source) => ({ id: source.id, name: source.name, public: false })),
  ];
  const iconLibraryNames = new Map([
    ...collections.map((item) => [item.id, item.name] as const),
    ...searchLibraries.map((item) => [item.id, item.name] as const),
  ]);
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
      className={`app ${sidebarOpen || settingsOpen ? "" : "sidebar-collapsed"} ${settingsOpen ? "settings-view" : page === "home" ? "home-view" : page === "library" ? "library-view" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (event.dataTransfer.files[0]) loadFile(event.dataTransfer.files[0]);
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
              disabled={!settingsOpen && !previousPage}
              onClick={() => {
                if (settingsOpen) {
                  setSettingsOpen(false);
                } else if (previousPage) {
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
              disabled={settingsOpen || !nextPage}
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
              disabled={settingsOpen}
              aria-label="切换侧栏"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((value) => !value)}
            >
              <DesignIcon name="sidebar" />
            </IconButton>
          </div>
        </div>
        {page === "library" && !settingsOpen ? (
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
          <div className="window-title">
            {settingsOpen ? (
              <Settings1Regular size={20} aria-hidden="true" />
            ) : (
              <img src={brandLogo} width="28" height="28" alt="DesiCast Logo" />
            )}
            <span>{settingsOpen ? "设置" : "DesiCast"}</span>
          </div>
        )}
      </header>
      {settingsOpen ? (
        <SettingsPage
          settings={settings}
          onSettings={setSettings}
          onClose={() => setSettingsOpen(false)}
          onError={report}
          onNotice={flash}
          modelContent={
            <ModelSettings
              settings={settings}
              onSettings={setSettings}
              onError={report}
              onNotice={flash}
            />
          }
          libraryContent={
            <RepositorySettings
              sources={teams}
              onRemove={(source) =>
                setRemoveLibrary({
                  id: source.id,
                  name: source.name,
                  public: false,
                })
              }
              onRefresh={() => {
                refreshSources();
                setRevision((value) => value + 1);
              }}
              onSync={sync}
              onError={report}
              onNotice={flash}
            />
          }
        />
      ) : (
        <div className="shell">
          <aside
            className="sidebar"
            aria-label="图库导航"
            aria-hidden={!sidebarOpen}
            inert={!sidebarOpen}
          >
            <div className="sidebar-inner">
              <div className="sidebar-menu">
                <Button
                  className="nav-item"
                  kind="plain"
                  onClick={openAddLibrary}
                >
                  <AddRegular size={16} />
                  <span>添加图标库</span>
                </Button>
                <Button
                  className="nav-item"
                  selected={globalSearchOpen}
                  kind="plain"
                  onClick={() => setGlobalSearchOpen(true)}
                >
                  <DesignIcon name="search" />
                  <span>全局搜索</span>
                </Button>
              </div>
              <div className="library-heading">
                {librarySearchOpen ? (
                  <SearchBox
                    size="sm"
                    wrapperClassName="library-heading-search"
                    aria-label="搜索图标库"
                    placeholder="搜索图标库"
                    autoFocus
                    value={libraryFilter}
                    onValueChange={setLibraryFilter}
                    onBlur={() => {
                      if (!libraryFilter) setLibrarySearchOpen(false);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Escape") return;
                      event.preventDefault();
                      setLibraryFilter("");
                      setLibrarySearchOpen(false);
                      requestAnimationFrame(() =>
                        librarySearchButton.current?.focus(),
                      );
                    }}
                  />
                ) : (
                  <span className="library-heading-title">图标库</span>
                )}
                <div className="library-heading-actions">
                  {!librarySearchOpen && (
                    <IconButton
                      ref={librarySearchButton}
                      kind="plain"
                      size="sm"
                      aria-label="搜索图标库"
                      onClick={() => setLibrarySearchOpen(true)}
                    >
                      <DesignIcon name="library-search" />
                    </IconButton>
                  )}
                  <LibraryFilterMenu
                    value={libraryOptions}
                    onChange={setLibraryOptions}
                  />
                  <IconButton
                    kind="plain"
                    size="sm"
                    aria-label="添加图标库"
                    onClick={openAddLibrary}
                  >
                    <AddRegular size={16} />
                  </IconButton>
                </div>
              </div>
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
                    <Button
                      key={id}
                      data-testid={`library-${id}`}
                      className="nav-item"
                      kind="plain"
                      selected={
                        page === "library" &&
                        (library
                          ? sourceId === "public" && collection === id
                          : sourceId === id)
                      }
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
                    </Button>,
                  );
                })}
                {visibleLibraries.length === 0 && (
                  <p className="library-filter-empty">没有符合条件的图标库</p>
                )}
              </div>
              <div className="sidebar-foot">
                <IconButton
                  kind="plain"
                  aria-label="设置"
                  onClick={() => setSettingsOpen(true)}
                >
                  <DesignIcon name="settings" />
                </IconButton>
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
            </div>
          </aside>
          <main className="workspace">
            {page === "library" && activeChanges && (
              <LibraryUpdateMessage
                key={`${collection ? `public:${collection}` : sourceId}:${activeChanges.revision}`}
                changes={activeChanges}
                onAcknowledge={acknowledgeChanges}
              />
            )}
            {page !== "home" && page !== "library" && (
              <div className="page-heading">
                <div className="heading-title">{titles[page]}</div>
              </div>
            )}
            {page === "home" ? (
              <section className="home-content" aria-label="选择图标库">
                <div className="home-center">
                  <h1>Hello，今天想用什么图标库？</h1>
                  <HomeLibraryPager
                    items={homeEntries.map(({ id, library, source }) => {
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
                  />
                </div>
              </section>
            ) : page === "library" ? (
              <div className="library-layout">
                <section className="library-main">
                  <div className="search-toolbar">
                    <SearchBox
                      ref={searchInput}
                      wrapperClassName="main-search"
                      prefix={
                        visionEnabled && reference ? (
                          <span className="reference-tag">
                            <img
                              className="reference-tag-thumbnail"
                              src={reference}
                              alt="图片搜索参考"
                            />
                            <TagButton
                              className="reference-tag-remove"
                              aria-label="移除参考图"
                              onClick={() => {
                                generation.current++;
                                setBusy(false);
                                setVisionResult(false);
                                setReference(undefined);
                                setRevision((value) => value + 1);
                                searchInput.current?.focus();
                              }}
                            >
                              <img
                                src={imageTagClose}
                                alt=""
                                width={16}
                                height={16}
                              />
                            </TagButton>
                          </span>
                        ) : undefined
                      }
                      size="md"
                      aria-label="搜索图标"
                      onPaste={(event) => {
                        if (!visionEnabled) return;
                        const file = clipboardImage(event.clipboardData);
                        if (!file) return;
                        event.preventDefault();
                        void loadFile(file);
                      }}
                      placeholder="搜索图标名称"
                      value={query}
                      onValueChange={(value) => {
                        setQuery(value);
                        setOffset(0);
                      }}
                    />
                    <div className="grid-toolbar-actions">
                      <div className="grid-search-actions">
                        {visionEnabled && (
                          <IconButton
                            kind="plain"
                            size="md"
                            aria-label="以图搜图"
                            onClick={() => fileInput.current?.click()}
                          >
                            <DesignIcon name="image-search" />
                          </IconButton>
                        )}
                        <IconButton
                          kind="plain"
                          size="md"
                          aria-label={
                            libraryRefreshing ? "正在刷新图库" : "刷新图库"
                          }
                          loading={libraryRefreshing}
                          onClick={refreshLibrary}
                        >
                          <DesignIcon name="refresh-library" />
                        </IconButton>
                      </div>
                      <IconViewSwitch
                        value={view}
                        onValueChange={(next) => {
                          if (next === view) return;
                          setViewDirection(
                            next === "list" ? "forward" : "backward",
                          );
                          setView(next);
                        }}
                      />
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
                      <Select
                        aria-label="图标集"
                        items={[
                          { value: "", label: "全部图标集" },
                          ...availablePublicLibraries.map((item) => ({
                            value: item.id,
                            label: item.name,
                          })),
                        ]}
                        value={collection}
                        onValueChange={(value) => {
                          if (value === undefined) return;
                          if (!value) {
                            setGlobalSearchOpen(true);
                            return;
                          }
                          setCollection(value);
                          setOffset(0);
                        }}
                        disabled={Boolean(activeSource?.kind === "repository")}
                      />
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
                        key={view}
                        className={`icon-grid ${view === "list" ? "icon-list" : ""} ${viewDirection ? `code-slide-${viewDirection}` : ""}`}
                        onAnimationEnd={() => setViewDirection(undefined)}
                      >
                        {result.icons.map((icon) => (
                          <button
                            key={icon.id}
                            data-testid="icon-card"
                            className={`icon-card ${selected?.id === icon.id ? "selected" : ""}`}
                            aria-pressed={
                              selected?.id === icon.id && detailOpen
                            }
                            onClick={() => {
                              setSelected(icon);
                              setDetailOpen(true);
                            }}
                            title={`${icon.name} · ${iconLibraryNames.get(icon.sourceId === "public" ? icon.collection : icon.sourceId) ?? designNames[icon.collection] ?? icon.collection}`}
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
                            <span className="card-labels">
                              <span className="card-name">{icon.name}</span>
                              <span className="card-source">
                                {iconLibraryNames.get(
                                  icon.sourceId === "public"
                                    ? icon.collection
                                    : icon.sourceId,
                                ) ??
                                  designNames[icon.collection] ??
                                  icon.collection}
                              </span>
                            </span>
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
                          <Button
                            kind="ghost"
                            onClick={() => sync(activeSource)}
                          >
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
                    <Pagination
                      size="sm"
                      count={Math.ceil(result.total / 48)}
                      page={Math.floor(offset / 48) + 1}
                      disabled={busy || visionResult}
                      onPageChange={(value) => setOffset((value - 1) * 48)}
                    />
                  </footer>
                </section>
                {detailMounted && (
                  <aside
                    className={`detail ${detailOpen ? "" : "detail-exit"}`}
                    aria-label="图标详情"
                    aria-hidden={!detailOpen}
                    inert={!detailOpen}
                  >
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
                            <LinkButton
                              color="link"
                              onClick={() =>
                                api("openUrl", selected.sourceUrl).catch(report)
                              }
                              leftIcon={
                                selected.sourceUrl.includes("github.com") ? (
                                  <GithubFilled />
                                ) : (
                                  <LinkRegular size={16} />
                                )
                              }
                            >
                              {selected.sourceUrl.includes("github.com")
                                ? "GitHub"
                                : "查看来源"}
                            </LinkButton>
                          </div>
                        </div>
                        <div className="export-section">
                          <Segmented
                            value={target}
                            onValueChange={(value) => {
                              const next = value as Target;
                              pendingExportDirection.current =
                                targets.indexOf(next) > targets.indexOf(target)
                                  ? "forward"
                                  : "backward";
                              setTarget(next);
                            }}
                          >
                            <SegmentedList aria-label="导出格式">
                              {targets.map((value) => (
                                <SegmentedItem key={value} value={value}>
                                  {labels[value]}
                                </SegmentedItem>
                              ))}
                            </SegmentedList>
                          </Segmented>
                          <div className="code-preview">
                            <pre
                              key={codeAnimation.key}
                              className={`code-slide-${codeAnimation.direction}`}
                            >
                              {exported?.code.replace(
                                /^(?:\/\/ Source:[^\n]*\n|<!-- Source:[^\n]* -->\n)/,
                                "",
                              ) ?? "正在生成…"}
                            </pre>
                          </div>
                          <div className="export-actions">
                            <Button
                              disabled={!exported || exportPending}
                              onClick={copy}
                            >
                              复制代码
                            </Button>
                            <IconButton
                              kind="tonal"
                              aria-label="导出资源文件"
                              title={
                                target === "swiftui"
                                  ? "导出后将 .imageset 拖入 Assets.xcassets"
                                  : "导出资源文件"
                              }
                              disabled={!exported || exportPending}
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
                                saveLibrary(library.id, {
                                  hidden: false,
                                }).catch(report)
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
                      <Select
                        aria-label="外观主题"
                        items={[
                          { value: "system", label: "跟随系统" },
                          { value: "light", label: "浅色" },
                          { value: "dark", label: "深色" },
                        ]}
                        value={settings.theme}
                        onValueChange={(value) => {
                          if (!value) return;
                          const next = {
                            ...settings,
                            theme: value as Settings["theme"],
                          };
                          api<Settings>("saveSettings", { settings: next })
                            .then(setSettings)
                            .catch(report);
                        }}
                      />
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
      )}
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
        <AddLibraryDialog
          key={configureLibrary.id}
          source={configureLibrary}
          onClose={() => setConfigureLibrary(undefined)}
          onSaved={() => {
            refreshSources();
            setRevision((value) => value + 1);
          }}
          onNotice={flash}
        />
      )}
      {globalSearchOpen && (
        <GlobalSearchDialog
          libraries={searchLibraries}
          imageEnabled={sources.some((source) => source.allowVision)}
          onImage={(dataUrl) => {
            setGlobalSearchOpen(false);
            void searchImage(dataUrl, true);
          }}
          onClose={() => setGlobalSearchOpen(false)}
          onLibrary={(library) => {
            chooseSource(library.public ? "public" : library.id);
            if (library.public) setCollection(library.id);
            setGlobalSearchOpen(false);
          }}
          onIcon={(icon) => {
            chooseSource(icon.sourceId);
            if (icon.sourceId === "public") setCollection(icon.collection);
            generation.current++;
            pendingSearchIcon.current = icon;
            setRevision((value) => value + 1);
            setQuery(icon.name);
            setSelected(icon);
            setDetailOpen(true);
            setGlobalSearchOpen(false);
          }}
        />
      )}
      {addLibraryOpen && (
        <AddLibraryDialog
          onClose={() => setAddLibraryOpen(false)}
          onSaved={() => {
            refreshSources();
            setRevision((value) => value + 1);
          }}
          onNotice={flash}
        >
          {defaultLibraries.some(
            (library) => libraryPreferences[library.id]?.hidden,
          ) && (
            <div className="add-library-restores">
              <p>已移除的公共图标库</p>
              {defaultLibraries
                .filter((library) => libraryPreferences[library.id]?.hidden)
                .map((library) => (
                  <Button
                    key={library.id}
                    kind="tonal"
                    size="sm"
                    onClick={() => {
                      saveLibrary(library.id, { hidden: false })
                        .then(() => setAddLibraryOpen(false))
                        .catch(report);
                    }}
                  >
                    重新添加{" "}
                    {libraryPreferences[library.id]?.name ?? library.name}
                  </Button>
                ))}
            </div>
          )}
        </AddLibraryDialog>
      )}
    </div>
  );
}

function RepositorySettings({
  onRemove,
  sources,
  onRefresh,
  onSync,
  onError,
  onNotice,
}: {
  onRemove: (source: Source) => void;
  sources: Source[];
  onRefresh: () => void;
  onSync: (source: Source) => void;
  onError: (err: unknown) => void;
  onNotice: (message: string) => void;
}) {
  const [editing, setEditing] = useState<Source>();
  const [showForm, setShowForm] = useState(false);
  function edit(source?: Source) {
    setEditing(source);
    setShowForm(true);
  }
  return (
    <div className="settings-content wide">
      <div className="settings-intro intro-row">
        <div>
          <h1>团队图标，一个来源</h1>
          <p>连接 GitHub 或 GitLab，让团队维护的 SVG 随时可用</p>
        </div>
        <Button leftIcon={<AddRegular size={16} />} onClick={() => edit()}>
          添加仓库
        </Button>
      </div>
      <Button
        className="settings-library-add"
        kind="ghost"
        onClick={() => edit()}
      >
        添加仓库
      </Button>
      {showForm && (
        <AddLibraryDialog
          source={editing}
          onClose={() => setShowForm(false)}
          onSaved={onRefresh}
          onNotice={onNotice}
        />
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
              <RepositoryEmptyState onAdd={() => edit()} />
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
