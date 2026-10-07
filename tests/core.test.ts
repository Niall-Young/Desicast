import { test } from "node:test";
import { repositorySchema } from "../src/core/contracts";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { transform } from "esbuild";
import { parse, compileScript, compileTemplate } from "@vue/compiler-sfc";
import { Store } from "../src/core/store";
import { IconService } from "../src/core/service";
import { MemorySecrets } from "../src/core/secrets";
import { exportIcon, sanitizeSvg } from "../src/core/svg";
import {
  indexRepository,
  repositoryDirectories,
  repositoryUrl,
} from "../src/core/repositories";
import { VisionModel, imageBuffer, modelEndpoint } from "../src/core/model";
import { PublicLibrary } from "../src/core/public";
import type { Icon, Source } from "../src/core/types";

const mono =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 12h20" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
const gradient =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="paint"><stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#00f"/></linearGradient><clipPath id="cut"><circle cx="12" cy="12" r="10"/></clipPath></defs><rect width="24" height="24" fill="url(#paint)" clip-path="url(#cut)"/><title>{example}</title></svg>';
const icon: Icon = {
  id: "team:icons/search.svg",
  name: "search",
  sourceId: "team",
  collection: "Team",
  svg: gradient,
  sourceUrl: "https://github.com/team/icons",
  commit: "abc123",
};
async function temporary<T>(fn: (path: string) => Promise<T>) {
  const path = await mkdtemp(join(tmpdir(), "desicast-test-"));
  try {
    return await fn(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

test("SVG rejects scripts, external references, entities and malformed geometry", () => {
  for (const unsafe of [
    mono.replace("<path", "<script/><path"),
    mono.replace("<path", "<foreignObject/><path"),
    mono.replace('stroke="currentColor"', 'onload="alert(1)"'),
    mono.replace("<path", '<use href="https://evil.test/x"/><path'),
    mono.replace('fill="none"', 'fill="url(https://evil.test/x)"'),
    `<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]>${mono}`,
    mono.replace('viewBox="0 0 24 24"', 'viewBox="0 0 -1 0"'),
  ])
    assert.throws(() => sanitizeSvg(unsafe));
  assert.match(sanitizeSvg(gradient), /linearGradient/);
  assert.match(sanitizeSvg(gradient), /clip-path="url\(#cut\)"/);
});
test("SVG handles dimensions, monochrome customization and source provenance", () => {
  const result = exportIcon(
    { ...icon, svg: mono },
    { id: icon.id, target: "svg", size: 32, color: "#3568d4" },
  );
  assert.match(result.code, /width="32"/);
  assert.match(result.code, /color="#3568d4"/);
  assert.match(result.files.at(-1)!.content, /abc123/);
  const multicolor = exportIcon(icon, {
    id: icon.id,
    target: "svg",
    color: "#3568d4",
  });
  assert.match(multicolor.code, /stop-color="#f00"/);
});
test("Figma-style SVG imports safely normalize IDs and inline presentation styles", () => {
  const svg =
    '<svg viewBox="0 0 24 24" style="display: block;" overflow="visible"><g id="Frame 1"><path pathLength="1" d="M2 2h20" stroke="white"/></g><use href="#Frame 1"/><title>{{unsafe()}}</title></svg>';
  const safe = sanitizeSvg(svg);
  assert.match(safe, /id="i-/);
  assert.doesNotMatch(safe, /style=/);
  assert.match(safe, /pathLength="1"/);
  const output = exportIcon({ ...icon, svg }, { id: icon.id, target: "vue" });
  assert.doesNotMatch(output.code, /\{\{unsafe\(\)\}\}/);
});
test("React and Vue preserve complex SVG and namespace repeated-instance definitions", async () => {
  const react = exportIcon(icon, { id: icon.id, target: "react" });
  assert.match(react.code, /useId/);
  assert.match(react.code, /stroke|clipPath/);
  assert.match(react.code, /\$\{uid\}-paint/);
  await transform(react.code, { loader: "tsx", jsx: "automatic" });
  const vue = exportIcon(icon, { id: icon.id, target: "vue" });
  const parsed = parse(vue.code);
  assert.equal(parsed.errors.length, 0);
  const script = compileScript(parsed.descriptor, { id: "fixture" });
  const template = compileTemplate({
    id: "fixture",
    source: parsed.descriptor.template!.content,
    filename: "IconSearch.vue",
    compilerOptions: { bindingMetadata: script.bindings },
  });
  assert.deepEqual(template.errors, []);
  assert.match(vue.code, /:clip-path/);
});
test("SwiftUI bundles SVG and a coherent image-set manifest with matching usage", () => {
  const exported = exportIcon(
    { ...icon, svg: mono },
    { id: icon.id, target: "swiftui" },
  );
  const manifestFile = exported.files.find((file) =>
    file.path.endsWith("Contents.json"),
  )!;
  const manifest = JSON.parse(manifestFile.content),
    svgFile = exported.files.find((file) => file.path.endsWith(".svg"))!;
  assert.ok(svgFile.path.endsWith(manifest.images[0].filename));
  assert.equal(manifest.properties["template-rendering-intent"], "template");
  assert.doesNotMatch(svgFile.content, /currentColor/);
  const themed = exportIcon(
    { ...icon, svg: mono },
    { id: icon.id, target: "swiftui", color: "currentColor" },
  );
  assert.doesNotMatch(
    themed.files.find((file) => file.path.endsWith(".svg"))!.content,
    /currentColor/,
  );
  const explicit = exportIcon(
    { ...icon, svg: mono },
    { id: icon.id, target: "swiftui", color: "#3568d4" },
  );
  assert.equal(
    JSON.parse(
      explicit.files.find((file) => file.path.endsWith("Contents.json"))!
        .content,
    ).properties["template-rendering-intent"],
    "original",
  );
  const colored = exportIcon(icon, { id: icon.id, target: "swiftui" });
  assert.equal(
    JSON.parse(
      colored.files.find((file) => file.path.endsWith("Contents.json"))!
        .content,
    ).properties["template-rendering-intent"],
    "original",
  );
});
test("Repository inputs prevent embedded credentials, option injection and directory escape", () => {
  assert.equal(
    repositoryUrl("https://gitlab.example/team/icons.git"),
    "https://gitlab.example/team/icons.git",
  );
  for (const value of [
    "http://github.com/team/icons",
    "https://token@github.com/team/icons",
    "file:///tmp/icons",
    "https://github.com/team/icons?token=secret",
  ])
    assert.throws(() => repositoryUrl(value));
  assert.deepEqual(repositoryDirectories(["./icons/", "icons", "."]), [
    "icons",
    ".",
  ]);
  for (const value of ["../outside", "/absolute", ".git", "icons/../../etc"])
    assert.throws(() => repositoryDirectories([value]));
});
test("Repository index skips unsafe SVG and symlinks, includes nested paths, and deduplicates overlapping roots", async () =>
  temporary(async (path) => {
    await mkdir(join(path, "icons/nested"), { recursive: true });
    await writeFile(join(path, "icons/search.svg"), mono);
    await writeFile(join(path, "icons/nested/search.svg"), gradient);
    await writeFile(
      join(path, "icons/bad.svg"),
      mono.replace("<path", "<script/><path"),
    );
    await symlink("/etc/passwd", join(path, "icons/link.svg"));
    const source: Source = {
      id: "repo-fixture",
      kind: "repository",
      name: "Team",
      url: "https://github.com/team/icons",
      directories: ["icons", "icons/nested"],
      allowVision: false,
      iconCount: 0,
    };
    const result = await indexRepository(path, source, "sha1");
    assert.equal(result.icons.length, 2);
    assert.equal(result.skipped, 1);
    assert.notEqual(result.icons[0].id, result.icons[1].id);
    assert.equal(result.icons[0].commit, "sha1");
  }));
test("Atomic snapshots replace added/modified/deleted icons and remain visible to another process connection", async () =>
  temporary(async (path) => {
    const first = new Store(path),
      second = new Store(path),
      source: Source = {
        id: "team",
        kind: "repository",
        name: "Team",
        allowVision: false,
        iconCount: 0,
      };
    try {
      first.replace({ ...source, commit: "one" }, [
        { ...icon, svg: mono },
        { ...icon, id: "team:delete.svg", name: "delete" },
      ]);
      assert.equal(second.local("", "team").length, 2);
      first.replace({ ...source, commit: "two" }, [
        { ...icon, svg: gradient, commit: "two" },
        { ...icon, id: "team:add.svg", name: "added" },
      ]);
      assert.equal(second.icon("team:delete.svg"), undefined);
      assert.equal(second.icon(icon.id)?.commit, "two");
      assert.equal(second.source("team")?.commit, "two");
      assert.equal(first.acquire("sync:team", "one"), true);
      assert.equal(second.acquire("sync:team", "two"), false);
      first.unlock("sync:team", "one");
      assert.equal(second.acquire("sync:team", "two"), true);
    } finally {
      first.close();
      second.close();
    }
  }));
test("Failed sync preserves cached artwork and marks the source error", async () =>
  temporary(async (path) => {
    const service = new IconService(path, new MemorySecrets());
    const source = await service.addRepository({
      name: "Team",
      url: "https://github.com/team/icons",
      branch: "main",
      directories: ["."],
      allowVision: false,
    });
    service.store.replace(
      { ...source, url: "https://token@github.com/team/icons", commit: "old" },
      [
        {
          ...icon,
          id: `${source.id}:search.svg`,
          sourceId: source.id,
          svg: mono,
        },
      ],
    );
    try {
      await assert.rejects(service.sync(source.id));
      assert.equal(service.store.source(source.id)?.commit, "old");
      assert.equal(service.store.local("", source.id).length, 1);
      assert.ok(service.store.source(source.id)?.error);
    } finally {
      service.close();
    }
  }));
test("Secrets stay outside persisted source/settings and disabled team vision is blocked", async () =>
  temporary(async (path) => {
    const secrets = new MemorySecrets(),
      service = new IconService(path, secrets);
    try {
      const source = await service.addRepository({
        name: "Private",
        url: "https://gitlab.example/team/icons.git",
        branch: "main",
        directories: ["icons"],
        allowVision: false,
        token: "do-not-persist",
      });
      await service.saveSettings(
        {
          theme: "dark",
          model: {
            baseUrl: "http://127.0.0.1:1234/v1",
            model: "vision",
            consent: true,
          },
        },
        "model-secret",
      );
      assert.doesNotMatch(
        JSON.stringify(service.store.sources()),
        /do-not-persist/,
      );
      assert.doesNotMatch(
        JSON.stringify(service.store.settings()),
        /model-secret/,
      );
      assert.equal((await service.sources())[1].hasCredential, true);
      await assert.rejects(
        service.vision({
          sourceId: source.id,
          dataUrl: "data:image/png;base64,aGVsbG8=",
        }),
        /禁用/,
      );
    } finally {
      service.close();
    }
  }));
test("New repositories default to vision enabled and preserve an explicit opt-out", () => {
  const repository = {
    name: "Team",
    url: "https://github.com/team/icons",
    branch: "main",
    directories: ["icons"],
  };
  assert.equal(repositorySchema.parse(repository).allowVision, true);
  assert.equal(
    repositorySchema.parse({ ...repository, allowVision: false }).allowVision,
    false,
  );
});

test("Global vision excludes disabled libraries before limiting candidates", async (t) =>
  temporary(async (path) => {
    const service = new IconService(path, new MemorySecrets());
    try {
      for (const [id, allowVision] of [
        ["disabled", false],
        ["enabled", true],
      ] as const) {
        service.store.saveSource({
          id,
          name: id,
          kind: "repository",
          allowVision,
          iconCount: 0,
        });
      }
      service.store.cache([
        ...Array.from({ length: 20 }, (_, index) => ({
          ...icon,
          id: `disabled:search-${index}`,
          name: `search-${index}`,
          sourceId: "disabled",
        })),
        { ...icon, id: "enabled:search", sourceId: "enabled", name: "search" },
      ]);
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
      const ranked: string[][] = [];
      t.mock.method(
        VisionModel.prototype,
        "rank",
        async (_image: string, candidates: Icon[]) => {
          ranked.push(candidates.map((candidate) => candidate.id));
          return candidates;
        },
      );
      let publicSearches = 0;
      t.mock.method(service.publicLibrary, "search", async () => {
        publicSearches++;
        return {
          icons: [
            {
              ...icon,
              id: "public:lucide:search",
              sourceId: "public",
              collection: "lucide",
            },
          ],
          total: 1,
        };
      });
      const dataUrl = "data:image/png;base64,aGVsbG8=";
      const result = await service.vision({ dataUrl });
      assert.deepEqual(
        result.icons.map((candidate) => candidate.id),
        ["enabled:search", "public:lucide:search"],
      );
      assert.deepEqual(ranked[0], ["enabled:search", "public:lucide:search"]);
      assert.equal(publicSearches, 1);
      service.store.saveSource({
        ...service.store.source("public")!,
        allowVision: false,
      });
      assert.deepEqual(
        (await service.vision({ dataUrl })).icons.map(
          (candidate) => candidate.id,
        ),
        ["enabled:search"],
      );
      assert.equal(publicSearches, 1);
      await assert.rejects(
        service.vision({ dataUrl, sourceId: "disabled" }),
        /禁用/,
      );
      assert.ok(
        (await service.search({ query: "search", sourceId: "disabled" })).icons
          .length > 0,
      );
    } finally {
      service.close();
    }
  }));

test("Repository access type persists and switching to public removes private credentials", async () =>
  temporary(async (path) => {
    const secrets = new MemorySecrets();
    const service = new IconService(path, secrets);
    const input = {
      name: "Team",
      url: "https://gitlab.example/team/icons.git",
      branch: "main",
      directories: ["icons"],
      allowVision: false,
    };
    try {
      const source = await service.addRepository({
        ...input,
        access: "private",
        username: "team-account",
        token: "private-token",
      });
      assert.equal(service.store.source(source.id)?.access, "private");
      await service.updateRepository(source.id, {
        ...input,
        access: "private",
      });
      assert.equal(
        await secrets.get(`repository:${source.id}`),
        "private-token",
      );
      await service.updateRepository(source.id, {
        ...input,
        access: "public",
        username: "hidden-account",
        token: "hidden-token",
      });
      assert.equal(service.store.source(source.id)?.access, "public");
      assert.equal(service.store.source(source.id)?.username, undefined);
      assert.equal(await secrets.get(`repository:${source.id}`), undefined);
      const publicSource = await service.addRepository({
        ...input,
        access: "public",
        token: "ignored-token",
      });
      assert.equal(
        await secrets.get(`repository:${publicSource.id}`),
        undefined,
      );
    } finally {
      service.close();
    }
  }));
test("Public library normalizes cached SVG and falls back without network", async () =>
  temporary(async (path) => {
    const fetcher: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/collections"))
        return Response.json({
          lucide: { name: "Lucide", total: 100, license: { spdx: "ISC" } },
        });
      if (url.includes("/search?"))
        return Response.json({ icons: ["lucide:search"], total: 1 });
      return new Response(mono, { status: 200 });
    };
    const service = new IconService(path, new MemorySecrets(), fetcher);
    try {
      const result = await service.search({ query: "搜索" });
      assert.equal(result.icons[0].name, "search");
      assert.equal(result.icons[0].license, "ISC");
      const offline = new IconService(path, new MemorySecrets(), async () => {
        throw new Error("offline");
      });
      try {
        const cached = await offline.search({ query: "search" });
        assert.equal(cached.icons[0].name, "search");
        assert.match(cached.warning!, /缓存/);
      } finally {
        offline.close();
      }
    } finally {
      service.close();
    }
  }));
test("Image inputs and model URLs enforce supported formats and local HTTP boundaries", () => {
  assert.throws(() => imageBuffer("data:image/svg+xml;base64,aGVsbG8="));
  assert.throws(() => modelEndpoint("http://remote.example/v1"));
  assert.equal(
    modelEndpoint("http://127.0.0.1:1234/v1"),
    "http://127.0.0.1:1234/v1/chat/completions",
  );
});
test("Vision sends image payloads and filters invented IDs and duplicates with a fixture model", async () => {
  const sharp = (await import("sharp")).default;
  const input = await sharp(Buffer.from(mono)).png().toBuffer();
  let calls = 0;
  const fetcher: typeof fetch = async (_url, options) => {
    calls++;
    const request = JSON.parse(String(options?.body));
    assert.ok(
      request.messages[0].content.some(
        (item: { type: string }) => item.type === "image_url",
      ),
    );
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify(
              calls === 1
                ? { keywords: ["search"], shape: "circle", style: "outline" }
                : {
                    matches: [
                      { id: icon.id, reason: "相似轮廓" },
                      { id: icon.id, reason: "重复" },
                      { id: "invented", reason: "不存在" },
                    ],
                  },
            ),
          },
        },
      ],
    });
  };
  const model = new VisionModel(
      { baseUrl: "https://model.example/v1", model: "fixture", consent: true },
      "secret",
      fetcher,
    ),
    dataUrl = `data:image/png;base64,${input.toString("base64")}`;
  const description = await model.describe(dataUrl),
    results = await model.rank(dataUrl, [icon], description);
  assert.equal(calls, 2);
  assert.equal(results.length, 1);
  assert.equal(results[0].reason, "相似轮廓");
});

test("Vision descriptions tolerate excess keywords while rejecting malformed model output", async () => {
  const sharp = (await import("sharp")).default;
  const input = await sharp(Buffer.from(mono)).png().toBuffer();
  const dataUrl = `data:image/png;base64,${input.toString("base64")}`;
  let response: unknown = {
    keywords: [
      " search ",
      "Search",
      "magnifier",
      "zoom",
      "lens",
      "find",
      "lookup",
      "glass",
    ],
    shape: "circle and handle",
    style: "outline",
  };
  const model = new VisionModel(
    { baseUrl: "https://model.example/v1", model: "fixture", consent: true },
    undefined,
    async () =>
      Response.json({
        choices: [{ message: { content: JSON.stringify(response) } }],
      }),
  );
  assert.deepEqual(await model.describe(dataUrl), {
    keywords: ["search", "magnifier", "zoom", "lens", "find", "lookup"],
    shape: "circle and handle",
    style: "outline",
  });
  for (const keywords of [
    [],
    ["   "],
    ["search", 42],
    "search",
    ["x".repeat(101)],
  ]) {
    response = { keywords, shape: "circle", style: "outline" };
    await assert.rejects(model.describe(dataUrl), {
      message: "模型返回的图标描述格式无效，请重试或更换视觉模型",
    });
  }
  response = { keywords: ["search"], style: "outline" };
  await assert.rejects(model.describe(dataUrl), /描述格式无效/);
});

test("Public catalog counts track decreases, persist unread changes, and protect newer revisions from stale acknowledgements", async () => {
  await temporary(async (directory) => {
    const store = new Store(directory);
    let version = "1.0.0";
    let total = 100,
      fail = false;
    const fetcher = (async () => {
      if (fail) throw new Error("offline");
      return new Response(
        JSON.stringify({ ri: { name: "Remix", total, version } }),
      );
    }) as typeof fetch;
    const library = new PublicLibrary(store, fetcher);
    assert.equal((await library.collections())[0].changes, undefined);
    total = 103;
    const added = (await library.collections(true))[0];
    assert.equal(added.total, 103);
    assert.equal(added.changes?.added, 3);
    total = 101;
    const removed = (await library.collections(true))[0];
    assert.equal(removed.changes?.removed, 2);
    store.acknowledgeChanges("public:ri", added.changes!.revision);
    assert.ok((await library.collections())[0].changes);
    version = "1.1.0";
    const released = (await library.collections(true))[0];
    assert.equal(released.changes?.versionUpdated, true);
    assert.equal(released.total, 101);
    store.acknowledgeChanges("public:ri", removed.changes!.revision);
    fail = true;
    await assert.rejects(library.collections(true));
    assert.equal((await library.collections())[0].total, 101);
    store.close();
    const reopened = new Store(directory);
    const restored = new PublicLibrary(reopened, fetcher);
    assert.equal((await restored.collections())[0].changes?.added, 3);
    reopened.acknowledgeChanges("public:ri", released.changes!.revision);
    assert.equal((await restored.collections())[0].changes, undefined);
    reopened.close();
  });
});

test("Repository unread diffs include same-count SVG updates and survive unchanged sync until acknowledged", async () => {
  await temporary(async (directory) => {
    const store = new Store(directory);
    const source: Source = {
      id: "team",
      kind: "repository",
      name: "Team",
      iconCount: 0,
      allowVision: false,
      syncedAt: new Date().toISOString(),
    };
    store.saveSource({ ...source, syncedAt: undefined });
    store.replace(source, [icon]);
    assert.equal(store.source("team")?.changes, undefined);
    store.replace({ ...source }, [{ ...icon, svg: mono }]);
    const changes = store.source("team")!.changes!;
    assert.equal(changes.updated, 1);
    assert.equal(changes.added, 0);
    store.replace({ ...source }, [{ ...icon, svg: mono }]);
    assert.equal(store.source("team")?.changes?.revision, changes.revision);
    store.acknowledgeChanges("team", changes.revision);
    assert.equal(store.source("team")?.changes, undefined);
    store.replace({ ...source }, []);
    assert.equal(store.source("team")?.changes?.removed, 1);
    store.close();
  });
});

test("Empty public collection queries browse all canonical names with accurate pagination", async () => {
  await temporary(async (directory) => {
    const store = new Store(directory);
    const requests: string[] = [];
    const library = new PublicLibrary(store, (async (url) => {
      requests.push(String(url));
      if (String(url).endsWith("/collections"))
        return new Response(
          JSON.stringify({ ri: { name: "Remix", total: 3 } }),
        );
      if (String(url).includes("/collection?"))
        return new Response(
          JSON.stringify({
            categories: { UI: ["c", "a"], Shapes: ["b", "a"] },
          }),
        );
      return new Response(mono);
    }) as typeof fetch);
    const page = await library.search("", "ri", 2, 1);
    assert.equal(page.total, 3);
    assert.deepEqual(
      page.icons.map((icon) => icon.name),
      ["b", "c"],
    );
    assert.equal(
      requests.some((url) => url.includes("/search")),
      false,
    );
    store.close();
  });
});

test("Same-count public modification updates badges and refreshes SVGs on demand while preserving offline artwork", async () => {
  await temporary(async (directory) => {
    const store = new Store(directory);
    let modified = 100,
      svg = mono,
      offline = false;
    const library = new PublicLibrary(store, (async (url) => {
      if (String(url).endsWith("/collections"))
        return Response.json({ eva: { name: "Eva", total: 1 } });
      if (String(url).endsWith("/last-modified"))
        return Response.json({ lastModified: { eva: modified } });
      if (offline) throw new Error("offline");
      return new Response(svg);
    }) as typeof fetch);
    await library.collections();
    const initial = await library.get("public:eva:search");
    modified = 200;
    svg = mono.replace("M2 12h20", "M4 12h16");
    const catalog = await library.collections(true);
    assert.equal(catalog[0].changes?.catalogUpdated, true);
    assert.equal(catalog[0].changes?.added, 0);
    const refreshed = await library.get(initial.id);
    assert.notEqual(refreshed.svg, initial.svg);
    assert.equal(refreshed.publicRevision, "1::200");
    modified = 300;
    await library.collections(true);
    offline = true;
    assert.equal((await library.get(initial.id)).svg, refreshed.svg);
    store.close();
  });
});

test("DeepSeek vision disables default thinking so ranking has a complete JSON budget", async () => {
  const sharp = (await import("sharp")).default;
  const input = await sharp(Buffer.from(mono)).png().toBuffer();
  const dataUrl = `data:image/png;base64,${input.toString("base64")}`;
  for (const baseUrl of [
    "https://api.deepseek.com",
    "https://api.deepseek.com/v1",
    "https://model.example/v1",
  ]) {
    const requests: any[] = [];
    const model = new VisionModel(
      { baseUrl, model: "deepseek-flash", consent: true },
      "fixture-secret",
      async (_url, options) => {
        requests.push(JSON.parse(String(options?.body)));
        return Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify(
                  requests.length === 1
                    ? {
                        keywords: ["search"],
                        shape: "circle",
                        style: "outline",
                      }
                    : { matches: [{ id: icon.id, reason: "相似轮廓" }] },
                ),
              },
            },
          ],
        });
      },
    );
    const description = await model.describe(dataUrl);
    assert.equal(
      (await model.rank(dataUrl, [icon], description))[0].id,
      icon.id,
    );
    for (const request of requests) {
      assert.deepEqual(
        request.thinking,
        baseUrl.includes("api.deepseek.com") ? { type: "disabled" } : undefined,
      );
    }
  }
});

test("Truncated vision output reports output exhaustion instead of a configuration or JSON error", async () => {
  const sharp = (await import("sharp")).default;
  const input = await sharp(Buffer.from(mono)).png().toBuffer();
  const model = new VisionModel(
    { baseUrl: "https://model.example/v1", model: "fixture", consent: true },
    undefined,
    async () =>
      Response.json({
        choices: [
          { finish_reason: "length", message: { content: '{"keywords":[' } },
        ],
      }),
  );
  await assert.rejects(
    model.describe(`data:image/png;base64,${input.toString("base64")}`),
    /输出达到长度上限/,
  );
});

test("Vision recalls compound subject/shape names and includes later keyword groups in the ranking sheet", async (t) =>
  temporary(async (directory) => {
    const service = new IconService(directory, new MemorySecrets());
    try {
      await service.saveSettings({
        theme: "system",
        model: {
          baseUrl: "https://model.example/v1",
          model: "fixture",
          consent: true,
        },
      });
      t.mock.method(VisionModel.prototype, "describe", async () => ({
        keywords: [
          "ad",
          "letters",
          "badge",
          "circle",
          "outline",
          "advertisement",
        ],
        shape: "AD in a circle",
        style: "outline",
      }));
      const queries: string[] = [];
      const target = {
        ...icon,
        id: "public:mingcute:ad-circle-line",
        name: "ad-circle-line",
        sourceId: "public",
        collection: "mingcute",
      };
      const late = {
        ...icon,
        id: "public:eva:advertisement-line",
        name: "advertisement-line",
        sourceId: "public",
        collection: "eva",
      };
      let active = 0,
        peak = 0;
      t.mock.method(service.publicLibrary, "search", async (query: string) => {
        queries.push(query);
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 1));
        active--;
        const icons = Array.from({ length: 12 }, (_, index) => ({
          ...icon,
          id: `public:lucide:${query.replaceAll(" ", "-")}-${index}`,
          name: `${query}-${index}`,
          sourceId: "public",
          collection: "lucide",
        }));
        if (query === "ad circle") icons[2] = target;
        if (query === "advertisement") icons[0] = late;
        return { icons, total: icons.length };
      });
      t.mock.method(
        VisionModel.prototype,
        "rank",
        async (_data: string, candidates: Icon[]) => {
          assert.ok(candidates.length <= 48);
          assert.ok(candidates.some((candidate) => candidate.id === target.id));
          assert.ok(candidates.some((candidate) => candidate.id === late.id));
          assert.equal(
            new Set(candidates.map((candidate) => candidate.id)).size,
            candidates.length,
          );
          return [target];
        },
      );
      const result = await service.vision({
        dataUrl: "data:image/png;base64,aGVsbG8=",
      });
      assert.equal(result.icons[0].id, target.id);
      assert.ok(queries.includes("ad circle"));
      assert.ok(queries.includes("advertisement"));
      assert.ok(peak <= 3);
    } finally {
      service.close();
    }
  }));

test("Visual ranking can select a candidate beyond the former 24-icon cutoff", async () => {
  const sharp = (await import("sharp")).default;
  const input = await sharp(Buffer.from(mono)).png().toBuffer();
  const icons = Array.from({ length: 48 }, (_, index) => ({
    ...icon,
    id: `team:icon-${index}`,
    svg: mono,
  }));
  const target = icons[47];
  const model = new VisionModel(
    { baseUrl: "https://model.example/v1", model: "fixture", consent: true },
    undefined,
    async (_url, options) => {
      const request = JSON.parse(String(options?.body));
      assert.match(request.messages[0].content[0].text, /48: team:icon-47/);
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                matches: [{ id: target.id, reason: "相似轮廓" }],
              }),
            },
          },
        ],
      });
    },
  );
  assert.equal(
    (
      await model.rank(
        `data:image/png;base64,${input.toString("base64")}`,
        icons,
        {},
      )
    )[0].id,
    target.id,
  );
});

test("Public search batches icon data, resolves aliases, and preserves provenance without per-icon SVG requests", async () =>
  temporary(async (directory) => {
    const store = new Store(directory);
    try {
      store.saveSetting("collections", {
        time: Date.now(),
        items: [
          {
            id: "fixture",
            name: "Fixture",
            total: 2,
            license: "MIT",
            authorUrl: "https://example.com/icons",
          },
        ],
      });
      const requests: string[] = [];
      const library = new PublicLibrary(
        store,
        async (url) => {
          const address = String(url);
          requests.push(address);
          if (address.includes("/search?"))
            return Response.json({
              icons: ["fixture:ad-circle", "fixture:ad-circle-alias"],
              total: 2,
            });
          if (address.includes("/fixture.json?"))
            return Response.json({
              prefix: "fixture",
              width: 24,
              height: 24,
              icons: {
                "ad-circle": {
                  body: '<path d="M2 12h20" fill="none" stroke="currentColor"/>',
                },
              },
              aliases: {
                "ad-circle-alias": { parent: "ad-circle", rotate: 1 },
              },
            });
          return new Response("rate limited", { status: 429 });
        },
        "https://fixture.example",
      );
      const result = await library.search("ad circle", "fixture");
      assert.equal(result.icons.length, 2);
      assert.equal(requests.length, 2);
      assert.ok(requests.every((url) => !url.includes(".svg")));
      assert.match(result.icons[1].svg, /transform/);
      assert.equal(result.icons[0].license, "MIT");
      assert.equal(result.icons[0].sourceUrl, "https://example.com/icons");
      assert.equal(
        (await library.get(result.icons[0].id)).id,
        result.icons[0].id,
      );
      assert.equal(requests.length, 2);
    } finally {
      store.close();
    }
  }));

test("Vision maps printed candidate numbers and full IDs without accepting invalid or duplicate matches", async () => {
  const sharp = (await import("sharp")).default;
  const input = await sharp(Buffer.from(mono)).png().toBuffer();
  const icons = [
    { ...icon, id: "public:mingcute:ad-circle-line" },
    { ...icon, id: "public:tabler:ad-circle" },
  ];
  const model = new VisionModel(
    { baseUrl: "https://model.example/v1", model: "fixture", consent: true },
    undefined,
    async () =>
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                matches: [
                  { id: "1", reason: "圆形 AD 图标。" },
                  { id: icons[0].id, reason: "重复" },
                  { id: icons[1].id, reason: "圆形轮廓." },
                  { id: "2", reason: "重复编号" },
                  ...["0", "3", "-1", "1.5", "1x", "invented"].map((id) => ({
                    id,
                    reason: "无效",
                  })),
                ],
              }),
            },
          },
        ],
      }),
  );
  const result = await model.rank(
    `data:image/png;base64,${input.toString("base64")}`,
    icons,
    {},
  );
  assert.deepEqual(
    result.map((icon) => icon.id),
    icons.map((icon) => icon.id),
  );
  assert.deepEqual(
    result.map((icon) => icon.reason),
    ["圆形 AD 图标", "圆形轮廓"],
  );
});
