import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Icon, Settings, Source } from "./types";

export const defaults: Settings = {
  theme: "system",
  model: { baseUrl: "https://api.openai.com/v1", model: "", consent: false },
};

export class Store {
  readonly db: DatabaseSync;
  constructor(readonly directory: string) {
    this.directory = resolve(directory);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(join(directory, "iconcast.sqlite"));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=10000;
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS icons (id TEXT PRIMARY KEY, source TEXT NOT NULL, name TEXT NOT NULL, collection TEXT NOT NULL, value TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS icons_source ON icons(source);
      CREATE TABLE IF NOT EXISTS locks (key TEXT PRIMARY KEY, owner TEXT NOT NULL, expires INTEGER NOT NULL);`);
    this.db.prepare("INSERT OR IGNORE INTO sources VALUES (?,?)").run(
      "public",
      JSON.stringify({
        id: "public",
        kind: "public",
        name: "开源图库",
        allowVision: true,
        iconCount: 0,
      }),
    );
  }
  close() {
    this.db.close();
  }
  setting<T>(key: string, fallback: T): T {
    const row = this.db
      .prepare("SELECT value FROM settings WHERE key=?")
      .get(key) as { value: string } | undefined;
    return row ? JSON.parse(row.value) : fallback;
  }
  saveSetting(key: string, value: unknown) {
    this.db
      .prepare("INSERT OR REPLACE INTO settings VALUES (?,?)")
      .run(key, JSON.stringify(value));
  }
  settings(): Settings {
    return this.setting("preferences", defaults);
  }
  sources(): Source[] {
    return (
      this.db.prepare("SELECT value FROM sources ORDER BY rowid").all() as {
        value: string;
      }[]
    ).map((row) => {
      const source: Source = JSON.parse(row.value);
      source.iconCount = (
        this.db
          .prepare("SELECT count(*) AS n FROM icons WHERE source=?")
          .get(source.id) as { n: number }
      ).n;
      return source;
    });
  }
  source(id: string) {
    return this.sources().find((source) => source.id === id);
  }
  saveSource(source: Source) {
    this.db
      .prepare("INSERT OR REPLACE INTO sources VALUES (?,?)")
      .run(source.id, JSON.stringify(source));
  }
  removeSource(id: string) {
    this.transaction(() => {
      this.db.prepare("DELETE FROM icons WHERE source=?").run(id);
      this.db.prepare("DELETE FROM sources WHERE id=?").run(id);
    });
  }
  icon(id: string): Icon | undefined {
    const row = this.db
      .prepare("SELECT value FROM icons WHERE id=?")
      .get(id) as { value: string } | undefined;
    return row ? JSON.parse(row.value) : undefined;
  }
  cache(icons: Icon[]) {
    this.transaction(() => {
      const stmt = this.db.prepare(
        "INSERT OR REPLACE INTO icons VALUES (?,?,?,?,?)",
      );
      for (const icon of icons)
        stmt.run(
          icon.id,
          icon.sourceId,
          icon.name,
          icon.collection,
          JSON.stringify(icon),
        );
    });
  }
  replace(source: Source, icons: Icon[]) {
    this.transaction(() => {
      this.db.prepare("DELETE FROM icons WHERE source=?").run(source.id);
      this.cache(icons);
      this.saveSource(source);
    });
  }
  private depth = 0;
  transaction(fn: () => void) {
    if (this.depth) return fn();
    this.db.exec("BEGIN IMMEDIATE");
    this.depth++;
    try {
      fn();
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    } finally {
      this.depth--;
    }
  }
  local(query: string, sourceId?: string, collection?: string): Icon[] {
    const rows = this.db
      .prepare(
        `SELECT value FROM icons WHERE (? IS NULL OR source=?) AND (? IS NULL OR collection=?) ORDER BY CASE WHEN source='public' THEN 1 ELSE 0 END, name`,
      )
      .all(
        sourceId ?? null,
        sourceId ?? null,
        collection ?? null,
        collection ?? null,
      ) as { value: string }[];
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return rows
      .map((row) => JSON.parse(row.value) as Icon)
      .filter((icon) =>
        terms.every((term) =>
          `${icon.name} ${icon.path ?? ""} ${icon.collection}`
            .toLowerCase()
            .includes(term),
        ),
      )
      .sort((a, b) => {
        if (!query) return 0;
        const rank = (icon: Icon) =>
          icon.name.toLowerCase() === query.toLowerCase()
            ? 0
            : icon.name.toLowerCase().startsWith(query.toLowerCase())
              ? 1
              : 2;
        return rank(a) - rank(b);
      });
  }
  acquire(key: string, owner: string): boolean {
    let acquired = false;
    this.transaction(() => {
      this.db.prepare("DELETE FROM locks WHERE expires<?").run(Date.now());
      const result = this.db
        .prepare("INSERT OR IGNORE INTO locks VALUES (?,?,?)")
        .run(key, owner, Date.now() + 180_000);
      acquired = Number(result.changes) === 1;
    });
    return acquired;
  }
  unlock(key: string, owner: string) {
    this.db
      .prepare("DELETE FROM locks WHERE key=? AND owner=?")
      .run(key, owner);
  }
}
