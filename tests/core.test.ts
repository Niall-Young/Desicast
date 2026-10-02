import { test } from "node:test";
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
  const path = await mkdtemp(join(tmpdir(), "iconcast-test-"));
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
