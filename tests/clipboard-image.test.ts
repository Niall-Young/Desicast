import { test } from "node:test";
import assert from "node:assert/strict";
import { clipboardImage } from "../src/renderer/clipboard-image";

function clipboard(
  items: { type: string; getAsFile: () => File | null }[],
  files: File[] = [],
) {
  return { items, files } as unknown as Pick<DataTransfer, "items" | "files">;
}

test("image paste accepts image items and files-only clipboard payloads", () => {
  const image = new File(["image"], "screenshot.png", { type: "image/png" });
  const text = { type: "text/plain", getAsFile: () => null };
  assert.equal(
    clipboardImage(
      clipboard([text, { type: image.type, getAsFile: () => image }]),
    ),
    image,
  );
  assert.equal(clipboardImage(clipboard([], [image])), image);
  assert.equal(
    clipboardImage(
      clipboard([{ type: image.type, getAsFile: () => null }], [image]),
    ),
    image,
  );
});

test("text and non-image clipboard data leave native text paste untouched", () => {
  assert.equal(
    clipboardImage(clipboard([{ type: "text/plain", getAsFile: () => null }])),
    undefined,
  );
  assert.equal(
    clipboardImage(
      clipboard([], [new File(["text"], "note.txt", { type: "text/plain" })]),
    ),
    undefined,
  );
});
