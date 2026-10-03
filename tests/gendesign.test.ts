import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import provenance from "../gendesign-provenance.json";

test("Gendesign controls retain the recorded upstream source, including interaction and motion", async () => {
  for (const [path, entry] of Object.entries(provenance.files)) {
    let source = await readFile(path, "utf8");
    if (path === "components/ui/message.tsx") {
      assert.equal(
        (await readFile("lib/utils.ts", "utf8")).trim(),
        'export { cn } from "cn";',
      );
      source = source.replace('from "@/lib/utils"', 'from "cn"');
    }
    const normalized = entry.parser
      ? await format(source, { parser: entry.parser })
      : source;
    assert.equal(
      createHash("sha256").update(normalized).digest("hex"),
      entry.normalizedSha256,
      `${path} differs from the recorded Gendesign revision; review and record upstream changes explicitly`,
    );
  }
});
