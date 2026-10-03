import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/core/store";
import {
  libraryPreferences,
  saveLibraryPreference,
} from "../src/core/library-management";

test("library preferences persist, merge independent changes, and reject empty names", async () => {
  const directory = await mkdtemp(join(tmpdir(), "library-preferences-"));
  let store = new Store(directory);
  try {
    saveLibraryPreference(store, { id: "lucide", pinned: true });
    saveLibraryPreference(store, { id: "lucide", name: " My icons " });
    saveLibraryPreference(store, { id: "tabler", hidden: true });
    assert.throws(() =>
      saveLibraryPreference(store, { id: "lucide", name: " " }),
    );
    store.close();
    store = new Store(directory);
    assert.deepEqual(libraryPreferences(store), {
      lucide: { pinned: true, name: "My icons" },
      tabler: { hidden: true },
    });
    saveLibraryPreference(store, { id: "tabler", hidden: false });
    assert.equal(libraryPreferences(store).tabler.hidden, false);
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
});
