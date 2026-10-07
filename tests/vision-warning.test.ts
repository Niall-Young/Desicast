import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { IconService } from "../src/core/service";
import { MemorySecrets } from "../src/core/secrets";
import { VisionModel } from "../src/core/model";
import type { Icon } from "../src/core/types";

const icon: Icon = {
  id: "public:lucide:search",
  name: "search",
  collection: "lucide",
  sourceId: "public",
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>',
  sourceUrl: "https://example.com/icons",
};

test("Visual retrieval distinguishes partial failures, cached fallback and no candidates", async (t) => {
  for (const mode of ["success", "partial", "offline", "empty"] as const) {
    await t.test(mode, async (t) => {
      const directory = await mkdtemp(join(tmpdir(), "desicast-warning-"));
      const service = new IconService(directory, new MemorySecrets());
      try {
        if (mode !== "empty") service.store.cache([icon]);
        await service.saveSettings({
          theme: "system",
          model: {
            baseUrl: "https://model.example/v1",
            model: "fixture",
            consent: true,
          },
        });
        t.mock.method(VisionModel.prototype, "describe", async () => ({
          keywords: ["search", "circle"],
          shape: "circle",
          style: "outline",
        }));
        t.mock.method(
          VisionModel.prototype,
          "rank",
          async (_image: string, candidates: Icon[]) => candidates,
        );
        t.mock.method(
          service.publicLibrary,
          "search",
          async (query: string) => {
            if (
              mode === "offline" ||
              mode === "empty" ||
              (mode === "partial" && query === "circle")
            )
              throw new Error("request failed");
            return { icons: [icon], total: 1 };
          },
        );
        const result = await service.vision({
          dataUrl: "data:image/png;base64,aGVsbG8=",
        });
        if (mode === "success") assert.equal(result.warning, undefined);
        if (mode === "partial") {
          assert.equal(result.icons.length, 1);
          assert.equal(result.warning, "部分公共图库检索失败，结果可能不完整");
        }
        if (mode === "offline") {
          assert.equal(result.icons.length, 1);
          assert.equal(
            result.warning,
            "公共图库检索失败，当前仅使用本地缓存候选",
          );
        }
        if (mode === "empty") {
          assert.equal(result.icons.length, 0);
          assert.match(result.warning!, /未获取到候选图标/);
          assert.doesNotMatch(result.warning!, /本地缓存/);
          assert.equal(
            (await service.search({ query: "search" })).warning,
            "公共图库检索失败，暂时无法获取结果",
          );
        }
      } finally {
        service.close();
        await rm(directory, { recursive: true, force: true });
      }
    });
  }
});
