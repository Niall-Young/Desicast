import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filterLibraries,
  type LibraryFilter,
} from "../src/renderer/library-filter";
import { Store } from "../src/core/store";
import type { Source } from "../src/core/types";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const source = (id: string, url: string, createdAt: string): Source => ({
  id,
  name: id,
  url,
  createdAt,
  kind: "repository",
  allowVision: false,
  iconCount: 0,
});
const sources = [
  source("Zulu", "https://github.com/team/icons", "2026-10-01"),
  source("Alpha", "https://gitlab.company.com/team/icons", "2026-10-02"),
];
sources[1].changes = {
  revision: "1",
  detectedAt: "2026-10-03",
  added: 1,
  updated: 0,
  removed: 0,
};
const empty: LibraryFilter = { types: [], statuses: [], sorts: [] };
test("Library filters combine OR within a group and AND between groups, and clear back to original order", () => {
  const names = (filter: LibraryFilter, query = "") =>
    filterLibraries([], sources, [], filter, query).map((entry) => entry.name);
  assert.deepEqual(names(empty), ["Zulu", "Alpha"]);
  assert.deepEqual(
    names({ ...empty, types: ["github", "gitlab"], statuses: ["updated"] }),
    ["Alpha"],
  );
  assert.deepEqual(names({ ...empty, statuses: ["normal", "updated"] }), [
    "Zulu",
    "Alpha",
  ]);
  assert.deepEqual(
    names({ ...empty, types: ["github"], statuses: ["updated"] }),
    [],
  );
  assert.deepEqual(names({ ...empty, sorts: ["name-asc"] }), ["Alpha", "Zulu"]);
  assert.deepEqual(names({ ...empty, sorts: ["time-desc"] }), [
    "Alpha",
    "Zulu",
  ]);
  assert.deepEqual(names(empty, "ALP"), ["Alpha"]);
});
test("Source creation time and original order survive sync and edits", () => {
  const directory = mkdtempSync(join(tmpdir(), "desicast-sort-"));
  const store = new Store(directory);
  try {
    store.saveSource(sources[0]);
    store.saveSource(sources[1]);
    store.saveSource({
      ...sources[0],
      createdAt: "2026-10-03",
      name: "Renamed",
    });
    assert.equal(store.source("Zulu")?.createdAt, "2026-10-01");
    assert.deepEqual(
      store
        .sources()
        .filter((item) => item.kind === "repository")
        .map((item) => item.id),
      ["Zulu", "Alpha"],
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
