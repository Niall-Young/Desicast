import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import warning from "./design-assets/remove-library-warning.svg?url";

export function RemoveLibraryDialog({
  name,
  onClose,
  onRemove,
  onError,
}: {
  name: string;
  onClose: () => void;
  onRemove: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent negative className="remove-library-dialog">
        <DialogHeader
          icon={<img src={warning} width="20" height="20" alt="" />}
        >
          <DialogTitle>移除图标库</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>
            图标库移除后将不会再显示在此处，你需要重新添加，你确定要这样做吗？
          </DialogDescription>
          <span className="sr-only">{name}</span>
          {error && (
            <p role="alert" className="repository-error">
              {error}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button kind="tonal" disabled={busy} onClick={onClose}>
            取消
          </Button>
          <Button
            color="negative"
            loading={busy}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await onRemove();
                onClose();
              } catch (error) {
                setError(error instanceof Error ? error.message : "移除失败");
                onError(error);
              } finally {
                setBusy(false);
              }
            }}
          >
            移除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
