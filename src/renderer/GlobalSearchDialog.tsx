import { useEffect, useRef, useState } from "react";
import { Input } from "@base-ui/react/input";
import { Button as ResultButton } from "@base-ui/react/button";
import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalContent,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import type { Icon, SearchResult } from "../core/types";
import { api, svgUrl, isMonochrome } from "./api";
import { defaultLibraries } from "./libraries";
import { DesignIcon, LibraryMark, designNames } from "./design";
import { Segmented, SegmentedList, SegmentedItem } from "./Segmented";
import searchMark from "./design-assets/global-search/search.svg?url";
import moreMark from "./design-assets/global-search/more.svg?url";
import "./global-search.css";

export interface SearchLibrary {
  id: string;
  name: string;
  public: boolean;
}
type Filter = "all" | "libraries" | "icons";

export function GlobalSearchDialog({
  libraries,
  onClose,
  onLibrary,
  onIcon,
}: {
  libraries: SearchLibrary[];
  onClose: () => void;
  onLibrary: (library: SearchLibrary) => void;
  onIcon: (icon: Icon) => void;
}) {
  const [query, setQuery] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [icons, setIcons] = useState<Icon[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const rows = useRef<(HTMLElement | null)[]>([]);
  const scope = JSON.stringify(libraries);
  const hasQuery = Boolean(query.trim());
  const matchingLibraries =
    filter === "icons"
      ? []
      : libraries.filter((library) => {
          const label = `${library.id} ${library.name} ${designNames[library.id] ?? ""}`;
          return (
            !hasQuery ||
            label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
          );
        });
  const visibleIcons =
    filter === "libraries" || !hasQuery
      ? []
      : expanded
        ? icons
        : icons.slice(0, 5);
  const showMore =
    filter !== "libraries" && hasQuery && !expanded && icons.length > 5;
  const count =
    matchingLibraries.length + visibleIcons.length + Number(showMore);
  const waiting = busy && filter !== "libraries";
  useEffect(() => {
    let alive = true;
    setIcons([]);
    setActive(0);
    setExpanded(false);
    setWarning("");
    if (!query.trim() || filter === "libraries") {
      setBusy(false);
      return;
    }
    setBusy(true);
    const timer = setTimeout(async () => {
      const targets = JSON.parse(scope) as SearchLibrary[];
      const results = await Promise.allSettled(
        targets.map((library) =>
          api<SearchResult>("search", {
            query,
            sourceId: library.public ? "public" : library.id,
            collection: library.public ? library.id : undefined,
            limit: 12,
          }),
        ),
      );
      if (!alive) return;
      const found = new Map<string, Icon>();
      let incomplete = false;
      for (const result of results) {
        if (result.status === "fulfilled") {
          for (const icon of result.value.icons) found.set(icon.id, icon);
          incomplete ||= Boolean(result.value.warning);
        } else incomplete = true;
      }
      setIcons([...found.values()]);
      setWarning(incomplete ? "部分图标库暂时无法连接，已显示可用结果" : "");
      setBusy(false);
    }, 220);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, scope, filter]);
  useEffect(() => {
    rows.current[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);
  function open(index: number) {
    if (matchingLibraries[index]) onLibrary(matchingLibraries[index]);
    else if (visibleIcons[index - matchingLibraries.length])
      onIcon(visibleIcons[index - matchingLibraries.length]);
    else if (showMore && index === count - 1) {
      setExpanded(true);
      input.current?.focus();
    }
  }
  function rowProps(index: number) {
    return {
      ref: (node: HTMLElement | null) => {
        rows.current[index] = node;
      },
      id: `global-search-result-${index}`,
      role: "option",
      "aria-selected": active === index,
      "data-selected": active === index,
      className: "global-search-row",
      onFocus: () => setActive(index),
      onMouseEnter: () => setActive(index),
      onClick: () => open(index),
    };
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ModalContent className="global-search-dialog" initialFocus={input}>
        <ModalTitle className="sr-only">全局搜索</ModalTitle>
        <ModalDescription className="sr-only">
          搜索已添加的图标库，使用上下方向键选择，按回车打开
        </ModalDescription>
        <div className="global-search-input">
          <span className="global-search-control-mark" aria-hidden="true">
            <img src={searchMark} alt="" />
          </span>
          <Input
            ref={input}
            type="search"
            aria-label="搜索图标关键词"
            placeholder="搜索图标关键词"
            value={queryInput}
            onValueChange={(value) => {
              setQueryInput(value);
              setActive(0);
            }}
            role="combobox"
            aria-expanded
            aria-autocomplete="list"
            aria-controls="global-search-results"
            aria-activedescendant={
              count && active < count
                ? `global-search-result-${active}`
                : undefined
            }
            onKeyDown={(event) => {
              if (
                event.nativeEvent.isComposing ||
                event.nativeEvent.keyCode === 229
              ) {
                return;
              }
              if (
                (event.key === "ArrowDown" || event.key === "ArrowUp") &&
                count
              ) {
                event.preventDefault();
                setActive(
                  (previous) =>
                    (previous + (event.key === "ArrowDown" ? 1 : -1) + count) %
                    count,
                );
              }
              if (event.key === "Enter") {
                event.preventDefault();
                if (queryInput.trim() !== query) {
                  setQuery(queryInput.trim());
                } else if (!waiting) {
                  open(active);
                }
              }
            }}
          />
        </div>
        <div
          className="global-search-results"
          id="global-search-results"
          role="listbox"
          aria-label="搜索结果"
          aria-busy={waiting}
        >
          {hasQuery && matchingLibraries.length > 0 && (
            <div className="global-search-heading" role="presentation">
              图标库
            </div>
          )}
          {matchingLibraries.map((library, index) => {
            const known = library.public
              ? defaultLibraries.find((item) => item.id === library.id)
              : undefined;
            return (
              <ResultButton key={`library:${library.id}`} {...rowProps(index)}>
                {known ? (
                  <LibraryMark library={known} />
                ) : (
                  <DesignIcon name="book-row" />
                )}
                <span className="global-search-name">
                  {library.public && library.name === known?.name
                    ? (designNames[library.id] ?? library.name)
                    : library.name}
                </span>
              </ResultButton>
            );
          })}
          {hasQuery && filter !== "libraries" && (
            <div className="global-search-heading" role="presentation">
              图标
            </div>
          )}
          {waiting ? (
            <div className="global-search-empty" role="status">
              <Spinner width={16} height={16} />
              正在搜索
            </div>
          ) : (
            visibleIcons.map((icon, index) => (
              <ResultButton
                key={icon.id}
                {...rowProps(matchingLibraries.length + index)}
              >
                <img
                  className={`global-search-preview ${isMonochrome(icon.svg) ? "monochrome" : ""}`}
                  src={svgUrl(icon.svg)}
                  alt=""
                />
                <span className="global-search-name">{icon.name}</span>
                <span className="global-search-source">
                  {libraries.find(
                    (library) =>
                      library.id ===
                      (icon.sourceId === "public"
                        ? icon.collection
                        : icon.sourceId),
                  )?.name ?? icon.collection}
                </span>
              </ResultButton>
            ))
          )}
          {!waiting && showMore && (
            <ResultButton
              {...rowProps(count - 1)}
              className="global-search-row global-search-more"
            >
              <span className="global-search-control-mark" aria-hidden="true">
                <img src={moreMark} alt="" />
              </span>
              <span>查看全部</span>
            </ResultButton>
          )}
          {!waiting && !count && (
            <div className="global-search-empty" role="status">
              {hasQuery
                ? "没有找到匹配结果，试试其他关键词"
                : filter === "icons"
                  ? "输入关键词开始搜索图标"
                  : "添加图标库后开始搜索"}
            </div>
          )}
        </div>
        {warning && (
          <div className="global-search-warning" role="status">
            {warning}
          </div>
        )}
        <div className="global-search-footer">
          <Segmented
            value={filter}
            onValueChange={(value) => {
              setFilter(value as Filter);
              setActive(0);
            }}
          >
            <SegmentedList
              aria-label="搜索范围"
              className="global-search-filters"
            >
              <SegmentedItem value="all">全部</SegmentedItem>
              <SegmentedItem value="libraries">图标库</SegmentedItem>
              <SegmentedItem value="icons">图标</SegmentedItem>
            </SegmentedList>
          </Segmented>
          <Button kind="tonal" onClick={onClose}>
            退出
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
