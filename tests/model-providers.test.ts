import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { IconService } from "../src/core/service";
import { MemorySecrets } from "../src/core/secrets";

async function fixture(
  run: (
    service: IconService,
    secrets: MemorySecrets,
    directory: string,
  ) => Promise<void>,
) {
  const directory = await mkdtemp(join(tmpdir(), "desicast-providers-"));
  const secrets = new MemorySecrets();
  const service = new IconService(directory, secrets);
  try {
    await run(service, secrets, directory);
  } finally {
    service.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("providers persist independently, select the right key, and survive theme saves and restart", async () => {
  await fixture(async (service, secrets, directory) => {
    assert.deepEqual((await service.settings()).modelProviders, []);
    const first = await service.addModelProvider({
      baseUrl: " https://one.example/v1 ",
      model: " First ",
      apiKey: "first-secret",
    });
    const firstId = first.model.id!;
    const second = await service.addModelProvider({
      baseUrl: "http://localhost:1234/v1",
      model: "Second",
    });
    assert.equal(second.modelProviders?.length, 2);
    assert.equal(second.model.consent, true);
    assert.equal(second.model.hasKey, false);
    const selected = await service.selectModelProvider(firstId);
    assert.equal(selected.model.model, "First");
    assert.equal(selected.model.baseUrl, "https://one.example/v1");
    assert.equal(selected.model.hasKey, true);
    assert.equal(await secrets.get(`model:${firstId}`), "first-secret");
    await service.saveSettings({ ...selected, theme: "dark" });
    const reopened = new IconService(directory, secrets);
    try {
      const settings = await reopened.settings();
      assert.equal(settings.theme, "dark");
      assert.equal(settings.model.id, firstId);
      assert.equal(settings.modelProviders?.length, 2);
      assert.doesNotMatch(
        JSON.stringify(reopened.store.settings()),
        /first-secret|hasKey/,
      );
      assert.doesNotMatch(JSON.stringify(settings), /first-secret/);
    } finally {
      reopened.close();
    }
    await assert.rejects(service.selectModelProvider("missing"), /不存在/);
    await assert.rejects(
      service.addModelProvider({
        baseUrl: "https://bad.example/v1?key=secret",
        model: "Bad",
      }),
    );
    await assert.rejects(
      service.addModelProvider({
        baseUrl: "https://one.example/v1",
        model: "  ",
      }),
      /模型名称/,
    );
    assert.equal((await service.settings()).modelProviders?.length, 2);
  });
});

test("legacy model and Keychain key remain selectable after adding a provider", async () => {
  await fixture(async (service, secrets) => {
    service.store.saveSetting("preferences", {
      theme: "system",
      model: {
        baseUrl: "https://legacy.example/v1",
        model: "Legacy",
        consent: false,
      },
    });
    await secrets.set("model", "legacy-secret");
    const initial = await service.settings();
    assert.equal(initial.model.id, "legacy");
    assert.equal(initial.model.consent, true);
    assert.equal(initial.modelProviders?.[0].hasKey, true);
    await service.addModelProvider({
      baseUrl: "https://next.example/v1",
      model: "Next",
      apiKey: "next-secret",
    });
    const selected = await service.selectModelProvider("legacy");
    assert.equal(selected.model.model, "Legacy");
    assert.equal(selected.model.hasKey, true);
    assert.equal(selected.model.consent, true);
    assert.equal(selected.modelProviders?.length, 2);
    assert.equal(await secrets.get("model"), "legacy-secret");
  });
});

test("provider deletion preserves selection, falls back, clears keys, and persists the empty state", async () => {
  await fixture(async (service, secrets, directory) => {
    const first = await service.addModelProvider({
      baseUrl: "https://first.example/v1",
      model: "First",
      apiKey: "first-secret",
    });
    const second = await service.addModelProvider({
      baseUrl: "https://second.example/v1",
      model: "Second",
      apiKey: "second-secret",
    });
    const third = await service.addModelProvider({
      baseUrl: "https://third.example/v1",
      model: "Third",
      apiKey: "third-secret",
    });
    const inactiveRemoved = await service.removeModelProvider(second.model.id!);
    assert.equal(inactiveRemoved.model.id, third.model.id);
    assert.equal(await secrets.get(`model:${second.model.id}`), undefined);
    assert.equal(await secrets.get(`model:${third.model.id}`), "third-secret");
    const activeRemoved = await service.removeModelProvider(third.model.id!);
    assert.equal(activeRemoved.model.id, first.model.id);
    assert.equal(activeRemoved.model.hasKey, true);
    assert.equal(activeRemoved.model.consent, true);
    assert.equal(await secrets.get(`model:${third.model.id}`), undefined);
    const snapshot = JSON.stringify(service.store.settings());
    await assert.rejects(service.removeModelProvider("missing"), /不存在/);
    assert.equal(JSON.stringify(service.store.settings()), snapshot);
    const empty = await service.removeModelProvider(first.model.id!);
    assert.deepEqual(empty.modelProviders, []);
    assert.equal(empty.model.model, "");
    assert.equal(empty.model.id, undefined);
    assert.equal(empty.model.consent, false);
    assert.equal(empty.model.hasKey, false);
    assert.equal(await secrets.get(`model:${first.model.id}`), undefined);
    await service.saveSettings({ ...empty, theme: "dark" });
    const reopened = new IconService(directory, secrets);
    try {
      assert.deepEqual((await reopened.settings()).modelProviders, []);
      assert.equal((await reopened.settings()).model.consent, false);
      await assert.rejects(
        reopened.selectModelProvider(first.model.id!),
        /不存在/,
      );
    } finally {
      reopened.close();
    }
  });
});

test("deleting a legacy provider clears its legacy key and does not recreate it", async () => {
  await fixture(async (service, secrets) => {
    service.store.saveSetting("preferences", {
      theme: "system",
      model: {
        baseUrl: "https://legacy.example/v1",
        model: "Legacy",
        consent: true,
      },
    });
    await secrets.set("model", "legacy-secret");
    const next = await service.addModelProvider({
      baseUrl: "https://next.example/v1",
      model: "Next",
      apiKey: "next-secret",
    });
    await service.selectModelProvider("legacy");
    const settings = await service.removeModelProvider("legacy");
    assert.equal(settings.model.id, next.model.id);
    assert.equal(settings.model.hasKey, true);
    assert.equal(settings.modelProviders?.length, 1);
    assert.equal(await secrets.get("model"), undefined);
    assert.equal(await secrets.get(`model:${next.model.id}`), "next-secret");
    await service.removeModelProvider(next.model.id!);
    assert.deepEqual((await service.settings()).modelProviders, []);
  });
});

test("draft connection tests send image input and draft key without saving on success or failure", async (t) => {
  await fixture(async (service, secrets) => {
    const saved = await service.addModelProvider({
      baseUrl: "https://saved.example/v1",
      model: "Saved",
      apiKey: "saved-secret",
    });
    const snapshot = JSON.stringify(service.store.settings());
    const requests: { url: string; body: any; authorization: string | null }[] =
      [];
    let fail = false;
    t.mock.method(
      globalThis,
      "fetch",
      async (url: string, options: RequestInit) => {
        requests.push({
          url: String(url),
          body: JSON.parse(String(options.body)),
          authorization: new Headers(options.headers).get("Authorization"),
        });
        if (fail) return new Response("unavailable", { status: 503 });
        return Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  keywords: ["circle"],
                  shape: "circle",
                  style: "stroke",
                }),
              },
            },
          ],
        });
      },
    );
    await service.testModel({
      baseUrl: "https://draft.example/v1",
      model: "Draft",
      apiKey: "draft-secret",
    });
    assert.equal(requests[0].url, "https://draft.example/v1/chat/completions");
    assert.equal(requests[0].authorization, "Bearer draft-secret");
    assert.equal(requests[0].body.model, "Draft");
    assert.ok(
      requests[0].body.messages[0].content.some(
        (item: any) => item.type === "image_url",
      ),
    );
    fail = true;
    await assert.rejects(
      service.testModel({
        baseUrl: "https://draft.example/v1",
        model: "Draft",
      }),
    );
    assert.equal(JSON.stringify(service.store.settings()), snapshot);
    fail = false;
    await service.testModel();
    assert.equal(requests.at(-1)?.body.model, "Saved");
    assert.equal(requests.at(-1)?.authorization, "Bearer saved-secret");
    assert.equal(await secrets.get(`model:${saved.model.id}`), "saved-secret");
  });
});
