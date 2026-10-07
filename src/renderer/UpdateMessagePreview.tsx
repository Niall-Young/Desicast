import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LibraryUpdateMessage } from "./LibraryUpdateMessage";
import type { LibraryChanges } from "../core/types";

const previewChanges: LibraryChanges = {
  revision: "preview-update-199",
  detectedAt: "2026-10-07T00:00:00Z",
  added: 0,
  updated: 199,
  removed: 0,
};

/** Development-only preview; never acknowledges real library changes. */
export function UpdateMessagePreview() {
  const [preview, setPreview] = useState(1);
  return (
    <>
      {preview > 0 && (
        <LibraryUpdateMessage
          key={preview}
          changes={previewChanges}
          onAcknowledge={() => setPreview(0)}
        />
      )}
      <div className="pointer-events-auto fixed bottom-6 left-1/2 z-[100] -translate-x-1/2">
        <Button kind="tonal" onClick={() => setPreview((value) => value + 1)}>
          再次预览更新通知
        </Button>
      </div>
    </>
  );
}
