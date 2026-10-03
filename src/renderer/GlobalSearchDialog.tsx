import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/ui/search-box";
import {
  Modal,
  ModalContent,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { SearchRegular, FolderRegular } from "@mingcute/react/core-regular";
import type { Icon, SearchResult } from "../core/types";
import { api, svgUrl, isMonochrome } from "./api";
import "./global-search.css";

export interface SearchLibrary {
  id: string;
  name: string;
  public: boolean;
}

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
  const [icons, setIcons] = useState<Icon[]>([]);
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const rows = useRef<(HTMLElement | null)[]>([]);
  // Library metadata polls in the background; only scope changes restart search.
  const scope = JSON.stringify(
    libraries.map(({ id, name, public: isPublic }) => ({
      id,
      name,
      public: isPublic,
    })),
  );
  const hasQuery = Boolean(query.trim());
  const count = hasQuery ? icons.length : libraries.length;
  useEffect(() => {
    let alive = true;
    setIcons([]);
    setActive(0);
    setWarning("");
    if (!query.trim()) {
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
  }, [query, scope]);
  useEffect(() => {
    rows.current[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);
  function open(index: number) {
    if (busy) return;
    if (hasQuery && icons[index]) onIcon(icons[index]);
    else if (!hasQuery && libraries[index]) onLibrary(libraries[index]);
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
          <SearchBox
            ref={input}
            size="lg"
            aria-label="搜索已添加图库中的图标"
            placeholder="搜索已添加图库中的图标…"
            value={query}
            onValueChange={(value) => setQuery(value)}
            role="combobox"
            aria-expanded
            aria-autocomplete="list"
            aria-controls="global-search-results"
            aria-activedescendant={
              count && !busy ? `global-search-result-${active}` : undefined
            }
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (
                (event.key === "ArrowDown" || event.key === "ArrowUp") &&
                count &&
                !busy
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
                open(active);
              }
            }}
          />
        </div>
        <div className="global-search-heading">
          {hasQuery ? "图标搜索结果" : "已添加的图标库"}
        </div>
        <div
          className="global-search-results"
          id="global-search-results"
          role="listbox"
          aria-label={hasQuery ? "图标搜索结果" : "图标库"}
          aria-busy={busy}
        >
          {busy ? (
            <div className="global-search-empty" role="status">
              <Spinner width={16} height={16} />
              正在搜索
            </div>
          ) : hasQuery ? (
            icons.map((icon, index) => (
              <Button
                key={icon.id}
                ref={(node) => {
                  rows.current[index] = node;
                }}
                id={`global-search-result-${index}`}
                role="option"
                aria-selected={active === index}
                selected={active === index}
                kind="plain"
                className="global-search-row"
                onFocus={() => setActive(index)}
                onMouseEnter={() => setActive(index)}
                onClick={() => onIcon(icon)}
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
              </Button>
            ))
          ) : (
            libraries.map((library, index) => (
              <Button
                key={library.id}
                ref={(node) => {
                  rows.current[index] = node;
                }}
                id={`global-search-result-${index}`}
                role="option"
                aria-selected={active === index}
                selected={active === index}
                kind="plain"
                className="global-search-row"
                onFocus={() => setActive(index)}
                onMouseEnter={() => setActive(index)}
                onClick={() => onLibrary(library)}
              >
                {library.public ? (
                  <SearchRegular size={20} />
                ) : (
                  <FolderRegular size={20} />
                )}
                <span className="global-search-name">{library.name}</span>
                <span className="global-search-source">
                  {library.public ? "公共图库" : "团队图库"}
                </span>
              </Button>
            ))
          )}
          {!busy && !count && (
            <div className="global-search-empty" role="status">
              {hasQuery
                ? "没有找到匹配的图标，试试其他关键词"
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
          <span>
            <kbd>Enter</kbd> 打开
          </span>
          <span>
            <kbd>↑ ↓</kbd> 选择
          </span>
          <span>
            <kbd>Esc</kbd> 关闭
          </span>
        </div>
      </ModalContent>
    </Modal>
  );
}
