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

export function RemoveModelProviderDialog({
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
          <DialogTitle>删除模型供应商</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>
            删除「{name}」后将清除该供应商的模型配置和 API
            Key，如需使用需要重新添加，你确定要这样做吗？
          </DialogDescription>
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
                setError(error instanceof Error ? error.message : "删除失败");
                onError(error);
              } finally {
                setBusy(false);
              }
            }}
          >
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
