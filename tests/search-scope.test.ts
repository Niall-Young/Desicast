import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { IconService } from "../src/core/service";
import { MemorySecrets } from "../src/core/secrets";
import { VisionModel } from "../src/core/model";
import { publicSearchCollections } from "../src/core/search-scope";
import type { Icon } from "../src/core/types";

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>';
const publicIcon = (collection: string): Icon => ({
  id: `public:${collection}:search`,
  name: "search",
  collection,
  sourceId: "public",
  svg,
  sourceUrl: "https://example.com/icons",
});

test("Global retrieval scopes network requests and rejects unrelated results before preview download", async () => {
  const directory = await mkdtemp(join(tmpdir(), "desicast-scope-"));
  const requests: URL[] = [];
  const service = new IconService(
    directory,
    new MemorySecrets(),
    async (input) => {
      const url = new URL(String(input));
      requests.push(url);
      if (url.pathname === "/search") {
        assert.equal(
          url.searchParams.get("prefixes"),
          publicSearchCollections.join(","),
        );
        return Response.json({
          icons: [
            "coolicons:search",
            "material-symbols:search",
            "solar:search",
            "ri:search",
            "lucide:search",
          ],
          total: 5,
        });
      }
      if (url.pathname === "/collections")
        return Response.json({ lucide: { name: "Lucide", total: 1 } });
      if (url.pathname.endsWith(".svg")) return new Response(svg);
      return new Response("unavailable", { status: 404 });
    },
  );
  try {
    const result = await service.search({ query: "搜索", limit: 1 });
    assert.deepEqual(
      result.icons.map((icon) => icon.id),
      ["public:lucide:search"],
    );
    assert.equal(result.total, 1);
    assert.ok(
      requests.every(
        (url) => !/coolicons|material-symbols|solar|\/ri\//.test(url.pathname),
      ),
    );
  } finally {
    service.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("Offline keyword and vision search exclude foreign cache and hidden libraries; only vision requires opt-in", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "desicast-scope-"));
  const service = new IconService(directory, new MemorySecrets(), async () => {
    throw new Error("offline");
  });
  try {
    for (const [id, allowVision] of [
      ["enabled", true],
      ["disabled", false],
      ["hidden", true],
    ] as const) {
      service.store.saveSource({
        id,
        name: id,
        kind: "repository",
        allowVision,
        iconCount: 0,
      });
      service.store.cache([
        { ...publicIcon("Team"), id: `${id}:search`, sourceId: id },
      ]);
    }
    service.store.saveSetting("library-preferences", {
      hidden: { hidden: true },
      eva: { hidden: true },
    });
    service.store.cache(
      [
        ...publicSearchCollections,
        "coolicons",
        "material-symbols",
        "solar",
        "ri",
      ].map(publicIcon),
    );
    const keyword = await service.search({ query: "search" });
    assert.deepEqual(
      new Set(keyword.icons.map((icon) => icon.id)),
      new Set([
        "enabled:search",
        "disabled:search",
        ...publicSearchCollections
          .filter((id) => id !== "eva")
          .map((id) => `public:${id}:search`),
      ]),
    );
    assert.equal(
      (
        await service.search({
          query: "search",
          sourceId: "public",
          collection: "solar",
        })
      ).total,
      0,
    );
    await service.saveSettings({
      theme: "system",
      model: {
        baseUrl: "https://model.example/v1",
        model: "fixture",
        consent: true,
      },
    });
    t.mock.method(VisionModel.prototype, "describe", async () => ({
      keywords: ["search"],
      shape: "circle",
      style: "outline",
    }));
    t.mock.method(
      VisionModel.prototype,
      "rank",
      async (_image: string, candidates: Icon[]) => {
        assert.ok(
          candidates.every(
            (icon) =>
              icon.sourceId === "enabled" ||
              (icon.sourceId === "public" &&
                publicSearchCollections.some((id) => id === icon.collection) &&
                icon.collection !== "eva"),
          ),
        );
        return candidates;
      },
    );
    const dataUrl = "data:image/png;base64,aGVsbG8=";
    const visual = await service.vision({ dataUrl });
    assert.equal(visual.icons.length, 6);
    service.store.saveSource({
      ...service.store.source("public")!,
      allowVision: false,
    });
    assert.deepEqual(
      (await service.vision({ dataUrl })).icons.map((icon) => icon.id),
      ["enabled:search"],
    );
    await assert.rejects(
      service.vision({ dataUrl, sourceId: "disabled" }),
      /禁用/,
    );
  } finally {
    service.close();
    await rm(directory, { recursive: true, force: true });
  }
});
