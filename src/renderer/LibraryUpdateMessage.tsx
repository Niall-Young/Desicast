import { useEffect } from "react";
import { Toast } from "@base-ui/react/toast";
import { Button } from "@/components/ui/button";
import type { LibraryChanges } from "../core/types";
import informationIcon from "./design-assets/library-update/information.svg?url";

export function LibraryUpdateMessage({
  changes,
  onAcknowledge,
}: {
  changes: LibraryChanges;
  onAcknowledge: () => void;
}) {
  const count = changes.added + changes.updated + changes.removed;
  const title = count
    ? `该图标库更新了 ${count.toLocaleString()} 个图标`
    : "该图标库已更新";
  return (
    <Toast.Provider timeout={0} limit={1}>
      <UpdateMessage title={title} onAcknowledge={onAcknowledge} />
    </Toast.Provider>
  );
}

function UpdateMessage({
  title,
  onAcknowledge,
}: {
  title: string;
  onAcknowledge: () => void;
}) {
  const { add, close, toasts } = Toast.useToastManager();
  useEffect(() => {
    const id = add({ title });
    // A wall-clock deadline also expires while the message is hovered/focused.
    const timer = setTimeout(() => close(id), 20_000);
    return () => {
      clearTimeout(timer);
      close(id);
    };
  }, [add, close, title]);

  return (
    <Toast.Portal>
      <Toast.Viewport
        className="library-update-viewport"
        aria-label="图库更新通知"
      >
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            toast={toast}
            className="library-update-message"
            swipeDirection={[]}
          >
            <Toast.Content className="library-update-content">
              <img src={informationIcon} width={16} height={16} alt="" />
              <Toast.Title />
            </Toast.Content>
            <Button
              kind="filled"
              size="md"
              onClick={() => {
                close(toast.id);
                onAcknowledge();
              }}
            >
              我知道了
            </Button>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}
