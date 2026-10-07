import { test } from "node:test";
import assert from "node:assert/strict";
import { readClipboardImage } from "../src/electron/clipboard-image";

test("native image fallback reads lazy screenshot blobs without requesting text", async () => {
  const requested: string[] = [];
  const value = await readClipboardImage([
    {
      types: ["text/plain"],
      getType: async () => {
        throw new Error("text must stay native");
      },
    },
    {
      types: ["image/png"],
      getType: async (type) => {
        requested.push(type);
        return new Blob([new Uint8Array([137, 80, 78, 71])], { type });
      },
    },
  ]);
  assert.equal(value, "data:image/png;base64,iVBORw==");
  assert.deepEqual(requested, ["image/png"]);
  assert.equal(await readClipboardImage([]), null);
});

test("native image fallback enforces the upload size limit", async () => {
  await assert.rejects(
    readClipboardImage([
      {
        types: ["image/png"],
        getType: async () => new Blob([new Uint8Array(8 * 1024 * 1024 + 1)]),
      },
    ]),
    /8 MB/,
  );
});
