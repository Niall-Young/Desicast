import type { ReactElement } from "react";
import { ContextMenu } from "@base-ui/react/context-menu";
import { Button } from "@/components/ui/button";

export function LibraryContextMenu({
  children,
  pinned,
  onOpen,
  onPin,
  onConfigure,
  onSource,
  onRemove,
}: {
  children: ReactElement;
  pinned?: boolean;
  onOpen: () => void;
  onPin: () => void;
  onConfigure: () => void;
  onSource: () => void;
  onRemove: () => void;
}) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={children} />
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="library-context-positioner">
          <ContextMenu.Popup
            className="library-context-menu"
            aria-label="图标库操作"
          >
            {[
              ["打开", onOpen],
              [pinned ? "取消置顶" : "置顶", onPin],
              ["配置", onConfigure],
              ["查看来源", onSource],
              ["移除图标库", onRemove],
            ].map(([label, action]) => (
              <ContextMenu.Item
                key={String(label)}
                render={
                  <Button kind="plain" className="library-context-item" />
                }
                onClick={action as () => void}
              >
                {String(label)}
              </ContextMenu.Item>
            ))}
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
