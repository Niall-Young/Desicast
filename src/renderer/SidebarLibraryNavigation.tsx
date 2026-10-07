import { Fragment, type ReactNode } from "react";
import { PinFilled } from "@mingcute/react/core-filled";
import { IconButton } from "@/components/ui/icon-button";
import "./sidebar-library-navigation.css";

export function SidebarLibraryNavigation<Entry>({
  entries,
  getId,
  isPinned,
  onUnpin,
  pinnedLabel,
  unpinLabel,
  emptyLabel,
  heading,
  children,
}: {
  entries: readonly Entry[];
  getId: (entry: Entry) => string;
  isPinned: (id: string) => boolean;
  onUnpin: (id: string) => void;
  pinnedLabel: string;
  unpinLabel: string;
  emptyLabel: string;
  heading: ReactNode;
  children: (entry: Entry) => ReactNode;
}) {
  const pinned = entries.filter((entry) => isPinned(getId(entry)));
  const libraries = entries.filter((entry) => !isPinned(getId(entry)));

  return (
    <div className="sidebar-library-groups">
      {pinned.length > 0 && (
        <section aria-label={pinnedLabel}>
          <div className="library-heading">
            <span className="library-heading-title">{pinnedLabel}</span>
          </div>
          <div className="library-navigation">
            {pinned.map((entry) => {
              const id = getId(entry);
              return (
                <div className="pinned-library-row" key={id}>
                  {children(entry)}
                  <IconButton
                    className="pinned-library-unpin"
                    kind="plain"
                    size="sm"
                    aria-label={unpinLabel}
                    title={unpinLabel}
                    onClick={() => onUnpin(id)}
                  >
                    <PinFilled size={16} aria-hidden="true" />
                  </IconButton>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {heading}
      <div className="library-navigation">
        {libraries.map((entry) => (
          <Fragment key={getId(entry)}>{children(entry)}</Fragment>
        ))}
        {entries.length === 0 && (
          <p className="library-filter-empty">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}
